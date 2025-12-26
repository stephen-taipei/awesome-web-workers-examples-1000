// Warp Deformation - Worker Thread

self.onmessage = function(e) {
    if (e.data.type === 'warp') {
        const { imageData, points, cols, rows } = e.data;
        const result = applyWarp(imageData, points, cols, rows);
        self.postMessage({
            type: 'result',
            ...result
        });
    }
};

function applyWarp(srcImageData, points, cols, rows) {
    const startTime = performance.now();

    const w = srcImageData.width;
    const h = srcImageData.height;
    const srcData = new Uint8ClampedArray(srcImageData.data);
    const destData = new Uint8ClampedArray(w * h * 4);

    // Grid warping using inverse mapping requires finding which quad in the deformed mesh contains the destination pixel.
    // This is hard for inverse mapping because the deformed mesh can be arbitrary.
    // Standard approach: Forward mapping (scan conversion) or Inverse mapping if we know the inverse transform.
    //
    // For mesh warping, typically:
    // 1. Iterate over destination grid cells (which are regular in parameter space U,V or Source Space?)
    //    Actually, usually the User deforms the Destination Grid (where pixels should end up) relative to Source Grid (regular).
    //    Or user deforms Source Grid (where to pick pixels from) relative to Destination Grid (regular).
    //
    // In this UI: The user moves points on the image. This usually represents the SOURCE coordinates that map to the DESTINATION's regular grid?
    // OR it represents where the pixels at that regular grid location MOVE TO.
    //
    // Let's assume the user is defining a mapping: Source (Regular Grid) -> Dest (Deformed Grid).
    // "Drag points on a mesh" usually implies: "This point on the image should move HERE".
    // So Points array contains Destination coordinates for the Regular Source Grid vertices.
    //
    // To fill the destination image (Inverse Mapping), we need: For every pixel (x,y) in Dest, find (u,v) in Source.
    // If we have Source -> Dest mapping defined by quads, we need to find which Dest Quad contains (x,y), then inverse interpolate to get (u,v).
    // Finding which quad contains (x,y) is expensive (point in polygon test for all quads).
    //
    // Alternative:
    // Treat the User's Grid as defining the SOURCE coordinates for a Regular Destination Grid?
    // "Pulling the grid" -> "Sampling from this location".
    // If I move a point to the right, I am saying "At this physical location on screen, sample from further right".
    // This effectively "pulls" the image content from right to left.
    //
    // If the Points represent Source Coordinates (u,v) for regular grid positions (x,y) on the canvas:
    // Then for any pixel (x,y) in Dest, we know which grid cell it falls into (easy, regular grid).
    // Then we interpolate the values of the Source Coordinates at the corners of that cell to get (u,v).
    // Then sample Source at (u,v).
    //
    // UI Interpretation:
    // User sees points on the image. Initial state: Points match image features.
    // User drags a point. The image should distort.
    // If I drag a point to the right, the image content should follow? That's Forward Mapping.
    // Or does the image content "stretch"?
    //
    // Let's implement the simpler Inverse Mapping Model:
    // The screen (Destination) is divided into a Regular Grid.
    // The User modifies the Source Coordinates associated with each Grid Node.
    // Wait, that's not intuitive. User wants to drag "Image features".
    //
    // Common warping implementation:
    // Define a Regular Source Grid (S) and a Deformed Destination Grid (D).
    // We want to map S -> D.
    // We iterate over the Destination Image.
    // But finding the source is hard.
    //
    // Trick: Iterate over the Destination Grid (which is deformed).
    // Break each quad into 2 triangles. Use affine texture mapping / barycentric coordinates to map pixels inside the deformed triangle back to the source triangle.
    // Since we are in software rendering (pixel manipulation), iterating over triangles is doable (rasterization).
    //
    // Let's try "Rasterize Deformed Mesh".
    // 1. Source Grid is Regular (0,0) to (1,1).
    // 2. Dest Grid is Points (user deformed).
    // 3. For each cell in grid:
    //    Split into 2 triangles (TL, TR, BL) and (TR, BR, BL).
    //    For each triangle in Dest Space:
    //      Compute bounding box in Dest Image.
    //      Iterate pixels y, x in bbox.
    //      Check if pixel inside triangle (Barycentric coords).
    //      If inside, interpolate Source UV using barycentric weights.
    //      Sample source image.

    // Grid cells
    const cellW = w / cols;
    const cellH = h / rows; // Not used for iteration, but conceptually source grid size? No, source grid is 0..1

    // Points are normalized 0..1. Multiply by w, h to get pixel coords.
    const destPoints = points.map(p => ({ x: p.x * w, y: p.y * h }));

    // Source Grid is regular 0..1
    // The Points array is row-major: index = y * (cols+1) + x

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Indices of 4 corners
            const iTL = r * (cols + 1) + c;
            const iTR = iTL + 1;
            const iBL = (r + 1) * (cols + 1) + c;
            const iBR = iBL + 1;

            // Dest vertices (pixels)
            const pTL = destPoints[iTL];
            const pTR = destPoints[iTR];
            const pBL = destPoints[iBL];
            const pBR = destPoints[iBR];

            // Source UVs (0..1)
            // Just calculated from column/row index
            const uvTL = { u: c / cols, v: r / rows };
            const uvTR = { u: (c + 1) / cols, v: r / rows };
            const uvBL = { u: c / cols, v: (r + 1) / rows };
            const uvBR = { u: (c + 1) / cols, v: (r + 1) / rows };

            // Triangle 1: TL, TR, BL
            rasterizeTriangle(srcData, w, h, destData,
                pTL, pTR, pBL,
                uvTL, uvTR, uvBL);

            // Triangle 2: TR, BR, BL
            rasterizeTriangle(srcData, w, h, destData,
                pTR, pBR, pBL,
                uvTR, uvBR, uvBL);
        }
    }

    return {
        imageData: destData.buffer,
        width: w,
        height: h,
        executionTime: performance.now() - startTime
    };
}

function rasterizeTriangle(src, srcW, srcH, dest, p1, p2, p3, uv1, uv2, uv3) {
    // Bounding box
    const minX = Math.floor(Math.max(0, Math.min(p1.x, p2.x, p3.x)));
    const maxX = Math.ceil(Math.min(srcW - 1, Math.max(p1.x, p2.x, p3.x)));
    const minY = Math.floor(Math.max(0, Math.min(p1.y, p2.y, p3.y)));
    const maxY = Math.ceil(Math.min(srcH - 1, Math.max(p1.y, p2.y, p3.y)));

    // Barycentric coordinates helpers
    const denom = (p2.y - p3.y) * (p1.x - p3.x) + (p3.x - p2.x) * (p1.y - p3.y);
    if (Math.abs(denom) < 0.0001) return; // Degenerate

    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            // Calculate Barycentric weights w1, w2, w3
            // P = w1*P1 + w2*P2 + w3*P3
            // w1 + w2 + w3 = 1

            const w1 = ((p2.y - p3.y) * (x - p3.x) + (p3.x - p2.x) * (y - p3.y)) / denom;
            const w2 = ((p3.y - p1.y) * (x - p3.x) + (p1.x - p3.x) * (y - p3.y)) / denom;
            const w3 = 1 - w1 - w2;

            if (w1 >= 0 && w2 >= 0 && w3 >= 0) {
                // Inside triangle
                // Interpolate UV
                const u = w1 * uv1.u + w2 * uv2.u + w3 * uv3.u;
                const v = w1 * uv1.v + w2 * uv2.v + w3 * uv3.v;

                // Sample Source (Bilinear)
                const srcX = u * (srcW - 1);
                const srcY = v * (srcH - 1);

                const sx0 = Math.floor(srcX);
                const sy0 = Math.floor(srcY);
                const sx1 = Math.min(srcW - 1, sx0 + 1);
                const sy1 = Math.min(srcH - 1, sy0 + 1);

                const dx = srcX - sx0;
                const dy = srcY - sy0;

                const i00 = (sy0 * srcW + sx0) * 4;
                const i10 = (sy0 * srcW + sx1) * 4;
                const i01 = (sy1 * srcW + sx0) * 4;
                const i11 = (sy1 * srcW + sx1) * 4;

                const destIdx = (y * srcW + x) * 4;

                // Optimization: If destIdx is written multiple times (overlaps), latest wins (Painter's algo order is arbitrary inside loop, but defined by triangle order)
                // Mesh triangles usually don't overlap, they tile.

                for (let c = 0; c < 4; c++) {
                    const top = src[i00 + c] * (1 - dx) + src[i10 + c] * dx;
                    const bot = src[i01 + c] * (1 - dx) + src[i11 + c] * dx;
                    dest[destIdx + c] = top * (1 - dy) + bot * dy;
                }
            }
        }
    }
}
