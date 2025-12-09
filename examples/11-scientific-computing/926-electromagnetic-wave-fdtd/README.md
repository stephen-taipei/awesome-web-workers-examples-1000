# Example 926: Electromagnetic Wave FDTD

This example simulates the propagation of electromagnetic waves using the **Finite-Difference Time-Domain (FDTD)** method in a Web Worker.

## Description

FDTD is a popular numerical analysis technique for modeling computational electrodynamics (finding approximate solutions to the associated system of differential equations).
- **Worker Thread**:
    1. Solves Maxwell's curl equations in 2D (TMz mode).
    2. Updates Electric ($E_z$) and Magnetic ($H_x, H_y$) fields on a staggered Yee grid.
    3. Handles material properties (conductors reflect, dielectrics refract).
    4. Renders the $E$-field intensity to a pixel buffer.
- **Main Thread**: Displays the wave propagation and allows drawing obstacles.

## Features

- **Wave Physics**: Demonstrates reflection, refraction, interference, and diffraction.
- **Materials**: Simulate Perfect Electric Conductors (PEC) that block waves and Dielectrics that slow them down (lens effect).
- **Interactive**: Draw walls with your mouse to create custom waveguides or scattering objects.

## Usage

1. Open `index.html`.
2. Click "Start".
3. Observe the source emitting waves.
4. Select "Obstacle Material" -> "Perfect Conductor".
5. **Draw** on the canvas to create walls/mirrors and watch the waves bounce off them.
6. Adjust "Source Frequency" to change the wavelength.
