# Example 934: Predator-Prey Simulation

This example simulates the **Lotka-Volterra equations**, a pair of first-order non-linear differential equations, in a Web Worker.

## Description

These equations model the dynamics of biological systems in which two species interact, one as a predator and the other as prey.
$$ \frac{dx}{dt} = \alpha x - \beta xy $$
$$ \frac{dy}{dt} = \delta xy - \gamma y $$
Where $x$ is prey and $y$ is predator.

- **Worker Thread**: Integrates the differential equations over time using Euler's method. Accepts real-time parameter updates.
- **Main Thread**: Visualizes the population populations over time and the phase portrait (cyclic behavior).

## Features

- **Real-time Dynamics**: Adjust birth/death rates on the fly to see the system stabilize, cycle, or crash.
- **Phase Portrait**: Visualizes the limit cycle (attractor) of the system.
- **Stability**: Separation of simulation loop ensures smooth UI even if calculations become complex (e.g., with more species).

## Usage

1. Open `index.html`.
2. Click "Start".
3. Observe the oscillating populations in the top chart.
4. Adjust "Predation Rate" or "Growth" sliders to change the cycle shape.
