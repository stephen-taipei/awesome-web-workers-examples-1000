# Example 273: HDR Effect (Local Contrast Enhancement)

This example demonstrates creating a pseudo-HDR effect through local contrast enhancement and tone mapping using Web Workers.

## Description

HDR (High Dynamic Range) imaging typically requires multiple exposures, but this implementation creates a pseudo-HDR effect from a single image by enhancing local contrast and applying tone mapping techniques.

- **Worker Thread**:
    1. Extracts the luminance channel from the image
    2. Computes local mean using optimized box blur with integral images
    3. Computes local standard deviation for contrast estimation
    4. Applies local contrast enhancement based on detail extraction
    5. Performs Reinhard-style tone mapping for natural HDR compression
    6. Applies gamma correction and saturation boost

- **Main Thread**: Handles image loading, displays before/after comparison, manages UI parameters.

## Parameters

| Parameter | Range | Description |
|-----------|-------|-------------|
| HDR Strength | 0-100% | Controls the intensity of local contrast enhancement |
| Local Radius | 5-50px | Size of the neighborhood for local analysis |
| Gamma | 0.5-2.0 | Brightness adjustment through gamma correction |
| Saturation | 50-200% | Color saturation multiplier |

## Features

- **Integral Image Optimization**: O(1) box blur regardless of radius size
- **Local Contrast Analysis**: Computes local mean and standard deviation efficiently
- **Tone Mapping**: Reinhard operator for natural HDR look without clipping
- **Color Preservation**: Maintains color ratios while adjusting luminance
- **Real-time Feedback**: Progress updates during processing

## Technical Details

- **Algorithm**: Local contrast enhancement with tone mapping
- **Blur Method**: Box blur via summed area table (integral image)
- **Tone Mapping**: Modified Reinhard operator
- **Performance Target**: 1080p image < 300ms

## Usage

1. Open `index.html`
2. Select an image file
3. Adjust HDR strength (0-100%)
4. Set local radius for detail size
5. Fine-tune gamma and saturation
6. Click "Apply HDR Effect" to process
7. Use "Reset Image" to restore original

## Algorithm Details

### Local Contrast Enhancement

The algorithm works by:

1. **Detail Extraction**: `detail = (pixel - local_mean) / local_std`
2. **Detail Boosting**: `boosted = detail * (1 + strength * 2)`
3. **Reconstruction**: `new_pixel = local_mean + boosted * local_std`

### Tone Mapping (Reinhard)

```
L_mapped = L / (1 + L/L_white)
```

This compresses the dynamic range while preserving local contrast and avoiding harsh clipping.

### Integral Image

The box blur uses integral images (summed area tables) for O(1) complexity:
- Build integral image in O(n) time
- Query any rectangular sum in O(1) time
- Enables large blur radii without performance penalty
