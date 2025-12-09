# Example 933: Epidemic Simulation (SIR Model)

This example simulates the spread of an infectious disease using the **SIR (Susceptible-Infected-Recovered)** model in a Web Worker.

## Description

The SIR model uses differential equations to predict how a disease spreads through a population.
- **Worker Thread**: Solves the coupled differential equations numerically (Euler method) to track the number of Susceptible, Infected, and Recovered individuals over time.
- **Main Thread**: Plots the epidemic curves (infection wave) on a Canvas.

## Features

- **Pandemic Dynamics**: Visualize "flattening the curve" by adjusting parameters.
- **Fast Simulation**: Computes months of spread in milliseconds.
- **Key Metrics**: Automatically identifies the Peak Infection count and Total Recovered (immune) population.

## Usage

1. Open `index.html`.
2. Adjust "Infection Rate" ($\beta$) and "Recovery Rate" ($\gamma$). High $\beta$ creates a sharp peak; high $\gamma$ ends the epidemic quickly.
3. Click "Run Simulation".
4. Observe the red line (Infections) rise and fall, and the green line (Recovered) grow.
