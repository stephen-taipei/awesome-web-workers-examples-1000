# Example 936: Keplerian Orbit Simulator

This example simulates planetary motion by solving **Kepler's Equation** in a Web Worker.

## Description

Kepler's laws describe the motion of planets around the sun. While the position in time isn't given by a simple formula, it can be derived by solving the transcendental equation $M = E - e \sin E$.
- **Worker Thread**:
    1. Increments the Mean Anomaly $M$ (representing time).
    2. Solves for the Eccentric Anomaly $E$ using the **Newton-Raphson method**.
    3. Computes the True Anomaly $\nu$ and Radius $r$ (polar coordinates).
    4. Sends the orbital state to the main thread.
- **Main Thread**: Converts the polar coordinates to Cartesian $(x, y)$ relative to the focus (Sun) and draws the planet's path.

## Features

- **Numerical Root Finding**: Demonstrates solving $f(x)=0$ iteratively in a worker.
- **Orbital Physics**: Correctly simulates the variable speed of planets (faster near perihelion, slower near aphelion).
- **Interactive Parameters**: Adjust Eccentricity to go from circular ($e=0$) to highly elliptical orbits.

## Usage

1. Open `index.html`.
2. Click "Start Simulation".
3. Adjust "Eccentricity". Notice how the planet speeds up when close to the yellow sun (conservation of angular momentum behavior).
4. Adjust "Time Speed" to speed up the year.
