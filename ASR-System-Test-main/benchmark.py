"""
Main entry point for the ASR Benchmark Suite.

This script orchestrates the entire testing and reporting pipeline:
1. Runs transcription tests for all specified models against the dataset.
2. Aggregates the raw results into a summary table.
3. Generates a final PDF report with data tables and visual charts.
"""

import time
import pandas as pd
import asyncio
import logging
import os

# --- Import project-specific functions ---
from utils.asr import test_model 
from src.datasets import ASRDataset
from src.config_pricing import MODEL_LIST
from utils.summarise_benchmark import summarize_results, create_dashboard

async def run_benchmark():
    """
    Core function to execute the transcription tests and save raw results.
    """
    # --- 1. Define constants and setup output directories ---
    SOURCE_CSV = os.path.join("dataset", "sources.csv")
    TRANSCRIPT_DIR = os.path.join("dataset", "transcripts")
    AUDIO_DIR = os.path.join("dataset", "audio")

    # Create a unique, timestamped directory for this benchmark run.
    main_output_dir = f"benchmark_results_{time.strftime('%Y%m%d-%H%M%S')}"
    main_output_dir = os.path.join("results", main_output_dir)
    os.makedirs(main_output_dir, exist_ok=True)

    # Configure logging to save all output to a file in the results directory.
    log_path = os.path.join(main_output_dir, "benchmark_run.log")
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    if root_logger.hasHandlers():
        root_logger.handlers.clear()
    file_handler = logging.FileHandler(log_path)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    logging.info(f"Benchmark run started. Results will be in: {main_output_dir}")
    print(f"All results will be saved in: '{main_output_dir}'")
    
    # --- 2. Load the dataset from source files ---
    try:
        sources_df = pd.read_csv(SOURCE_CSV, encoding='utf-8')
        dataset = ASRDataset(sources_df, AUDIO_DIR, TRANSCRIPT_DIR)
        print(f"Dataset loaded with {len(dataset)} samples.")
    except Exception as e:
        print(f"FATAL: Could not load dataset. Error: {e}")
        logging.error(f"Could not load dataset: {e}", exc_info=True)
        return None # Return None if dataset loading fails

    # --- 3. Run the transcription test for each model ---
    all_results_dfs = []
    for model in MODEL_LIST:
        print("-" * 70)
        try:
            # The test_model function is async, so we 'await' its completion.
            results_df = await test_model(
                dataset=dataset,
                model=model,
                output_dir=main_output_dir
            )
            if results_df is not None:
                all_results_dfs.append(results_df)
        except Exception as e:
            print(f"FATAL: Benchmark for model '{model}' failed. Error: {e}")
            logging.error(f"Benchmark for '{model}' failed: {e}", exc_info=True)

    # --- 4. Combine raw results from all models into a single CSV ---
    if all_results_dfs:
        print("-" * 70)
        print("Combining all model results into a summary file...")
        combined_df = pd.concat(all_results_dfs, ignore_index=True)
        summary_path = os.path.join(main_output_dir, "summary_all_models.csv")
        combined_df.to_csv(summary_path, index=False)
        print(f"Raw summary saved to: '{summary_path}'")
    
    logging.info("Core benchmark tests finished.")
    return main_output_dir


# This block executes when you run "python benchmark.py" from the terminal.
if __name__ == "__main__":
    
    # --- BENCHMARK EXECUTION PIPELINE ---
    print("Starting the ASR Benchmark Suite...")

    # Step 1: Run the core benchmark tests.
    # This processes all audio files and saves the raw results for each model.
    # It returns the main directory where all results for this run are stored.
    output_dir = asyncio.run(run_benchmark())

    # Proceed only if the benchmark ran successfully and created an output directory.
    if output_dir:
        # Step 2: Summarise the raw results into a clean, aggregated table.
        # This creates the 'final_summary_with_cost.csv' file.
        print("\n--- Generating final summary table ---")
        summarize_results(output_dir)

        # Step 3: Generate the final visual report.
        # This creates the 'performance_dashboard.png' and 'ASR_Benchmark_Report.pdf'.
        print("\n--- Generating visual dashboard and PDF report ---")
        create_dashboard(output_dir)

        print("-" * 70)
        print("Benchmark suite finished successfully!")
    else:
        print("-" * 70)
        print("Benchmark suite failed to complete. Please check the logs for errors.")