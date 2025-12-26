# Warp Deformation

A Web Worker example for applying mesh-based warp deformation to images.

## Description
Allows users to distort an image by manipulating a control grid. The worker performs triangle rasterization and texture mapping (using barycentric coordinates and bilinear interpolation) to warp the image based on the deformed mesh.

## Key Features
- **Mesh Grid**: Interactive grid control points.
- **Triangle Rasterization**: Splits grid cells into triangles for rendering.
- **Barycentric Interpolation**: Accurate mapping from destination pixels back to source texture coordinates.

## Usage
1. Upload an image.
2. Adjust the Grid Size slider if needed.
3. Drag the green control points to deform the mesh.
4. Click "Render Warp" to generate the high-quality result.
