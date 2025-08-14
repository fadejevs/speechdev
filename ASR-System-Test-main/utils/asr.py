"""
Core logic for running transcription tests against various ASR models.

This module contains the main `test_model` function that orchestrates the
testing process for a given model and dataset, as well as any provider-specific
helper functions (e.g., for Azure).
"""

# --- Standard Library Imports ---
import asyncio
import json
import logging
import os
import time
from typing import Union

# --- Third-Party Imports ---
import azure.cognitiveservices.speech as speechsdk
import openai
import pandas as pd
import soundfile as sf
from decouple import config
from fireworks.client.audio import AudioInference
from groq import Groq
from tqdm.asyncio import tqdm
from fireworks import LLM

# --- Project-Specific Imports ---
from utils.text_processing import (get_corrected_text, replace_digits_with_words,
                                   replace_digits_with_words_fireworks,
                                   replace_digits_with_words_groq)
from utils.validation import analyze_wer_breakdown


# --- 1. API Key and Logger Configuration ---
AZURE_API_KEY = config("AZURE_API_KEY")
AZURE_API_REGION = config("AZURE_API_REGION")
OPENAI_API_KEY = config("OPENAI_API_KEY")
OPENAI_GROQ_API_KEY = config("OPENAI_GROQ_API_KEY")
FIREWORKS_API_KEY = config("FIREWORKS_API_KEY")

logger = logging.getLogger(__name__)


# --- 2. Main Asynchronous Test Runner ---
async def test_model(dataset, model: str, output_dir: str) -> Union[pd.DataFrame, None]:
    """
    Tests a single transcription model against a dataset, measuring performance
    and saving the detailed results to a CSV file.

    This function is asynchronous to support modern, non-blocking API clients.

    Args:
        dataset (list): A list of data samples, where each sample is a dictionary.
        model (str): The identifier for the model to test.
        output_dir (str): The directory where the results CSV will be saved.

    Returns:
        A pandas DataFrame containing the results, or None if the test fails.
    """
    # --- 2.1. Initial Setup ---
    model = model.lower()
    os.makedirs(output_dir, exist_ok=True)
    print(f"Testing model: '{model}'... ")
    logger.info(f"--- Starting test for model: {model} ---")
    results_list = []
    
    # Initialize the specific API client once for efficiency.
    client = None
    if model in ["whisper", "gpt-4o-transcribe"]:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
    elif model == "groq-whisper-large-v3-turbo":
        client = Groq(api_key=OPENAI_GROQ_API_KEY)
    elif model == "fireworks-whisper-large-v3-turbo":
        client = AudioInference(
            model="whisper-v3-turbo",
            base_url="https://audio-turbo.us-virginia-1.direct.fireworks.ai",
            api_key=FIREWORKS_API_KEY
        )

        # Also create the client for text post-processing, passing the API key
        llm = LLM(
            model="llama4-maverick-instruct-basic", 
            deployment_type="auto",
            api_key=FIREWORKS_API_KEY  # <-- Add this line
        )
    
    # This inner function contains the main processing loop.
    async def process_samples():
        async for sample in tqdm(dataset, desc=f"Processing {model}"):
            try:
                # Skip any invalid samples from the dataset loader.
                if sample is None:
                    logger.warning("Skipping a `None` sample received from the dataset.")
                    continue

                logger.info("="*50)
                logger.info(f"Processing: {sample.get('file_name', sample['audio_path'])}")
                
                # Get audio metadata before processing.
                audio_duration = sf.info(sample["audio_path"]).duration

                # --- 2.2. Model-Specific Transcription Logic ---
                
                # --- Azure Processing ---
                if model == "azure":
                    start = time.time()
                    display_text, lexical_text = transcribe_and_get_formats(
                        file_path=sample["audio_path"],
                        speech_key=AZURE_API_KEY,
                        service_region=AZURE_API_REGION,
                        language=sample["language"]
                    )
                    transcription_end = time.time()
                    final_text = get_corrected_text(OPENAI_API_KEY, display_text, lexical_text)
                    processing_end = time.time()

                # --- OpenAI Whisper Processing ---
                elif model == "whisper":
                    start = time.time()
                    with open(sample["audio_path"], "rb") as audio_file:
                        transcription = client.audio.transcriptions.create(
                            model="whisper-1",
                            file=audio_file,
                            response_format="text"
                        )
                    transcription_end = time.time()
                    final_text = replace_digits_with_words(OPENAI_API_KEY, transcription)
                    processing_end = time.time()

                # --- OpenAI GPT-4o Processing ---
                elif model == "gpt-4o-transcribe":
                    start = time.time()
                    with open(sample["audio_path"], "rb") as audio_file:
                        transcription = client.audio.transcriptions.create(
                            model="gpt-4o-transcribe",
                            file=audio_file,
                            response_format="text"
                        )
                    transcription_end = time.time()
                    final_text = replace_digits_with_words(OPENAI_API_KEY, transcription)
                    processing_end = time.time()

                # --- Groq Processing ---
                elif model == "groq-whisper-large-v3-turbo":
                    start = time.time()
                    with open(sample["audio_path"], "rb") as file:
                        transcription = client.audio.transcriptions.create(
                            file=file,
                            model="whisper-large-v3", # Use the official model name for the API
                            response_format="text",
                            language=sample["language"],
                            temperature=0.0
                        )
                    transcription_end = time.time()
                    final_text = replace_digits_with_words_groq(api_key=OPENAI_GROQ_API_KEY, text=transcription)
                    processing_end = time.time()

                # --- Fireworks AI Processing ---
                elif model == "fireworks-whisper-large-v3-turbo":
                    with open(sample["audio_path"], "rb") as audio:
                        start = time.time()
                        # Await the async API call.
                        r = await client.translate_async(audio=audio)
                        transcription_end = time.time()

                    # Post-process the text if it contains digits.
                    if any(char.isdigit() for char in r.text):
                        final_text = replace_digits_with_words_fireworks(llm, text=r.text)
                    else:
                        final_text = r.text
                    processing_end = time.time()
                
                else:
                    raise ValueError(f"The model '{model}' is not supported!")

                # --- 2.3. Calculate Metrics and Store Results ---
                wer_breakdown = analyze_wer_breakdown(sample["transcript"], final_text)

                results_list.append({
                    "model": model,
                    "audio_path": sample["audio_path"],
                    "language": sample["language"],
                    "human_transcript": sample["transcript"],
                    "corrected_asr": final_text,
                    "overall_wer": wer_breakdown["overall_wer"],
                    "word_only_wer": wer_breakdown["word_only_wer"],
                    "punctuation_wer": wer_breakdown["punctuation_error_contribution"],
                    "latency_transcription": transcription_end - start,
                    "latency_total": processing_end - start,
                    "audio_duration": audio_duration
                })

            except Exception as e:
                logger.error(f"Skipping file {sample.get('audio_path', 'unknown')} due to an error: {e}", exc_info=True)
                continue
    
    # --- 2.4. Execute Processing and Handle Async Context ---
    # The 'async with' block is crucial for the Fireworks client to properly manage its connections.
    if model == "fireworks-whisper-large-v3-turbo":
        async with client:
            await process_samples()
    else:
        # Other models do not require an async context manager.
        await process_samples()

    # --- 2.5. Save Final Results to CSV ---
    if not results_list:
        print(f"\nNo results were generated for model '{model}'. Check logs for errors.")
        return None

    results_df = pd.DataFrame(results_list)
    output_path = os.path.join(output_dir, f"results_{model}.csv")
    results_df.to_csv(output_path, index=False)

    print(f"\nProcessing complete for '{model}'. Results saved to {output_path}")
    return results_df


# --- 3. Provider-Specific Helper Functions ---
def transcribe_and_get_formats(file_path: str, speech_key: str, service_region: str, language: str = 'en'):
    """
    Transcribes an audio file using Azure Speech Services.
    
    This function uses continuous recognition with callbacks to capture both the
    final display text and the raw lexical text for detailed analysis.
    """
    # --- 3.1. Configure Azure Speech SDK settings ---
    speech_config = speechsdk.SpeechConfig(subscription=speech_key, region=service_region)
    speech_config.output_format = speechsdk.OutputFormat.Detailed

    # Set the recognition language based on the provided language code.
    lang_map = {'lv': 'lv-LV', 'lt': 'lt-LT', 'et': 'et-EE', 'de': 'de-DE', 'en': 'en-US'}
    if language.lower() in lang_map:
        speech_config.speech_recognition_language = lang_map[language.lower()]
    else:
        raise ValueError(f"Unsupported language: '{language}'. Supported codes are {list(lang_map.keys())}")
    logger.info(f"Language set to: {speech_config.speech_recognition_language}")
    
    # --- 3.2. Define callbacks to handle recognition events ---
    audio_input = speechsdk.AudioConfig(filename=file_path)
    speech_recognizer = speechsdk.SpeechRecognizer(speech_config=speech_config, audio_config=audio_input)
    transcription_segments = []
    done = False

    def recognized_cb(evt: speechsdk.SpeechRecognitionEventArgs):
        """Callback for when a segment of speech is recognized."""
        json_result = evt.result.properties[speechsdk.PropertyId.SpeechServiceResponse_JsonResult]
        detailed_result = json.loads(json_result)
        if detailed_result and detailed_result.get('NBest'):
            transcription_segments.append({
                'display': detailed_result['NBest'][0]['Display'],
                'lexical': detailed_result['NBest'][0]['Lexical']
            })

    def stop_cb(evt: speechsdk.SessionEventArgs):
        """Callback to signal that recognition has stopped."""
        nonlocal done
        logger.info(f"Recognition stopped. Event: {evt}")
        done = True
    
    # --- 3.3. Connect callbacks and start recognition ---
    speech_recognizer.recognized.connect(recognized_cb)
    speech_recognizer.session_stopped.connect(stop_cb)
    speech_recognizer.canceled.connect(stop_cb)
    
    logger.info("Starting continuous recognition...")
    speech_recognizer.start_continuous_recognition()

    # --- 3.4. Wait for the recognition to complete ---
    while not done:
        time.sleep(0.5)

    # --- 3.5. Stop the recognizer and process the results ---
    speech_recognizer.stop_continuous_recognition()
    logger.info("Recognition finished.")

    display_text = " ".join([s['display'] for s in transcription_segments])
    lexical_text = " ".join([s['lexical'] for s in transcription_segments])
    
    return display_text, lexical_text