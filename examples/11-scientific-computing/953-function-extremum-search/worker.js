// Function Extremum Search Worker

let funcZ;
let range = 5; // -5 to 5

self.onmessage = async function(e) {
    const { command } = e.data;

    if (command === 'init') {
        try {
            const { eqZ, width, height, range: r } = e.data;
            range = r;
            funcZ = createMathFunction(eqZ);
            
            // Precompute heatmap for visualization
            const map = new Float32Array(width * height);
            let min = Infinity, max = -Infinity;
            
            for (let y = 0; y < height; y++) {
                const mapY = range - (y / height) * (2 * range); // Top down
                for (let x = 0; x < width; x++) {
                    const mapX = -range + (x / width) * (2 * range);
                    const val = funcZ(mapX, mapY);
                    
                    if (isFinite(val)) {
                        map[y * width + x] = val;
                        if (val < min) min = val;
                        if (val > max) max = val;
                    } else {
                        map[y * width + x] = 0; // Handle NaN
                    }
                }
            }
            
            self.postMessage({
                type: 'heatmap',
                data: { map, min, max } // Transfer?
            });
            
        } catch (err) {
            self.postMessage({ type: 'error', data: err.message });
        }
    } 
    else if (command === 'start') {
        const { startX, startY, type, lr } = e.data;
        
        let x = startX;
        let y = startY;
        const momentum = 0.8;
        let vx = 0, vy = 0;
        
        const h = 0.001; // Finite difference step
        
        for (let i = 0; i < 200; i++) {
            const z = funcZ(x, y);
            
            // Compute numerical gradient
            const dzdx = (funcZ(x + h, y) - z) / h;
            const dzdy = (funcZ(x, y + h) - z) / h;
            
            // Direction: -Grad for Min, +Grad for Max
            const sign = type === 'min' ? -1 : 1;
            
            // Update with simple momentum
            vx = momentum * vx + lr * sign * dzdx;
            vy = momentum * vy + lr * sign * dzdy;
            
            x += vx;
            y += vy;
            
            // Boundary check
            if (Math.abs(x) > range) x = Math.sign(x) * range;
            if (Math.abs(y) > range) y = Math.sign(y) * range;
            
            self.postMessage({
                type: 'step',
                data: {
                    pos: {x, y},
                    val: funcZ(x, y)
                }
            });
            
            await new Promise(r => setTimeout(r, 20)); // Slow down for viz
            
            if (Math.sqrt(vx*vx + vy*vy) < 0.0001) break; // Converged
        }
        
        self.postMessage({ type: 'done' });
    }
};

function createMathFunction(expression) {
    const args = ['x', 'y'];
    const body = `with (Math) { return (${expression}); }`;
    return new Function(...args, body);
}
