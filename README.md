AI TTS, STT, Translation Wrapper



Launch and test:

1. Set up a virtual environment
terminal: python -m venv .venv

2. Install dependencies
terminal: pip install -r requirements.txt

3. Add environment variables
Create a "config.py" file inside the "app" folder with:

AZURE_SPEECH_KEY=Azure_speech_key
AZURE_REGION=Azure_region

5. Run
python main.py

The server will start on `http://localhost:5001`