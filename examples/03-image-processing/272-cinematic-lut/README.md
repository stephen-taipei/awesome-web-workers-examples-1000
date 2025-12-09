# Example 272: Cinematic LUT (3D Color Grading)

This example demonstrates applying 3D LUT (Look-Up Table) for cinematic color grading using Web Workers.

## Description

A 3D LUT (Look-Up Table) is a mathematical model that transforms input RGB colors to output RGB colors, commonly used in film and video production for color grading. This implementation:

- **Worker Thread**:
    1. Generates a 32x32x32 3D LUT based on the selected cinematic style
    2. Applies zone-based color grading (shadows, midtones, highlights)
    3. Uses trilinear interpolation for smooth color transitions
    4. Supports contrast adjustment via S-curve
    5. Provides saturation and black point controls

- **Main Thread**: Handles image loading, displays before/after comparison, manages UI state.

## LUT Styles Available

| Style | Description |
|-------|-------------|
| Cinematic Warm | Warm shadows, lifted blacks, orange highlights |
| Cinematic Cool | Cool blue tones, desaturated look |
| Teal & Orange | Classic blockbuster complementary color scheme |
| Vintage Film | Faded film look with warm, nostalgic tones |
| Film Noir | High contrast black & white with subtle blue tint |
| Blockbuster | Punchy, high saturation commercial look |

## Features

- **3D LUT Generation**: Creates lookup tables procedurally from style presets
- **Trilinear Interpolation**: Smooth color transitions between LUT entries
- **Zone-Based Grading**: Independent control of shadows, midtones, and highlights
- **Intensity Control**: Blend between original and graded image
- **Real-time Preview**: Side-by-side comparison of original and result

## Technical Details

- **LUT Size**: 32x32x32 (32,768 color entries)
- **Color Space**: sRGB
- **Interpolation**: Trilinear for quality color mapping
- **Performance Target**: 1080p image < 300ms

## Usage

1. Open `index.html`
2. Select an image file
3. Choose a LUT style from the dropdown
4. Adjust intensity slider (0-100%)
5. Click "Apply LUT" to process
6. Use "Reset Image" to restore original

## Algorithm

The 3D LUT color grading process:

1. **LUT Generation**: Build a 3D color cube where each point represents an input-to-output color mapping
2. **Zone Detection**: Calculate luminance and apply different color adjustments to shadows/midtones/highlights
3. **S-Curve Contrast**: Apply a sigmoid function for natural contrast enhancement
4. **Black Lift**: Raise the black point for a cinematic "milky" shadow look
5. **Trilinear Interpolation**: Sample the LUT with smooth blending between adjacent entries
