# Example 944: Stock Price Simulator

This example simulates potential future stock price paths using **Geometric Brownian Motion (GBM)** in a Web Worker.

## Description

GBM is a standard model for stock price dynamics in financial mathematics. It assumes the log of returns follows a normal distribution.
- **Worker Thread**:
    1. Simulates thousands of independent price paths based on the initial price, expected return ($\mu$), and volatility ($\sigma$).
    2. Computes each step (e.g., daily) over the specified time horizon.
    3. Aggregates statistics (Mean, Median) for the final distribution.
- **Main Thread**: Renders the generated paths as a density cloud, highlighting the average path.

## Features

- **Stochastic Simulation**: Demonstrates randomness in financial modeling.
- **Visual Density**: By drawing semi-transparent paths, the chart reveals the probability distribution of future prices (log-normal distribution).
- **Interactive**: Change volatility to see how the "cone of uncertainty" widens.

## Usage

1. Open `index.html`.
2. Set "Start Price", "Expected Return", and "Volatility".
3. Choose "Time Horizon" (e.g., 1 year).
4. Click "Run Simulation".
5. The green/red lines show profitable/loss paths respectively, with the dark line showing the average trend.
