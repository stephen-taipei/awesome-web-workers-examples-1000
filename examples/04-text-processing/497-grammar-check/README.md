# Grammar Check (Web Worker Example #497)

A basic rule-based grammar and style checker.

## How it works

1.  **Regex Rules**: The worker runs a set of Regular Expressions against the input text to identify common errors.
2.  **Pattern Matching**: Detects patterns like:
    *   Subject-verb agreement ("I has")
    *   Article usage ("a apple")
    *   Homophones ("their are", "its raining")
    *   Common misspellings ("alot")
3.  **Suggestion**: Calculates the replacement string based on regex capture groups.

## Limitations

This is a demonstration of text processing in a worker. It does **not** perform full Natural Language Processing (NLP) or Part-of-Speech tagging, so it will miss complex grammatical errors and may have false positives.

## Usage

1.  Type or paste text.
2.  Click "Check Grammar".
3.  Review the suggestions below.
