# Example 968: Lorenz Attractor (ODE Solver)

This example solves the **Lorenz system**, a set of ordinary differential equations (ODEs) notable for having chaotic solutions, inside a Web Worker.

## Description

The Lorenz equations are:
$$ \frac{dx}{dt} = \sigma (y - x) $$
$$ \frac{dy}{dt} = x (\rho - z) - y $$
$$ \frac{dz}{dt} = xy - \beta z $$

- **Worker Thread**: Computes the position $(x, y, z)$ of a point in the system over time using the **Runge-Kutta (RK4)** numerical integration method for higher accuracy than simple Euler integration.
- **Main Thread**: Receives batches of coordinates and renders the trajectory on a Canvas, rotating the 3D points to create a visual "Butterfly" effect.

## Features

- **Chaotic Simulation**: Demonstrates sensitive dependence on initial conditions.
- **RK4 Integration**: Robust mathematical solver running off-thread.
- **Real-time Interaction**: Adjust the system parameters ($\sigma, \rho, \beta$) on the fly to see how the attractor shape changes.
- **3D Projection**: Projects 3D coordinates onto a 2D canvas with rotation.

## Usage

1. Open `index.html`.
2. Click "Start".
3. Watch the line trace out the "butterfly" shape.
4. Adjust "Speed" to calculate more steps per frame.
5. Change "Rho" to see the system transition from stable points to chaos (around $\rho = 28$).

