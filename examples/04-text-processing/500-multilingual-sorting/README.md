# Multilingual Sorting (Web Worker Example #500)

Sorts text lists using `Intl.Collator` to respect locale-specific rules.

## How it works

1.  **Locale Awareness**: Different languages have different sorting rules.
    *   **German (de)**: 'Ä' is typically sorted as 'A' (phonebook) or 'AE'.
    *   **Swedish (sv)**: 'Ä' comes after 'Z'.
2.  **Numeric Sorting**: Handles numbers logically (2 < 10) instead of lexicographically ("10" < "2").
3.  **Worker**: Offloads the sorting operation, which can be expensive for large lists.

## Usage

1.  Enter a list of items.
2.  Select the locale and numeric option.
3.  Click "Sort List".
