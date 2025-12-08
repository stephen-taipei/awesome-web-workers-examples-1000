# Example 274: Image Dehazing (Dark Channel Prior)

This example demonstrates removing atmospheric haze from images using the Dark Channel Prior algorithm in Web Workers.

## Description

The Dark Channel Prior is a statistical observation that in most non-sky outdoor images, at least one color channel has very low intensity in local patches. This observation is used to estimate the haze transmission and atmospheric light, enabling scene radiance recovery.

Based on the paper: *"Single Image Haze Removal Using Dark Channel Prior"* by He, Sun, and Tang (CVPR 2009).

- **Worker Thread**:
    1. Computes the dark channel (minimum RGB in local patches)
    2. Estimates atmospheric light from brightest dark channel pixels
    3. Estimates transmission map from normalized dark channel
    4. Refines transmission using guided filter for edge preservation
    5. Recovers scene radiance using the haze imaging model

- **Main Thread**: Handles image loading, displays results and intermediate visualizations.

## The Haze Imaging Model

The haze imaging model is:
```
I(x) = J(x) * t(x) + A * (1 - t(x))
```

Where:
- `I(x)` = observed hazy image
- `J(x)` = scene radiance (what we want to recover)
- `t(x)` = transmission map (how much light reaches the camera)
- `A` = atmospheric light (global ambient light)

Recovery formula:
```
J(x) = (I(x) - A) / max(t(x), t0) + A
```

## Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| Patch Size | 5-31px | Size of local neighborhood for dark channel |
| Haze Removal (ω) | 50-100% | Percentage of haze to remove (lower keeps some haze for depth) |
| Minimum Transmission (t₀) | 0.01-0.30 | Prevents division by very small values |

## Features

- **Dark Channel Prior**: Exploits statistical properties of haze-free images
- **Atmospheric Light Estimation**: Finds global ambient illumination
- **Guided Filter**: Edge-preserving refinement of transmission map
- **Algorithm Visualization**: Shows dark channel and transmission maps
- **Real-time Progress**: Status updates during processing

## Technical Details

- **Algorithm**: Dark Channel Prior with Guided Filter refinement
- **Time Complexity**: O(n * r²) for basic, O(n) with optimizations
- **Performance Target**: 1080p image < 500ms

## Usage

1. Open `index.html`
2. Select a hazy outdoor image
3. Adjust patch size (larger = smoother but may lose detail)
4. Set haze removal percentage
5. Adjust minimum transmission to prevent artifacts
6. Click "Remove Haze" to process
7. View algorithm visualizations (dark channel, transmission)

## Algorithm Steps

### 1. Dark Channel
```
J_dark(x) = min_{c ∈ {R,G,B}} ( min_{y ∈ Ω(x)} J^c(y) )
```

### 2. Atmospheric Light
- Find top 0.1% brightest pixels in dark channel
- Select the pixel with highest intensity among them

### 3. Transmission Estimation
```
t(x) = 1 - ω * min_{c} ( min_{y ∈ Ω(x)} I^c(y) / A^c )
```

### 4. Guided Filter
Edge-preserving smoothing that uses the original image as a guide to refine the transmission map while preserving edges.

### 5. Scene Recovery
```
J(x) = (I(x) - A) / max(t(x), t₀) + A
```

## Notes

- Works best on outdoor hazy scenes
- Sky regions may have artifacts (dark channel prior doesn't hold)
- Larger patch sizes provide smoother results but may lose fine details
- Setting ω < 1 keeps some haze for depth perception
