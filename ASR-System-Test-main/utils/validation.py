from jiwer import wer, process_words, visualize_alignment
import jiwer
import re 
import os
import time

import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np

def print_metrics(results_df:pd.DataFrame):
    # Ensure the 'rtf' column exists before proceeding
    if 'rtf' not in results_df.columns:
        if 'latency' in results_df.columns and 'audio_duration' in results_df.columns:
            results_df['rtf'] = results_df['latency'] / results_df['audio_duration']
        else:
            print("Error: 'rtf', 'latency', or 'audio_duration' column not found. Cannot calculate all metrics.")
            return

    # Define the list of metrics to analyze
    metrics_to_analyze = ['overall_wer', 'word_only_wer', 'punctuation_wer', 'latency', 'rtf']

    # 1. Calculate and print overall statistics
    model_name = results_df["model"][0]
    print(f"--- Overall Performance Metrics ({model_name})  ---")

    overall_stats = results_df[metrics_to_analyze].agg(['mean', 'std', 'median'])

    
    # Format and print Overall WER Metrics
    overall_mean_str = f"{100*overall_stats.loc['mean', 'overall_wer']:.2f}"
    word_only_mean_str = f"{100*overall_stats.loc['mean', 'word_only_wer']:.2f}"
    punc_mean_str = f"{100*overall_stats.loc['mean', 'punctuation_wer']:.2f}"

    print(f"  {'Overall WER:':<22} {overall_mean_str:>9} ± {100*overall_stats.loc['std', 'overall_wer']:.2f} %")
    print(f"  {'Word-Only WER:':<22} {word_only_mean_str:>9} ± {100*overall_stats.loc['std', 'word_only_wer']:.2f} %")
    print(f"  {'Punctuation WER:':<22} {punc_mean_str:>9} ± {100*overall_stats.loc['std', 'punctuation_wer']:.2f} %")

    # Format and print Overall Latency Metric
    latency_mean_str = f"{overall_stats.loc['mean', 'latency']:.2f}"
    latency_std_str = f"{overall_stats.loc['std', 'latency']:.2f}s"
    rtf_mean_str = f"{overall_stats.loc['mean', 'rtf']:.3f}"
    rtf_std_str = f"{overall_stats.loc['std', 'rtf']:.3f}"
    rtf_median_str = f"{overall_stats.loc['median', 'rtf']:.3f}" 

    print(f"  {'Latency:':<22} {latency_mean_str:>9} ± {latency_std_str:<5} s")
    print(f"  {'Mean RTF:':<22} {rtf_mean_str:>9} ± {rtf_std_str:<5}")
    print(f"  {'Median RTF:':<22} {rtf_median_str:>9}")


    # 2. Calculate and print the per-language statistics
    summary_stats_by_lang = results_df.groupby('language').agg({
        'overall_wer': ['mean', 'std'],
        'word_only_wer': ['mean', 'std'],
        'punctuation_wer': ['mean', 'std'],
        'latency': ['mean', 'std'],
        'rtf': ['mean', 'std', 'median'] 
    })

    print("\n--- Performance Metrics by Language ---")

    for language, stats in summary_stats_by_lang.iterrows():
        print(f"\nLanguage: {language}")
        print("------------------------------------")
        
        # Format WER Metrics 
        overall_mean_str = f"{100*stats[('overall_wer', 'mean')]:.2f}"
        word_only_mean_str = f"{100*stats[('word_only_wer', 'mean')]:.2f}"
        punc_mean_str = f"{100*stats[('punctuation_wer', 'mean')]:.2f}"
        overall_std_str = f"{100*stats[('overall_wer', 'std')]:.2f}"
        word_only_std_str = f"{100*stats[('word_only_wer', 'std')]:.2f}"
        punc_std_str = f"{100*stats[('punctuation_wer', 'std')]:.2f}"

        print(f"  {'Overall WER:':<22} {overall_mean_str:>9} ± {overall_std_str:<5} %")
        print(f"  {'Word-Only WER:':<22} {word_only_mean_str:>9} ± {word_only_std_str:<5} %")
        print(f"  {'Punctuation WER:':<22} {punc_mean_str:>9} ± {punc_std_str:<5} %")

        # Format Latency Metric with consistent padding
        latency_mean_str = f"{stats[('latency', 'mean')]:.2f}"
        latency_std_str = f"{stats[('latency', 'std')]:.2f}"
        rtf_mean_str = f"{stats[('rtf', 'mean')]:.3f}"
        rtf_std_str = f"{stats[('rtf', 'std')]:.3f}"
        rtf_median_str = f"{stats[('rtf', 'median')]:.3f}" # Get the median
        
        print(f"  {'Latency:':<22} {latency_mean_str:>9} ± {latency_std_str:<5} s")
        print(f"  {'Mean RTF:':<22} {rtf_mean_str:>9} ± {rtf_std_str:<5}")
        print(f"  {'Median RTF:':<22} {rtf_median_str:>9}") # Print the median

def plot_overall_wer_distribution(results_df, output_dir):
    """Generates and saves a violin plot for a single model's overall WER distribution."""
    model_name = results_df["model"].iloc[0]
    df_long = results_df.melt(value_vars=['overall_wer', 'word_only_wer', 'punctuation_wer'], var_name='WER Type', value_name='WER')
    type_mapping = {'overall_wer': 'Overall WER', 'word_only_wer': 'Word-Only WER', 'punctuation_wer': 'Punctuation Contribution'}
    df_long['WER Type'] = df_long['WER Type'].map(type_mapping)
    
    plt.figure(figsize=(10, 7))
    ax = sns.violinplot(data=df_long, x='WER Type', y='WER', hue='WER Type', palette='muted', inner='quartile', order=type_mapping.values())
    sns.stripplot(data=df_long, x='WER Type', y='WER', color='black', size=2, alpha=0.3, ax=ax, order=type_mapping.values())
    ax.set_title(f'Distribution of WER Metrics - {model_name}', fontsize=16)
    ax.set_xlabel('Type of Word Error Rate', fontsize=12)
    ax.set_ylabel('WER Value', fontsize=12)
    plt.xticks(rotation=10)
    plt.tight_layout()

    filename = os.path.join(output_dir, f'wer_dist_overall_{model_name}.png')
    plt.savefig(filename)
    plt.close() # Close plot to free memory
    return filename

def plot_per_language_wer_distributions(results_df, output_dir):
    """Generates and saves a faceted violin plot for a single model's per-language WER distribution."""
    model_name = results_df["model"].iloc[0]
    df_long = results_df.melt(id_vars=['language'], value_vars=['overall_wer', 'word_only_wer', 'punctuation_wer'], var_name='WER Type', value_name='WER')
    type_mapping = {'overall_wer': 'Overall WER', 'word_only_wer': 'Word-Only WER', 'punctuation_wer': 'Punctuation Contribution'}
    df_long['WER Type'] = df_long['WER Type'].map(type_mapping)

    g = sns.catplot(data=df_long, x='WER Type', y='WER', col='language', kind='violin', hue='WER Type', palette='muted', inner='quartile', height=8, aspect=0.8, order=type_mapping.values())
    g.map_dataframe(sns.stripplot, x='WER Type', y='WER', color='black', size=2, alpha=0.3, order=type_mapping.values())
    g.figure.suptitle(f'WER Distribution by Language - {model_name}', y=1.03, fontsize=16)
    g.set_axis_labels('Type of Word Error Rate', 'WER Value')
    g.set_titles("Language: {col_name}")
    g.figure.autofmt_xdate(rotation=30)
    
    filename = os.path.join(output_dir, f'wer_dist_by_language_{model_name}.png')
    plt.savefig(filename)
    plt.close() # Close plot to free memory
    return filename


def _process_asr_text(asr_transcript: str) -> str:
    """
    Applies custom punctuation and whitespace normalization to an ASR transcript.
    - Replaces dashes (-) and colons (:) with commas (,).
    - Replaces semicolons (;) with full stops (.).
    - Intelligently handles whitespace to prevent creating detached punctuation.
    """
    # Handle punctuation that is preceded by a space.
    processed_text = re.sub(r'\s+[-:]', ',', asr_transcript)
    processed_text = re.sub(r'\s+;', '.', processed_text)

    # Handle any remaining punctuation that was not preceded by a space.
    processed_text = processed_text.replace('-', ',').replace(':', ',').replace(';', '.')
    
    # Normalize all remaining whitespace to single spaces.
    processed_text = " ".join(processed_text.split())
    
    return processed_text

def get_wer(human_transcript: str, asr_transcript: str) -> float:
    """
    Compare the two transcripts and return a WER score.
    """
    # Normalize the human transcript
    human_normalized = " ".join(human_transcript.split()).lower()

    # Use the helper function to process the ASR transcript and then convert to lowercase
    asr_normalized = _process_asr_text(asr_transcript).lower()

    # Calculate the Word Error Rate
    error_rate = wer(human_normalized, asr_normalized)

    return error_rate

# ---

def visualize_wer(human_transcript: str, asr_transcript: str) -> None:
    """
    Visualize the alignment between the human and ASR transcripts.
    """
    # Standardize whitespace in the human transcript
    human_normalized = " ".join(human_transcript.split())
    
    # Use the helper function to process the ASR transcript
    asr_normalized = _process_asr_text(asr_transcript)
    
    # Process the words to get the alignment object
    output = jiwer.process_words(human_normalized, asr_normalized)

    # Use the visualize_alignment function to print the output
    print("--- Jiwer Text-Based Visualization ---")
    print(jiwer.visualize_alignment(output))

def _strip_punctuation(text: str) -> str:
    """Removes all punctuation and converts to lowercase."""
    # Remove any character that is not a word character (\w) or whitespace (\s)
    text = re.sub(r'[^\w\s]', '', text)
    # Normalize whitespace and lowercase
    return " ".join(text.split()).lower()

def analyze_wer_breakdown(human_transcript: str, asr_transcript: str) -> dict:
    """
    Performs a detailed WER analysis, breaking down errors by type.

    Returns:
        dict: A dictionary containing total WER, word-only WER, the
              contribution of punctuation errors, and detailed counts.
    """
    # 1. Total error analysis (including punctuation effects)
    human_total = " ".join(human_transcript.split()).lower()
    asr_total = _process_asr_text(asr_transcript).lower()
    
    total_analysis = process_words(human_total, asr_total)

    # 2. Word-only error analysis (ignoring all punctuation)
    human_words_only = _strip_punctuation(human_transcript)
    asr_words_only = _strip_punctuation(asr_transcript)

    words_only_analysis = process_words(human_words_only, asr_words_only)

    # 3. Calculate the breakdown
    punctuation_contribution = total_analysis.wer - words_only_analysis.wer

    # 4.Prepare the results 
    punctuation_contribution = max(0, punctuation_contribution) # Ensure contribution isn't negative due to floating point artifacts
    
    results = {
        "overall_wer": total_analysis.wer,
        "word_only_wer": words_only_analysis.wer,
        "punctuation_error_contribution": punctuation_contribution,
        "details_total": {
            "substitutions": total_analysis.substitutions,
            "deletions": total_analysis.deletions,
            "insertions": total_analysis.insertions,
            "hits": total_analysis.hits,
        },
        "details_words_only": {
            "substitutions": words_only_analysis.substitutions,
            "deletions": words_only_analysis.deletions,
            "insertions": words_only_analysis.insertions,
            "hits": words_only_analysis.hits,
        },
        "visualization": visualize_alignment(total_analysis, show_measures=False)
    }

    return results