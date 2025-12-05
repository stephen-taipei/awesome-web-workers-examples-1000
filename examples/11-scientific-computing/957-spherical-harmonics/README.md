# Example 957: Spherical Harmonics Visualizer

This example computes and visualizes **Spherical Harmonics** in a Web Worker.

## Description

Spherical harmonics $Y_l^m(\theta, \phi)$ are a set of special functions defined on the surface of a sphere. They appear in many scientific fields, such as quantum mechanics (electron orbitals), geophysics (gravitational fields), and computer graphics (lighting).
- **Worker Thread**:
    1. Computes the Associated Legendre Polynomials $P_l^m(x)$.
    2. Calculates the Spherical Harmonic value for a grid of $(\theta, \phi)$ coordinates.
    3. Maps the magnitude of the function to the radius $r$ to deform a sphere.
    4. Returns a dense 3D point cloud.
- **Main Thread**: Renders the 3D point cloud with 2D canvas projection, allowing interactive rotation.

## Features

- **Math Heavy**: Manual implementation of Legendre polynomials and factorials.
- **3D Visualization**: Point cloud rendering with depth sorting (Painter's Algorithm) and coloring based on function value (Red = positive, Blue = negative).
- **Parameter Control**: Adjust degree ($l$) and order ($m$) to see different orbital shapes (s, p, d, f orbitals).

## Usage

1. Open `index.html`.
2. Set "Degree (l)" and "Order (m)".
3. Click "Generate Mesh".
4. Drag on the canvas to rotate the shape.
5. Try $l=3, m=2$ for a classic multi-lobed shape.
