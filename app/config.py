# # Azure keys
# AZURE_SPEECH_KEY = "2KK5H6hRSZk1PDQTpVQ8YM68Q3TxAcvDD7ukmxlqtx3dXoM5s3GCJQQJ99BCAC5RqLJXJ3w3AAAYACOGnzMR"
# AZURE_REGION = "westeurope"

# # DeepL keys
# DEEPL_API_KEY = "e7552ee8-ca29-4b47-8e86-72c21678cb0c:fx"
# DEEPL_API_URL = "https://api-free.deepl.com/v2/translate" 


import os
from dotenv import load_dotenv

# Load .env file variables into environment variables
# This is useful for local development if you have a .env file
# Render will use its own environment variable settings
load_dotenv()

class Config:
    """Flask configuration variables."""

    # General Flask config
    # You should set a strong, random secret key in your environment
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a-default-fallback-secret-key'

    # Azure keys (Load from environment variables)
    AZURE_SPEECH_KEY = os.environ.get("AZURE_SPEECH_KEY")
    AZURE_REGION = os.environ.get("AZURE_REGION")

    # DeepL keys (Load from environment variables)
    DEEPL_API_KEY = os.environ.get("DEEPL_API_KEY")
    # Provide a default URL if the environment variable isn't set
    DEEPL_API_URL = os.environ.get("DEEPL_API_URL", "https://api-free.deepl.com/v2/translate")

    # Add any other configuration variables your app needs here
    # Example: DATABASE_URL = os.environ.get('DATABASE_URL')

    # --- Validation (Optional but recommended) ---
    # You could add checks here to ensure essential keys are set
    # if not AZURE_SPEECH_KEY:
    #     raise ValueError("Missing required environment variable: AZURE_SPEECH_KEY")
    # if not AZURE_REGION:
    #     raise ValueError("Missing required environment variable: AZURE_REGION")
    # if not DEEPL_API_KEY:
    #     raise ValueError("Missing required environment variable: DEEPL_API_KEY")
