# Example 935: Zero-Dimensional Climate Model

This example implements a **Zero-Dimensional Energy Balance Model (EBM)** in a Web Worker to simulate the Earth's global average temperature.

## Description

The model equates the incoming energy from the Sun with the outgoing heat radiation from the Earth.
$$ C \frac{dT}{dt} = \frac{S_0}{4}(1 - \alpha) - \epsilon \sigma T^4 $$
Where:
- $S_0$: Solar Constant (1361 $W/m^2$)
- $\alpha$: Albedo (Reflectivity)
- $\epsilon$: Emissivity (Greenhouse effect factor)
- $\sigma$: Stefan-Boltzmann Constant

- **Worker Thread**: Solves the differential equation over time to find the equilibrium temperature.
- **Main Thread**: Plots the temperature trajectory.

## Features

- **Physics Simulation**: Accurate basic climate physics using Stefan-Boltzmann law.
- **Scenario Analysis**: See how changing Albedo (e.g., melting ice) or Emissivity (CO2 increase) affects global warming.
- **Fast Solving**: Simulates decades/centuries in milliseconds.

## Usage

1. Open `index.html`.
2. Adjust "Emissivity" (Lower values mimic higher Greenhouse gases).
3. Adjust "Solar Constant" (Sun's brightness).
4. Click "Run Simulation".
5. See the temperature rise or fall to a new stable equilibrium.
