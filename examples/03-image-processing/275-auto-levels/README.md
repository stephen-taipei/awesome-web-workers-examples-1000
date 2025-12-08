# Example 275: Auto Levels (Histogram Adjustment)

This example demonstrates automatic histogram-based level adjustment for optimal contrast and brightness using Web Workers.

## Description

Auto Levels automatically adjusts an image's tonal range by stretching the histogram to use the full 0-255 spectrum. This is useful for correcting low-contrast images or images with limited dynamic range.

- **Worker Thread**:
    1. Analyzes the image histogram (per-channel or luminance)
    2. Finds optimal input range with optional clipping
    3. Creates lookup tables for fast pixel remapping
    4. Applies gamma correction for fine-tuning
    5. Generates before/after histograms for visualization

- **Main Thread**: Handles image loading, displays results and histogram comparisons.

## Modes

| Mode | Description |
|------|-------------|
| Per-Channel RGB | Adjusts each color channel independently (may shift colors) |
| Luminance Only | Adjusts brightness while preserving color ratios |
| HSV Value | Adjusts brightness in HSV color space |

## Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| Clip Percentage | 0-5% | Percentage of darkest/brightest pixels to ignore |
| Gamma Correction | 0.5-2.0 | Adjust midtone brightness |

## Features

- **Multiple Modes**: Three different adjustment algorithms
- **Histogram Clipping**: Ignores outlier pixels for better range detection
- **Lookup Tables**: O(1) per-pixel remapping for performance
- **Gamma Correction**: Fine-tune midtone brightness
- **Histogram Visualization**: Before/after comparison
- **Real-time Statistics**: Shows input and output ranges

## Technical Details

- **Algorithm**: Histogram stretching with optional clipping
- **LUT Size**: 256 entries per channel
- **Performance Target**: 1080p image < 100ms

## Usage

1. Open `index.html`
2. Select an image file
3. Choose adjustment mode (RGB, Luminance, or HSV)
4. Adjust clip percentage (higher = ignores more outliers)
5. Fine-tune gamma if needed
6. Click "Apply Auto Levels" to process
7. Compare histograms before and after

## Algorithm Details

### Level Stretching Formula

```
output = (input - inputMin) / (inputMax - inputMin) * 255
```

### With Gamma Correction

```
normalized = (input - inputMin) / (inputMax - inputMin)
output = pow(normalized, 1/gamma) * 255
```

### Histogram Clipping

Instead of using the absolute min/max values, we ignore a percentage of the darkest and brightest pixels:

1. Sort pixels by intensity
2. Skip the darkest `clipPercent%` pixels
3. Skip the brightest `clipPercent%` pixels
4. Use the remaining range for stretching

This prevents outliers (very dark or very bright spots) from limiting the contrast enhancement.

### Mode Differences

**Per-Channel RGB:**
- Each channel stretched independently
- Maximum contrast but may introduce color shifts
- Best for: grayscale or well-balanced images

**Luminance Only:**
- Computes luminance: `L = 0.299R + 0.587G + 0.114B`
- Adjusts brightness while preserving color ratios
- Best for: preserving original color balance

**HSV Value:**
- Adjusts the V (value/brightness) channel
- Similar to luminance but uses max(R,G,B)
- Best for: saturated images

## Notes

- Higher clip percentages work better for images with specular highlights or deep shadows
- Gamma < 1.0 darkens midtones, > 1.0 brightens them
- Per-channel mode may cause color casts in images with unbalanced histograms
