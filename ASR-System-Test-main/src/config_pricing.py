# This file stores the cost per minute for each ASR model.
# All costs are in USD per 1000 minutes of audio.

MODEL_LIST = [
        "azure", 
        "whisper",
        "gpt-4o-transcribe",
        "groq-whisper-large-v3-turbo",
        "fireworks-whisper-large-v3-turbo",
    ]

MODEL_COSTS_BATCH = {
    "azure":   6,  # Fast Transcription at $0.36/hour 
    "whisper": 6,  # OpenAI Whisper API at $0.006/min
    "gpt-4o-transcribe": 6,
    "groq-whisper-large-v3-turbo": 0.67, # $0.04 per hour
    "fireworks-whisper-large-v3-turbo": 54, # 0.0009 per second
}

MODEL_COSTS_RT = {
    "azure": 16.67, # RT Transcription at $0.36/hour  
    "whisper": 0, 
    "gpt-4o-transcribe": 6, 
    "groq-whisper-large-v3-turbo": 0, 
    "fireworks-whisper-large-v3-turbo": 0, 
}