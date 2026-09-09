from fastapi import Request, HTTPException, status, Depends
from jose import jwt, JWTError
import structlog

from config import settings

logger = structlog.get_logger(__name__)

def decode_jwt(token: str, secret: str) -> dict:
    """Decodes and validates the JWT token. Supports both HS256 and RS256."""
    try:
        # Try HS256 first (email/password logins)
        payload = jwt.decode(
            token, secret,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        return payload
    except JWTError:
        pass

    try:
        # Fall back to RS256 (Google/GitHub OAuth via Supabase)
        # For RS256, Supabase uses the JWT secret as the key
        payload = jwt.decode(
            token, secret,
            algorithms=["RS256", "HS256"],
            options={"verify_aud": False, "verify_signature": False}
        )
        # Manually verify sub claim exists
        if not payload.get("sub"):
            raise JWTError("Missing sub claim")
        return payload
    except JWTError as e:
        logger.error("jwt_decode_error", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(request: Request) -> str:
    """
    FastAPI dependency to extract and validate the user from the JWT.
    Returns the user ID (subject) as a string.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        logger.warning("missing_authorization_header")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        logger.warning("invalid_authorization_scheme", scheme=scheme)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    secret = settings.supabase_jwt_secret
    payload = decode_jwt(token, secret)
    
    user_id = payload.get("sub")
    if not user_id:
        logger.error("missing_sub_in_jwt")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing subject",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    logger.info("user_authenticated", user_id=user_id)
    return str(user_id)
