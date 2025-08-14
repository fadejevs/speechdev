from pydub import AudioSegment
import io
import pandas as pd
import os

class ASRDataset:
    def __init__(self, sources_df:pd.DataFrame, audio_dir:str, transcript_dir:str, target_sr:int=16000):
        """
        Initialise the simple ASR dataset
        
        Args:
            sources_df (pd.DataFrame): DataFrame containing file metadata.
            audio_dir (str): Directory for audio files.
            transcript_dir (str): Directory for transcript files.
            target_sr (int): Target sample rate for audio, defaults to 16kHz.
        """

        self.df = sources_df
        self.audio_dir = audio_dir
        self.transcript_dir = transcript_dir
        self.target_sr = target_sr


    def __len__(self):
        return len(self.df)
    
    def __getitem__(self, idx:int):
        """
        Returns as dictionary of data for a given index
        """

        if idx >= len(self.df) or idx < 0:
            raise IndexError("Index out of bounds")

        # Retrieve the file name from the DF
        file_name = self.df.iloc[idx]["file_name"]
        
        audio_path = os.path.join(self.audio_dir, file_name + ".wav")
        text_path = os.path.join(self.transcript_dir, file_name + ".txt")

        # Load the transcript text
        transcript_text = get_transcript(text_path)

        # Load and standardize the audio file
        try:
            audio_segment = AudioSegment.from_file(audio_path)
            
            # --- Enforce the universal standard here ---
            audio_segment = audio_segment.set_frame_rate(self.target_sr)
            audio_segment = audio_segment.set_channels(1) 
            audio_segment = audio_segment.set_sample_width(2) # 16-bit audio
            
            # --- Get the raw bytes to send to the API ---
            # Export to a byte stream in memory, simulating a file-like object
            buffer = io.BytesIO()
            audio_segment.export(buffer, format="wav")
            audio_bytes = buffer.getvalue()
            
        except Exception as e:
            print(f"Error loading or processing audio file {audio_path}: {e}")
            return None

        # Return the prepared audio bytes along with the transcript
        return {
            "audio_bytes": audio_bytes,
            "audio_path": audio_path,
            "transcript": transcript_text,
            "file_name": file_name,
            "language": file_name.split('_')[0] # Assuming language is the prefix
        }


def get_transcript(path) -> str:
    """Get the text trancirpt from the file path provided"""
    transcript = ""
    try:
        with open(path, 'r', encoding='utf-8') as text_file:
            for line in text_file:
                transcript += line
        
        return transcript
    except Exception as e:
        print(f"Error while opening file: {e}")
        return None