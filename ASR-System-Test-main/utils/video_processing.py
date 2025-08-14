import subprocess
import os
import json
import re
import shutil

def download_audio_and_subs(video_url, start_time, end_time, raw_dir="raw_data", processed_dir="processed_data", lang="en"):
    """
    Download the audio track from a YouTube video as .wav, alongside video transcripts.

    Return the paths to downloaded files if successful, None otherwise
    """

    # Create the output data dir (if needed)
    os.makedirs(raw_dir, exist_ok=True)

    # Extract the video ID
    video_id = video_url.split("v=")[-1].split("&")[0]

    # Create data paths for audio and text
    start_time_formatted = start_time.replace(":", "-")
    end_time_formatted   = end_time.replace(":", "-")
    fragment_base_name = f"{lang}_{video_id}_{start_time_formatted}-{end_time_formatted}"
    audio_path = os.path.join(processed_dir, f"{fragment_base_name}.wav")
    srt_path   = os.path.join(raw_dir, f"{fragment_base_name}.{lang}.srt") 

    # Defube a template to make sure yt-dlp output file names are on point
    yt_dlp_output_template = os.path.join(raw_dir, f"{fragment_base_name}.%(ext)s")
    
    # Define the command to be used by yt-dlp for downloading the required files
    command = [
        "yt-dlp",
        "--extract-audio",
        "--audio-format", "wav",
        "--audio-quality", "0",
        "--write-subs",
        "--no-write-auto-subs",
        "--sub-lang", lang, # Keep this to specify desired subtitle language
        "--download-sections", f"*{start_time}-{end_time}",
        "--output", yt_dlp_output_template, # Use the explicit template with 'lang' included
        "--sub-format", "srt",
        "--encoding", "utf-8",
        "--verbose",
        video_url
    ]

    try:
        subprocess.run(command,
                       check=True,
                       capture_output=True,
                       text=True)
        
        source      = os.path.join(raw_dir,  f"{fragment_base_name}.wav")
        destination = audio_path
        
        try:
            shutil.move(source, destination)
            return audio_path, srt_path, fragment_base_name
        except Exception as e:
            print(f"Error moving the audio file: {e}")
            return None, None, None
    
        
    except subprocess.CalledProcessError as e:
        print(f"Error, could not fetch content: Command exited with status {e.returncode}")
        print("--- YT-DLP STDOUT (verbose output): ---")
        print(e.stdout) 
        print("--- YT-DLP STDERR: ---")
        print(e.stderr) 
        return None, None, None
    except FileNotFoundError:
        print("Error: 'yt-dlp' command not found. Please ensure yt-dlp is installed and accessible in your system's PATH.")
        return None, None, None
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return None, None, None
              

def parse_srt_to_json(srt_path, wav_path, lang="en"):
    """
    Parses an SRT file corresponding to the entire video transcript to the JSON format.
    A single speaker is assumed
    """

    segments = []
    current_id = 0

    # Use regular expressions to chop up the SRT text into blocks
    try: 
        with open(srt_path, 'r', encoding='utf-8') as f:
            srt_content = f.read()

            blocks = re.split(r'\n\s*\n', srt_content.strip())


        # Split up the blocks into lines, then connect them
        for block in blocks:
            if not block.strip():
                continue

            lines = block.strip().split('\n')
            if len(lines) < 2:
                continue

            time_line_index = 1
            text_start_index = 2

            if len(lines) <= time_line_index: 
                    continue

            time_match = re.match(r'(\d{2}:\d{2}:\d{2}[,.]\d{3}) --> (\d{2}:\d{2}:\d{2}[,.]\d{3})', lines[time_line_index])

            if time_match:
                    start_time_str = time_match.group(1).replace(',', '.')
                    end_time_str = time_match.group(2).replace(',', '.')

                    start_time = time_to_seconds(start_time_str)
                    end_time = time_to_seconds(end_time_str)
                    
                    # Join all the lines into a single text block
                    text = " ".join(lines[text_start_index:]).strip()

                    text = clean_for_asr(text)

                    if text:
                        segments.append({
                            "id": f"segment_{current_id:03d}",
                            "start_time": start_time,
                            "end_time": end_time,
                            "text": text,
                            "speaker_id": "speaker_A", # Assuming single speaker for now
                        })
                        current_id += 1
            else:
                print(f"Warning: Skipping malformed SRT block (no valid timestamp) in {srt_file_path}. Block content:\n{block}")
                

    except Exception as e:
        print(f"Error: {e}")

    full_duration = segments[-1]['end_time'] if segments else 0

    json_output = {
        "audio_filename": os.path.basename(wav_path),
        "language": lang,
        "duration_seconds": full_duration,
        "transcription_segments": segments
    }

    return json_output
        
def clean_for_asr(text):
    """Clean the text to make testing ASR systems easier"""
    text = re.sub(r'\[.*?\]|\(.*?\)|[a-z\s]+:', '', text) # Remove non-speech events and speaker labels  e.g. [LAUGHTER]
    text = re.sub(r'<[^>]+>', '', text) # Remove HTML tags

    text = re.sub(r'[—–:]', ',', text) # Replace dashes and colons with a comma
    text = re.sub(r';', '.', text) # Replace semicolons with a full stop

    text = re.sub(r"[^a-zA-ZāčēģīķļņōŗšūžĀČĒĢĪĶĻŅŌŖŠŪŽąčęėįšųūžĄČĘĖĮŠŲŪŽäöõüšžÄÖÕÜŠŽ0-9\s.,!?']", '', text) # Remove any unwanted punctuation (keeping .,?! and Baltic characters)
    text = re.sub(r'\s+', ' ', text).strip() # Replace multiple spaces with single space

    return text

def save_transcript(json_data, start_time, end_time, file_id, raw_output_dir, final_output_dir):
    """
    Save the JSON data as both .json and .txt,
    while respecting the time codes.
    """

    if not json_data:
        print("Error: no JSON data provided.")
        return
    
    os.makedirs(final_output_dir, exist_ok=True)
    
    # Filter and rebase transcript segments 
    filtered_segments = []
    snippet_segment_id_counter = 0
    
    start_time_sec = time_to_seconds(start_time)
    end_time_sec   = time_to_seconds(end_time)
    
    for segment in json_data["transcription_segments"]:
        if segment['start_time'] < end_time_sec and segment['end_time'] > start_time_sec:

            # Determine the relative start and end times within the fragment
            rebased_start = segment['start_time'] - start_time_sec
            rebased_end   = segment['end_time'] - start_time_sec

            # Create a new segment for the snippet
            filtered_segments.append({
                "id": f"segment_{snippet_segment_id_counter:03d}",
                "start_time": round(rebased_start, 2),
                "end_time": round(rebased_end, 2),
                "text": segment['text'], # Keep original text
                "speaker_id": segment['speaker_id'],
            })
            snippet_segment_id_counter += 1     

    filtered_json = {
        "audio_filename": file_id + '.wav',
        "language": json_data['language'],
        "duration_seconds": round((end_time_sec - start_time_sec), 2),
        "transcription_segments": filtered_segments
    }

    # Save subtitles as .txt + .json
    ## Save as JSON
    json_file_path = os.path.join(final_output_dir, f"{file_id}.json")
    try:
        with open(json_file_path, 'w', encoding='utf-8') as f:
            json.dump(filtered_json, f, indent=2, ensure_ascii=False)
        print(f"Saved JSON transcript to {json_file_path}")
    except Exception as e:
        print(f"Error saving JSON to {json_file_path}: {e}")


    ## Save as plain text
    txt_file_path = os.path.join(final_output_dir, f"{file_id}.txt")
    try:
        with open(txt_file_path, 'w', encoding='utf-8') as f:
            for segment in filtered_json['transcription_segments']:
                f.write(segment['text'] + "\n")
        print(f"Saved plain text transcript to {txt_file_path}")
    except Exception as e:
        print(f"Error saving TXT to {txt_file_path}: {e}")


    # Also save the full transcripts for reference
    ## Save as JSON
    full_json_file_path = os.path.join(raw_output_dir, f"{file_id}_FULL.json")
    try:
        with open(full_json_file_path, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, indent=2, ensure_ascii=False)
        print(f"Saved JSON transcript to {full_json_file_path}")
    except Exception as e:
        print(f"Error saving JSON to {full_json_file_path}: {e}")


    ## Save as plain text
    full_txt_file_path = os.path.join(raw_output_dir, f"{file_id}_FULL.txt")
    try:
        with open(full_txt_file_path, 'w', encoding='utf-8') as f:
            for segment in json_data['transcription_segments']:
                f.write(segment['text'] + "\n")
        print(f"Saved plain text transcript to {full_txt_file_path}")
    except Exception as e:
        print(f"Error saving TXT to {full_txt_file_path}: {e}")
            

def time_to_seconds(time_str):
    """Convert HH:MM:SS,mmm to seconds (float)."""
    h, m, s_ms = time_str.split(':')
    s, ms = s_ms.split('.')
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000.0