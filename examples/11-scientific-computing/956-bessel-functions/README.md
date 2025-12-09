# Example 956: Drum Head Vibration

This example simulates the vibration modes of a circular membrane (like a drum) using **Bessel Functions** in a Web Worker.

## Description

The vibrations of a circular drum head are solutions to the wave equation in polar coordinates. These solutions are described by Bessel functions of the first kind, $J_m(x)$, combined with trigonometric functions.
- **Worker Thread**:
    1. Calculates the height $z$ of the membrane at every pixel $(r, \theta)$ for a specific time $t$.
    2. Uses numerical integration to approximate the Bessel function value $J_m(k_{mn} r)$.
    3. Generates a pixel buffer representing the height map (Red = up, Blue = down).
- **Main Thread**: Displays the animated heat map.

## Features

- **Physics Simulation**: Visualizes standing wave patterns (modes).
- **Bessel Functions**: Implements a numerical integrator to compute $J_m(x)$ on the fly.
- **Interactive Modes**: Change the Radial ($m$) and Angular ($n$) mode numbers to see different vibration patterns.

## Usage

1. Open `index.html`.
2. Click "Start Simulation".
3. Adjust sliders for "Radial Mode (m)" and "Angular Mode (n)".
   - $m=0, n=1$: Fundamental mode (whole drum moves up/down).
   - $m=1, n=1$: Left/Right split.
   - Higher modes create complex symmetric patterns.
4. Adjust "Speed" to slow down the vibration.

