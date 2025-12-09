// worker.js

self.onmessage = function(e) {
    const { imageData, threshold, invert } = e.data;

    try {
        const startTime = performance.now();
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        self.postMessage({ type: 'progress', data: 10 });

        // 1. Binarize
        const binary = new Uint8Array(width * height);

        for (let i = 0; i < width * height; i++) {
            const r = data[i*4];
            const g = data[i*4+1];
            const b = data[i*4+2];
            const gray = (r * 0.299 + g * 0.587 + b * 0.114);

            if (invert) {
                binary[i] = gray < threshold ? 1 : 0;
            } else {
                binary[i] = gray > threshold ? 1 : 0;
            }
        }

        self.postMessage({ type: 'progress', data: 30 });

        // 2. Find Contours using Moore-Neighbor Tracing
        // We need to keep track of visited pixels to avoid re-tracing same contour
        // Actually, Moore algorithm traces the boundary. We just need to mark starting points of boundaries.
        // Or mark pixels as visited.

        const contours = [];
        const visited = new Uint8Array(width * height); // 0 = unvisited, 1 = visited (part of boundary)

        // Scan for starting points
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;

                // Found a start point (must be 1 and not visited)
                if (binary[idx] === 1 && visited[idx] === 0) {
                    // Check if it's a boundary pixel (at least one 0 neighbor, or usually left neighbor is 0)
                    // Simplified: We assume we scan row by row. If we hit a 1 after a 0, it's an external boundary.
                    // But we might also be inside a hole.
                    // Let's implement a simple "Follow Border" approach.

                    // Simple logic: If current is 1 and previous (x-1) is 0, it's an outer border.
                    // Or if current is 1 and it hasn't been visited as a contour point?
                    // To properly handle this, we need to trace the contour and mark boundary pixels.

                    // Only start if it's a boundary candidate.
                    // For valid contour, we need an entry direction.
                    // Let's try to find an external boundary start: current=1, left=0.

                    // Note: This simple scan will find multiple contours.
                    // But if we mark visited pixels, we won't retrace.

                    const contour = traceContour(x, y, width, height, binary, visited);
                    if (contour.length > 5) { // Filter small noise
                        contours.push(contour);
                    }
                }
            }
            // Report progress every few rows
            if (y % 50 === 0) {
                 self.postMessage({ type: 'progress', data: 30 + (y / height) * 60 });
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                contours: contours,
                time: endTime - startTime,
                width: width,
                height: height
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

function traceContour(startX, startY, width, height, binary, visited) {
    const contour = [];
    const neighbors = [
        {x: 0, y: -1}, {x: 1, y: -1}, {x: 1, y: 0}, {x: 1, y: 1},
        {x: 0, y: 1}, {x: -1, y: 1}, {x: -1, y: 0}, {x: -1, y: -1}
    ];

    // Moore-Neighbor Tracing
    // 1. Find a starting pixel s.
    // 2. Backtrack to previous pixel p (from which we entered s).
    //    Since we scan left-to-right, entry is from left. So backtrack is (-1, 0).
    //    Actually, we just start checking neighbors from a specific direction.

    let x = startX;
    let y = startY;

    // Initial backtrack (from left)
    // entry direction index in neighbors array.
    // Directions: N(0), NE(1), E(2), SE(3), S(4), SW(5), W(6), NW(7)
    // Left is W(6). We start checking clockwise from the one after backtrack.
    // Backtrack is West. So we entered from West.
    // If we scan left to right, we found 1 at x, meaning x-1 was 0.
    // So "from" is West.

    let fromDir = 6; // West

    const startIdx = y * width + x;
    contour.push({x, y});
    visited[startIdx] = 1;

    let curX = x;
    let curY = y;
    let prevDir = fromDir;

    // Limit loop
    let steps = 0;
    const maxSteps = width * height;

    do {
        let foundNext = false;

        // Check neighbors clockwise starting from (backtrack direction + 1) ?
        // Standard Moore: If we entered P from direction D, start searching at D + 1 (clockwise)
        // or usually D-1 if we define neighbors differently.
        // Let's use: Start checking from `prevDir + 1` (treating prevDir as neighbor index)
        // Wait, backtracking means the empty pixel we came from.
        // Let's say entry is from 6 (W). We start looking at 7 (NW), 0 (N), 1 (NE)... until we find a 1.
        // The first 1 we find is the next boundary pixel.
        // The new "from" direction is the opposite of the direction we moved.

        // Actually, Moore tracing usually searches for the *first black pixel* clockwise.
        // The search starts from the white pixel we just came from.

        // Let's simplify:
        // neighbors indexed 0..7.
        // Start index = (prevDir + 2) % 8? No.
        // If we came from West (index 6), we check starting from NW?
        // Let's start checking from `prevDir`. Wait, `prevDir` points to the neighbor we came from (which is 0).
        // So we scan clockwise starting from `prevDir`. The first non-0 is our next pixel.

        // Start searching from (prevDir + 1) % 8?
        // Jacob's stopping criterion: re-enter start pixel in same direction?

        // Correction: Start searching from (entering_direction + 6) % 8 if we index clockwise?
        // Let's try standard approach:
        // We entered Current from Backtrack.
        // Start check at Backtrack + 1 (clockwise).

        let startSearchDir = (prevDir + 1) % 8; // Start clockwise from where we came
        // Usually, if we define directions as N=0, NE=1...,
        // If we entered from West (neighbor 6), that neighbor is 0.
        // We start checking at neighbor 7 (NW)? No, standard Moore checks B1, B2...
        // Let's just try: search clockwise from (prevDir + 2) % 8?
        // Actually, standard is: Start search at Backtrack (which is 0). Scan clockwise.
        // The first 1 is the next pixel.
        // But Backtrack is 0.

        // Let's implement:
        // `prevDir` is the index of the neighbor that is the "white pixel" we came from or are adjacent to.
        // Initially, we found S at (x,y) scanning from left. So (x-1, y) is 0. That is neighbor 6 (West).
        // So prevDir = 6.
        // We start checking neighbors starting at index 6?
        // Yes, start at 6 (West), then 7 (NW), 0 (N), 1 (NE)...
        // The first 1 we find is next pixel.

        let foundDir = -1;

        for (let i = 0; i < 8; i++) {
            const dir = (prevDir + i) % 8; // Clockwise
            const nx = curX + neighbors[dir].x;
            const ny = curY + neighbors[dir].y;

            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                if (binary[ny * width + nx] === 1) {
                    // Found next boundary pixel
                    curX = nx;
                    curY = ny;
                    foundDir = dir;
                    break;
                }
            }
        }

        if (foundDir !== -1) {
            contour.push({x: curX, y: curY});
            visited[curY * width + curX] = 1;

            // Update prevDir for next step.
            // The new backtrack direction is the direction pointing back to where we were?
            // No, in Moore tracing, the new start search direction is related to where we came from.
            // Specifically: (foundDir + 4) % 8 is the direction pointing BACK to old pixel.
            // The "white pixel" to start searching from is usually (foundDir + 4 + 1) % 8? No.
            // Standard algorithm: set backtrack = (foundDir + 4) % 8. Then start search from (backtrack + 1)?
            // Or simpler: Start search from (foundDir + 5) % 8 ? (Assuming 8-connectivity)

            // Let's use (foundDir + 4 + 2) % 8 ??
            // Actually (foundDir + 6) % 8 is going counter-clockwise 2 steps?
            // If foundDir is N(0), we moved North. Back is South(4).
            // We want to check West(6) next?
            // Correct logic: The new search start should be (foundDir + 5) % 8?
            // Let's assume (foundDir + 5) % 8. If foundDir=0 (N), we start checking 5 (SW)?
            // If we moved N, our left side is "outside".

            prevDir = (foundDir + 4 + 1) % 8; // Backtrack + 1 clockwise?
            // Let's try (foundDir + 5) % 8
            prevDir = (foundDir + 5) % 8; // Heuristic common in Moore

            foundNext = true;
        } else {
            // Isolated pixel
            break;
        }

        steps++;

    } while ((curX !== startX || curY !== startY) && steps < maxSteps);

    return contour;
}
