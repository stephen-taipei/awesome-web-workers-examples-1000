# Example 945: Option Pricing Calculator

This example calculates financial option prices (Call/Put) using both the analytical **Black-Scholes** formula and numerical **Monte Carlo Simulation** in a Web Worker.

## Description

Option pricing involves estimating the fair value of a financial derivative.
- **Worker Thread**:
    1. Computes the exact Black-Scholes price and "Greeks" (Delta, Gamma, Vega, Theta) using error function approximations for the normal CDF.
    2. Runs a Monte Carlo simulation (e.g., 100,000 iterations) of Geometric Brownian Motion to estimate the price numerically.
- **Main Thread**: Displays the calculated prices, Greeks, and visualizes a subset of the random price paths generated during the simulation.

## Features

- **Dual Methods**: Compares analytical exact solution vs numerical approximation.
- **Greeks Calculation**: Sensitivity measures crucial for risk management.
- **Monte Carlo**: Simulates market randomness to derive value, showcasing the Law of Large Numbers.
- **Visual Path**: Renders random walk paths to visualize potential future stock prices.

## Usage

1. Open `index.html`.
2. Adjust inputs: Spot Price, Strike Price, Time to Maturity, Risk-free Rate, Volatility.
3. Select number of "Simulations" (higher = more accurate MC, slower).
4. Click "Calculate".
5. Compare the "Analytical" vs "Monte Carlo" results (they should be close) and view the projected price paths.
