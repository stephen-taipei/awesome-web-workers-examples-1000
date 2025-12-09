# Example 993: Association Rules (Apriori)

This example demonstrates the Apriori algorithm running in a Web Worker to discover frequent itemsets and association rules in a simulated transaction database.

## Description

Association Rule Mining is a popular technique for discovering interesting relationships between variables in large databases (e.g., Market Basket Analysis). The Apriori algorithm iterates through the dataset multiple times to count the support of itemsets, which can be slow.
- **Worker Thread**:
    1. Generates a synthetic transaction dataset.
    2. Runs the Apriori algorithm (finds frequent 1-itemsets, then 2-itemsets, etc.).
    3. Generates rules (Antecedent -> Consequent) and filters them by Confidence.
- **Main Thread**: Displays the generated rules sorted by Lift.

## Features

- **Synthetic Dataset**: Simulates thousands of transactions with a skewed distribution (some items are more popular) to ensure patterns exist.
- **Iterative Mining**: Demonstrates multi-pass algorithm execution in a worker.
- **Rule Metrics**: Calculates Support, Confidence, and Lift for every rule.
- **Interactive**: Adjust thresholds (Min Support, Min Confidence) to see how they affect the number and quality of rules found.

## Usage

1. Open `index.html`.
2. Configure "Transactions" count and "Unique Products".
3. Set "Min Support" (percentage of transactions that must contain the itemset).
4. Set "Min Confidence" (likelihood of Consequent given Antecedent).
5. Click "Generate Transactions & Mine".
6. Review the top rules found (e.g., {P1, P5} -> {P10}).
