# ASR Model Benchmark Suite

This project provides a configurable Python suite to benchmark the performance of various Automatic Speech Recognition (ASR) systems. It is designed for non-continuous recognition of speech across multiple languages.

The script runs a series of tests and automatically generates a comprehensive PDF report comparing the models on three key axes:
-   **Accuracy**: Word Error Rate (WER).
-   **Speed**: Latency, reported as a Real-Time Factor (RTF).
-   **Cost**: Price in USD per 1000 minutes.

## Project Structure

```
ASR_Benchmark_Project/
├── dataset/
│   ├── audio/
│   └── transcripts/
├── notebooks/
│   └── data_processing.ipynb
|   └── asr_test.ipynb
├── results/
│   └── (Generated benchmark output folders appear here)
├── src/
│   ├── config_pricing.py
│   └── datasets.py
├── utils/
│   ├── summarize_benchmark.py
│   ├── asr.py
│   ├── text_processing.py
│   ├── video_processing.py
│   └── validation.py
├── raw_data/
│   └── (Raw transcripts generated with data_processing.ipynb notebook go here)
├── processed_data/
│   └── (Processed transcripts and audio generated with data_processing.ipynb notebook go here)
├── benchmark.py
├── .env
├── requirements.txt
└── README.md
```

## Setup and Installation

This project uses **Conda** to manage the environment and **Pip** to install Python packages.

### Step 1: Prerequisites

Ensure you have a Conda distribution installed (such as [Anaconda](https://www.anaconda.com/download) or [Miniconda](https://docs.conda.io/projects/miniconda/en/latest/)).

### Step 2: Create and Activate the Conda Environment

From the project's root directory, run the following commands to create a new Conda environment with Python 3.12 and activate it.

```bash
# Create the environment named 'asr_benchmark' with Python 3.12
conda create -n asr_benchmark python=3.12

# Activate the new environment
conda activate asr_benchmark
```
This step installs both Python and all the necessary underlying system libraries required for the audio packages.

### Step 3: Install Python Dependencies with Pip

With your Conda environment active, install the required Python packages using the `requirements.txt` file.

```bash
pip install -r requirements.txt
```

### Step 4: Configure API Keys

Create a `.env` file in the project's root directory by copying the example file.

```bash
# On Windows
copy .env.example .env
# On macOS/Linux
cp .env.example .env
```
Now, open the `.env` file with a text editor and add your secret API keys.

## Usage

All scripts should be run from the **root directory** of the project with the `asr_benchmark` environment activated.

To run the entire benchmark and generate the final PDF report, use the following command:

```bash
python benchmark
```

The script will create a new, timestamped folder inside the `/results` directory containing all output files, including the final `ASR_Benchmark_Report.pdf`.

## Configuration

### Selecting Models to Test

The list of models to be tested is located in `src/config_pricing.py`. You can add or remove model names from the `MODEL_LIST` constant to control which tests are run.

```python
# In src/config_pricing.py
MODEL_LIST = [
    "azure", 
    "whisper",
    "gpt-4o-transcribe",
    # "groq-whisper-large-v3-turbo", # Example of a commented-out model
    "fireworks-whisper-large-v3-turbo",
]
```

To add support for additional models:

- Add the corresponding logic to the utils/asr.py and utils/text_processing filesl.

- Update the ```MODEL_LIST``` and the price lists with the data for the new model


### Adding New Files to the Dataset

1.  **Add Files**: Place new audio files (e.g., `.wav`) in `dataset/audio/` and the corresponding ground-truth transcripts (as `.txt` files) in `dataset/transcripts/`.
    - The `notebooks/data_processing.ipynb` notebook can be used to pull audio and transcripts from sources like YouTube. This requires the `yt-dlp` package.

2.  **Update `sources.csv`**: Add a new row to the `sources.csv` file in the project root.
    -   **`file_name`**: The base name of the files (without extension). This must match for both the audio and transcript file.
    -   **`language`**: The two-letter language code (e.g., `en`, `de`, `lv`).
    - The other columns can be ignored.
