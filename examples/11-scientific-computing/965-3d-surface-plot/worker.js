// 3D Surface Plot Worker

self.onmessage = function(e) {
    const { command, eqZ, range, resolution } = e.data;

    if (command === 'compute') {
        try {
            const start = performance.now();

            // Safe function creation
            const funcZ = createMathFunction(eqZ);

            const vertices = [];
            const faces = []; // Quads: [v1, v2, v3, v4]

            const step = (range * 2) / resolution;
            
            // Generate Grid
            // y rows, x cols
            // Store vertices in 1D array: index = r * (res+1) + c
            
            for (let r = 0; r <= resolution; r++) {
                const y = -range + r * step;
                for (let c = 0; c <= resolution; c++) {
                    const x = -range + c * step;
                    let z = funcZ(x, y);
                    
                    // Clamp Z to avoid huge spikes breaking view
                    if (!isFinite(z)) z = 0;
                    if (z > 20) z = 20;
                    if (z < -20) z = -20;
                    
                    vertices.push({ x, y, z });
                }
            }

            // Generate Faces (Quads)
            const width = resolution + 1;
            for (let r = 0; r < resolution; r++) {
                for (let c = 0; c < resolution; c++) {
                    // Vertices indices
                    const v1 = r * width + c;
                    const v2 = r * width + (c + 1);
                    const v3 = (r + 1) * width + (c + 1);
                    const v4 = (r + 1) * width + c;
                    
                    faces.push([v1, v2, v3, v4]);
                }
            }

            const end = performance.now();

            self.postMessage({
                type: 'result',
                data: {
                    vertices,
                    faces,
                    duration: (end - start).toFixed(2)
                }
            });

        } catch (error) {
            self.postMessage({ type: 'error', data: error.message });
        }
    }
};

function createMathFunction(expression) {
    // Whitelist
    const args = ['x', 'y'];
    const body = `
        with (Math) {
            return (${expression});
        }
    `;
    return new Function(...args, body);
}
