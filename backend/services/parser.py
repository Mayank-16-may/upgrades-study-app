import asyncio
import fitz  # PyMuPDF
from fastapi import UploadFile, HTTPException, status
import structlog

logger = structlog.get_logger(__name__)

PDF_MAGIC = b'%PDF'

def validate_file_type(header: bytes) -> bool:
    """Validate that the file starts with the PDF magic bytes."""
    return header.startswith(PDF_MAGIC)

def extract_text_from_bytes(content: bytes) -> str:
    """Extract text from all pages of a PDF using PyMuPDF."""
    text_parts = []
    try:
        # Load the document from memory bytes
        with fitz.open("pdf", content) as doc:
            for page in doc:
                text_parts.append(page.get_text())
        return "\n".join(text_parts)
    except Exception as e:
        logger.error("pdf_extraction_failed", error=str(e))
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to parse PDF document"
        )

async def validate_and_parse(file: UploadFile, max_size_bytes: int) -> str:
    """
    Validate magic bytes, check file size, and extract text from the PDF file asynchronously.
    """
    logger.info("validating_and_parsing_file", filename=file.filename)
    
    # Read first 4 bytes for magic header
    header = await file.read(4)
    if not validate_file_type(header):
        logger.warning("invalid_file_type", header=header)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only PDF files are supported."
        )
    
    # Read remaining content
    remaining_content = await file.read()
    total_size = len(header) + len(remaining_content)
    
    if total_size > max_size_bytes:
        logger.warning("file_too_large", size=total_size, max_size=max_size_bytes)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {max_size_bytes} bytes"
        )
    
    content = header + remaining_content
    
    # Extract text non-blocking
    text = await asyncio.to_thread(extract_text_from_bytes, content)
    
    if not text.strip():
        logger.warning("empty_pdf_content")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No text could be extracted from the PDF."
        )
        
    logger.info("pdf_parsed_successfully", length=len(text))
    return text
