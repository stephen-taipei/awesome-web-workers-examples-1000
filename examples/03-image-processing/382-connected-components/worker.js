self.onmessage = function(e) {
    const { imageData, threshold } = e.data;
    const { width, height, data } = imageData;

    // Convert to binary
    const binary = new Uint8Array(width * height);
    for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        binary[i / 4] = gray > threshold ? 1 : 0;
    }

    // Two-pass connected component labeling
    const labels = new Int32Array(width * height);
    const parent = new Int32Array(width * height);
    let nextLabel = 1;

    // Initialize parent array
    for (let i = 0; i < parent.length; i++) {
        parent[i] = i;
    }

    // Find root with path compression
    function find(x) {
        if (parent[x] !== x) {
            parent[x] = find(parent[x]);
        }
        return parent[x];
    }

    // Union two labels
    function union(x, y) {
        const rootX = find(x);
        const rootY = find(y);
        if (rootX !== rootY) {
            parent[rootX] = rootY;
        }
    }

    // First pass
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = y * width + x;

            if (binary[idx] === 0) continue;

            const neighbors = [];

            // Check left neighbor
            if (x > 0 && labels[idx - 1] > 0) {
                neighbors.push(labels[idx - 1]);
            }

            // Check top neighbor
            if (y > 0 && labels[idx - width] > 0) {
                neighbors.push(labels[idx - width]);
            }

            // Check top-left neighbor (8-connectivity)
            if (x > 0 && y > 0 && labels[idx - width - 1] > 0) {
                neighbors.push(labels[idx - width - 1]);
            }

            // Check top-right neighbor (8-connectivity)
            if (x < width - 1 && y > 0 && labels[idx - width + 1] > 0) {
                neighbors.push(labels[idx - width + 1]);
            }

            if (neighbors.length === 0) {
                labels[idx] = nextLabel++;
            } else {
                const minLabel = Math.min(...neighbors);
                labels[idx] = minLabel;

                for (const n of neighbors) {
                    if (n !== minLabel) {
                        union(n, minLabel);
                    }
                }
            }
        }
    }

    // Second pass - flatten labels
    const labelMap = new Map();
    let numComponents = 0;

    for (let i = 0; i < labels.length; i++) {
        if (labels[i] > 0) {
            const root = find(labels[i]);
            if (!labelMap.has(root)) {
                labelMap.set(root, ++numComponents);
            }
            labels[i] = labelMap.get(root);
        }
    }

    // Generate random colors for each component
    const colors = [[0, 0, 0]]; // Background
    for (let i = 1; i <= numComponents; i++) {
        colors.push([
            Math.floor(Math.random() * 200) + 55,
            Math.floor(Math.random() * 200) + 55,
            Math.floor(Math.random() * 200) + 55
        ]);
    }

    // Create output image
    const output = new Uint8ClampedArray(data.length);
    for (let i = 0; i < labels.length; i++) {
        const color = colors[labels[i]];
        output[i * 4] = color[0];
        output[i * 4 + 1] = color[1];
        output[i * 4 + 2] = color[2];
        output[i * 4 + 3] = 255;
    }

    self.postMessage({
        imageData: new ImageData(output, width, height),
        components: numComponents
    });
};
