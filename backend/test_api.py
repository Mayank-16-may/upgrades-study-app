import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
client = genai.Client(api_key=os.environ.get('GEMINI_API_KEY'))

models_to_test = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-flash-lite-latest'
]

for model in models_to_test:
    try:
        response = client.models.generate_content(model=model, contents='Say hello')
        print(f"SUCCESS {model}:", response.text.strip())
    except Exception as e:
        print(f"ERROR {model}:", e)
