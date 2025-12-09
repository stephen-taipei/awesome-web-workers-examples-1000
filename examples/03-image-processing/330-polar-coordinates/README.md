# Polar Coordinates Transform

This example demonstrates how to transform images between Cartesian (Rectangular) and Polar coordinates using Web Workers.

## Transformations

### Rectilinear to Polar (Little Planet)
*   Also known as "Tiny Planet" or "Stereographic Projection".
*   Maps the bottom edge of the source image to the center of the destination circle.
*   Maps the top edge of the source image to the outer edge of the destination circle.
*   Maps the horizontal axis of the source to the angle in the destination.
*   This creates a circular image where the ground is in the center and the sky wraps around.

### Polar to Rectilinear (Unroll)
*   The inverse operation.
*   Takes a circular image (or something resembling one) and "unrolls" it into a rectangular strip.
*   Useful for unwrapping circular panoramic images or analyzing circular objects.

## Performance

Coordinate transformations involve complex mapping for every pixel. Offloading this to a Web Worker ensures smooth UI performance.
