import subprocess

def convert_to_wav(input_path, output_path):
    """
    Converts an audio file (e.g., .webm) to .wav format using ffmpeg.
    Output: 16kHz, mono, PCM WAV (suitable for Azure Speech).
    """
    command = [
        "ffmpeg", "-y", "-i", input_path,
        "-ar", "16000", "-ac", "1", "-f", "wav", output_path
    ]
    subprocess.run(command, check=True) 