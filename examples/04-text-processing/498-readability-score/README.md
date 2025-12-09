# Readability Score (Web Worker Example #498)

Calculates standard readability metrics for a given text.

## How it works

1.  **Analysis**: The worker tokenizes the text into sentences, words, and characters.
2.  **Syllable Counting**: Uses a heuristic (regex-based) algorithm to count syllables in English words.
3.  **Calculation**: Computes standard formulas:
    *   **Flesch Reading Ease**: Measures how easy text is to understand.
    *   **Flesch-Kincaid Grade Level**: Corresponds to US school grade levels.
    *   **Gunning Fog Index**: Estimates years of formal education needed.
    *   **Coleman-Liau Index**: Relies on character count rather than syllables.
    *   **ARI**: Automated Readability Index.

## Usage

1.  Paste text into the input box.
2.  Click "Calculate Scores".
3.  View the breakdown of metrics.
