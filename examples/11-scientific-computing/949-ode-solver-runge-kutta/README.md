# Example 949: ODE Solver (Runge-Kutta)

This example demonstrates solving systems of **Ordinary Differential Equations (ODEs)** using the **Runge-Kutta (RK4)** method in a Web Worker.

## Description

Many physical and biological systems are described by ODEs. RK4 is a standard numerical technique for solving these equations with good accuracy.
- **Worker Thread**: Implements the RK4 integration loop. It accepts system parameters and initial conditions, then steps through time to calculate the state trajectory.
- **Main Thread**: Plots the results in two ways: Time Domain (State vs Time) and Phase Space (State vs State).

## Features

- **Multiple Systems**:
    - **Lotka-Volterra**: Predator-Prey population dynamics.
    - **Harmonic Oscillator**: Damped spring-mass system.
    - **Van der Pol Oscillator**: Non-linear oscillator with limit cycles.
- **Visualization**: Dual charts show both the temporal evolution and the phase portrait (attractors/cycles).
- **Parameter Tuning**: Adjust constants like damping, growth rates, or friction to see how the system behavior changes (e.g., from oscillating to stable).

## Usage

1. Open `index.html`.
2. Select a "System" (e.g., Lotka-Volterra).
3. Adjust the specific parameters (e.g., alpha, beta).
4. Click "Solve ODE".
5. View the population cycles in the top chart and the closed loop in the bottom (Phase) chart.
