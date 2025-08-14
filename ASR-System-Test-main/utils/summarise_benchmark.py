import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from fpdf import FPDF
from fpdf.enums import XPos, YPos
import time
import argparse
from src.config_pricing import MODEL_COSTS_BATCH, MODEL_COSTS_RT
from utils.validation import plot_overall_wer_distribution, plot_per_language_wer_distributions

def summarize_results(input_dir: str):
    """
    Loads benchmark results, calculates statistics including RTF and cost,
    and saves them to a new summary CSV file.
    """
    print(f"Processing results from directory: '{input_dir}'")

    # 1. Load the combined results file.
    summary_file = os.path.join(input_dir, "summary_all_models.csv")
    if not os.path.exists(summary_file):
        print(f"Error: Could not find 'summary_all_models.csv' in '{input_dir}'")
        return None
    results_df = pd.read_csv(summary_file)

    # 2. Calculate Real-Time Factor (RTF) for each sample before averaging.
    results_df['rtf_transcription'] = results_df['latency_transcription'] / results_df['audio_duration']
    results_df['rtf_total'] = results_df['latency_total'] / results_df['audio_duration']

    # 3. Define the metrics we want to average.
    metrics = [
        'overall_wer', 'word_only_wer', 'punctuation_wer',
        'rtf_transcription', 'rtf_total'
    ]

    # 4. Calculate overall and per-language average statistics.
    overall_summary = results_df.groupby('model')[metrics].mean().reset_index()
    overall_summary['language'] = 'overall'
    per_language_summary = results_df.groupby(['model', 'language'])[metrics].mean().reset_index()

    # 5. Combine into a single DataFrame.
    final_summary_df = pd.concat([overall_summary, per_language_summary], ignore_index=True)
    
    # 6. Calculate cost metrics.
    total_duration_sec = results_df.groupby('model')['audio_duration'].sum()
    total_duration_min = total_duration_sec / 60
    
    cost_per_min_batch = total_duration_min.index.map(MODEL_COSTS_BATCH) / 1000
    total_run_cost_batch = (total_duration_min * cost_per_min_batch).rename('total_benchmark_cost_batch')

    cost_per_min_rt = total_duration_min.index.map(MODEL_COSTS_RT) / 1000
    total_run_cost_rt = (total_duration_min * cost_per_min_rt).rename('total_benchmark_cost_rt')

    final_summary_df['cost_batch_per_1000_min'] = final_summary_df['model'].map(MODEL_COSTS_BATCH)
    final_summary_df['cost_rt_per_1000_min'] = final_summary_df['model'].map(MODEL_COSTS_RT)
    
    final_summary_df = final_summary_df.merge(total_run_cost_batch, on='model', how='left')
    final_summary_df = final_summary_df.merge(total_run_cost_rt, on='model', how='left')

    cost_cols = ['total_benchmark_cost_batch', 'total_benchmark_cost_rt']
    final_summary_df.loc[final_summary_df['language'] != 'overall', cost_cols] = None

    # 7. Clean up the column names.
    final_summary_df.rename(columns={
        'overall_wer': 'avg_overall_wer', 'word_only_wer': 'avg_word_only_wer',
        'punctuation_wer': 'avg_punctuation_wer', 'rtf_transcription': 'avg_rtf_transcription',
        'rtf_total': 'avg_rtf_total'
    }, inplace=True)

    # 8. Reorder columns to a more logical format.
    column_order = [
        'model', 'language', 'avg_overall_wer', 'avg_word_only_wer',
        'avg_punctuation_wer', 'avg_rtf_transcription', 'avg_rtf_total',
        'cost_batch_per_1000_min', 'cost_rt_per_1000_min',
        'total_benchmark_cost_batch', 'total_benchmark_cost_rt'
    ]
    final_summary_df = final_summary_df[column_order]
    final_summary_df.sort_values(by=['model', 'language'], inplace=True)

    # 9. Save the final, neat CSV file.
    output_path = os.path.join(input_dir, "final_summary_with_cost.csv")
    final_summary_df.to_csv(output_path, index=False, float_format='%.4f')
    
    print("-" * 50)
    print("Summary generation complete!")
    print(f"Neat summary file with cost saved to: '{output_path}'")
    print("-" * 50)
    print("Final Results:")
    print(final_summary_df.to_string())


def create_dashboard(input_dir):
    """Main function to generate all visual artifacts."""
    summary_file = os.path.join(input_dir, "final_summary_with_cost.csv")
    raw_results_file = os.path.join(input_dir, "summary_all_models.csv")

    if not os.path.exists(summary_file) or not os.path.exists(raw_results_file):
        print(f"Error: Make sure '{summary_file}' and '{raw_results_file}' exist.")
        return

    summary_df = pd.read_csv(summary_file)
    raw_results_df = pd.read_csv(raw_results_file)
    overall_stats = summary_df[summary_df['language'] == 'overall'].copy()
    
    unique_models = sorted(overall_stats['model'].unique())
    palette = sns.color_palette('viridis', n_colors=len(unique_models))
    model_colors = {model: color for model, color in zip(unique_models, palette)}
    
    dashboard_image_path = create_dashboard_image(overall_stats, model_colors, input_dir)
    
    distribution_plots = {}
    print("\n--- Generating Detailed WER Distribution Plots for each model ---")
    for model_name in raw_results_df['model'].unique():
        model_df = raw_results_df[raw_results_df['model'] == model_name]
        overall_plot_path = plot_overall_wer_distribution(model_df, input_dir)
        by_language_plot_path = plot_per_language_wer_distributions(model_df, input_dir)
        distribution_plots[model_name] = {'overall': overall_plot_path, 'by_language': by_language_plot_path}
        print(f"Generated distribution plots for {model_name}")

    create_pdf_report(summary_df, dashboard_image_path, distribution_plots, input_dir)

    print("-" * 50)
    print("All artifacts generated successfully!")

def plot_horizontal_bar(ax, data, metric, title, xlabel, palette, is_price=False, is_time=False):
    plot_data = data.sort_values(metric, ascending=True)
    sns.barplot(ax=ax, x=metric, y='model', hue='model', data=plot_data, palette=palette, orient='h', legend=False)
    ax.set_title(title, fontsize=14, weight='bold')
    ax.set_xlabel(xlabel, fontsize=10)
    ax.set_ylabel('')
    for p in ax.patches:
        width = p.get_width()
        label = f"${width:.2f}" if is_price else f"{width:.3f}"
        ax.text(width * 1.01, p.get_y() + p.get_height() / 2, label, va='center')

def plot_rt_cost_chart(ax, data, model_colors):
    metric = 'cost_rt_per_1000_min'
    plot_data = data.sort_values(by='model', ascending=False).copy()
    plot_data[metric] = plot_data[metric].replace(0, np.nan)
    sns.barplot(ax=ax, x=metric, y='model', hue='model', data=plot_data, palette=model_colors, orient='h', legend=False)
    ax.set_title('Real-Time Cost per 1000 Minutes', fontsize=14, weight='bold')
    ax.set_xlabel('USD ($) (Lower is Better)', fontsize=10)
    ax.set_ylabel('')
    for p in ax.patches:
        width = p.get_width()
        ax.text(width * 1.01, p.get_y() + p.get_height() / 2, f'${width:.2f}', va='center')
    y_labels = [label.get_text() for label in ax.get_yticklabels()]
    na_models = data[data['cost_rt_per_1000_min'] <= 0]
    for model_name in na_models['model']:
        if model_name in y_labels:
            y_pos = y_labels.index(model_name)
            ax.text(0.01, y_pos, 'N/A (Not Supported)', va='center', ha='left', style='italic', color='gray')
    if not plot_data[metric].dropna().empty:
        ax.set_xlim(right=plot_data[metric].max() * 1.15)


def create_dashboard_image(overall_stats, model_colors, output_dir):
    fig, axes = plt.subplots(4, 2, figsize=(18, 22))
    fig.suptitle('ASR Model Performance Dashboard', fontsize=24, weight='bold')
    axes = axes.flatten()
    
    plot_configs = [
        {'metric': 'avg_overall_wer', 'title': 'Overall WER'},
        {'metric': 'avg_word_only_wer', 'title': 'Word-Only WER'},
        {'metric': 'avg_punctuation_wer', 'title': 'Punctuation Error Contribution'},
        {'metric': 'avg_rtf_transcription', 'title': 'Transcription Real-Time Factor (RTF)'},
        {'metric': 'avg_rtf_total', 'title': 'Total RTF (with Post-Processing)'},
        {'metric': 'cost_batch_per_1000_min', 'title': 'Batch Cost per 1000 Minutes', 'is_price': True},
    ]
    
    for i, config in enumerate(plot_configs):
        xlabel = 'RTF (Lower is Better)' if 'rtf' in config['metric'] else 'WER (Lower is Better)'
        if config.get('is_price'): xlabel = 'USD ($) (Lower is Better)'
        
        plot_horizontal_bar(
            axes[i], overall_stats, config['metric'], config['title'], xlabel, model_colors,
            is_price=config.get('is_price', False)
        )
        
    plot_rt_cost_chart(axes[6], overall_stats, model_colors)
    axes[7].axis('off')
    plt.tight_layout(rect=[0, 0.03, 1, 0.96])
    image_path = os.path.join(output_dir, "performance_dashboard.png")
    plt.savefig(image_path, dpi=150)
    plt.close()
    print(f"Dashboard image saved to: '{image_path}'")
    return image_path


def render_table_to_pdf(pdf, data):
    """Renders a pandas DataFrame as a formatted table in the PDF."""
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Detailed Performance Metrics", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    pdf.ln(5)

    columns_to_show = {
        'model': ('Model', 0.25),
        'language': ('Lang', 0.08),
        'avg_overall_wer': ('WER', 0.08),
        'avg_rtf_total': ('RTF', 0.08),
        'cost_batch_per_1000_min': ('Cost Batch ($/1k min)', 0.24),
        'cost_rt_per_1000_min': ('Cost RT ($/1k min)', 0.24)
    }
    
    available_width = pdf.w - 2 * pdf.l_margin
    col_widths = {name: available_width * weight for name, (disp, weight) in columns_to_show.items()}

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_fill_color(230, 230, 230)
    for col_name, (display_name, weight) in columns_to_show.items():
        pdf.cell(col_widths[col_name], 8, display_name, border=1, fill=True, align='C')
    pdf.ln()

    pdf.set_font("Helvetica", "", 8)
    for index, row in data.iterrows():
        is_overall = row['language'] == 'overall'
        if is_overall:
            pdf.set_fill_color(245, 245, 245)
        
        for col_name in columns_to_show.keys():
            text = str(row[col_name]) if pd.notna(row[col_name]) else ''
            if col_name == 'model' and len(text) > 25:
                text = text[:22] + '...'
            pdf.cell(col_widths[col_name], 6, text, border=1, fill=is_overall)
        pdf.ln()

def create_pdf_report(summary_df, dashboard_image_path, distribution_plots, output_dir):
    """Creates a PDF report with a summary table and all generated charts."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 18)
    pdf.cell(0, 10, "ASR Benchmark Summary Report", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 10, f"Generated on: {time.strftime('%Y-%m-%d %H:%M:%S')}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    pdf.ln(10)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 5, 
        "This report summarizes the performance of various Automatic Speech Recognition (ASR) models. "
        "It includes metrics for accuracy (Word Error Rate), speed (Real-Time Factor), and cost. "
        "The following pages contain a detailed data table, a visual performance dashboard, and in-depth "
        "WER distribution plots for each model.",
        align="L"
    )

    render_table_to_pdf(pdf, summary_df)

    pdf.add_page()
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(0, 10, "Performance Dashboard", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    pdf.ln(5)
    page_width = pdf.w - 20
    pdf.image(dashboard_image_path, x=10, y=30, w=page_width)

    for model_name, paths in distribution_plots.items():
        pdf.add_page()
        pdf.set_font("Helvetica", "B", 16)
        pdf.cell(0, 10, f"Detailed WER Distributions for: {model_name}", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
        pdf.ln(10)
        
        pdf.image(paths['overall'], x=10, w=pdf.w - 20)
        pdf.image(paths['by_language'], x=10, y=pdf.h / 2 + 20, w=pdf.w - 20)

    pdf_path = os.path.join(output_dir, "ASR_Benchmark_Report.pdf")
    pdf.output(pdf_path)
    print(f"PDF report saved to: '{pdf_path}'")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Summarize ASR benchmark results and generate a report.")
    parser.add_argument("input_dir", type=str, help="The path to the benchmark results directory.")
    args = parser.parse_args()
    
    # The script now only needs one entry point.
    # It will first summarize and then create the dashboard/PDF.
    summarize_results(args.input_dir)
    create_dashboard(args.input_dir)