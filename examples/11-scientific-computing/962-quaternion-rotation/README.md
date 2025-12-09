# Example 962: Quaternion Rotation

This example demonstrates 3D rotation using **Quaternions** and **SLERP** (Spherical Linear Interpolation) in a Web Worker.

## Description

Quaternions are a number system that extends the complex numbers. They are widely used in computer graphics for representing orientations and rotations of objects in three dimensions because they avoid "Gimbal Lock" (a problem with Euler angles) and allow for smooth interpolation.
- **Worker Thread**:
    1. Manages the current orientation (Quaternion) of a 3D cube.
    2. Calculates the target Quaternion based on user-provided Axis-Angle inputs.
    3. Performs SLERP to generate intermediate Quaternions for smooth animation steps.
    4. Rotates the cube's vertices by the current Quaternion and sends them to the main thread.
- **Main Thread**: Renders the 3D cube wireframe on a 2D Canvas using simple projection.

## Features

- **Gimbal Lock Free**: Rotates smoothly around any arbitrary axis.
- **SLERP**: Demonstrates the constant-speed interpolation path across the 4D hypersphere surface.
- **3D Math**: Manual implementation of Quaternion multiplication, conjugation, and vector rotation without external libraries.

## Usage

1. Open `index.html`.
2. Adjust "Axis X/Y/Z" sliders to define a rotation axis.
3. Adjust "Angle" to define the rotation amount.
4. Click "Animate to Target".
5. Watch the cube smoothly rotate to the new orientation.
