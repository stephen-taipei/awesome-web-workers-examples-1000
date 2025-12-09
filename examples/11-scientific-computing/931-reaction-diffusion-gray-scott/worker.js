// Gray-Scott Reaction-Diffusion Worker

let gridA, gridB; // Chemical concentrations
let nextA, nextB;
let displayBuffer;
let width, height;
let feed = 0.055;
let kill = 0.062;
let speed = 8; // Iterations per frame
let isRunning = false;

// Diffusion rates
const dA = 1.0;
const dB = 0.5;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        width = e.data.width;
        height = e.data.height;
        feed = e.data.feed;
        kill = e.data.kill;
        speed = e.data.speed;
        
        const len = width * height;
        gridA = new Float32Array(len).fill(1.0); // A starts full
        gridB = new Float32Array(len).fill(0.0); // B starts empty
        nextA = new Float32Array(len);
        nextB = new Float32Array(len);
        displayBuffer = new Uint8ClampedArray(len * 4);
        
        // Seed center
        seed(width/2, height/2, 20);
        
        isRunning = true;
        loop();
    }
    else if (command === 'pause') isRunning = false;
    else if (command === 'resume') { isRunning = true; loop(); }
    else if (command === 'reset') {
        gridA.fill(1.0);
        gridB.fill(0.0);
        seed(width/2, height/2, 20);
    }
    else if (command === 'paint') {
        seed(e.data.x, e.data.y, e.data.radius);
    }
    else if (command === 'params') {
        feed = e.data.feed;
        kill = e.data.kill;
        speed = e.data.speed;
    }
    else if (command === 'next') {
        displayBuffer = new Uint8ClampedArray(e.data.buffer);
        loop();
    }
};

function seed(cx, cy, r) {
    for (let y = cy - r; y < cy + r; y++) {
        for (let x = cx - r; x < cx + r; x++) {
            if (x >= 0 && x < width && y >= 0 && y < height) {
                if ((x-cx)**2 + (y-cy)**2 < r*r) {
                    gridB[y * width + x] = 1.0; // Add chemical B
                }
            }
        }
    }
}

function loop() {
    if (!isRunning) return;

    for (let k = 0; k < speed; k++) {
        // Laplacian convolution
        // Weights: 
        // 0.05  0.2  0.05
        // 0.2   -1   0.2
        // 0.05  0.2  0.05
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = y * width + x;
                
                const a = gridA[i];
                const b = gridB[i];
                
                const lapA = 
                    (gridA[i-1] + gridA[i+1] + gridA[i-width] + gridA[i+width]) * 0.2 +
                    (gridA[i-width-1] + gridA[i-width+1] + gridA[i+width-1] + gridA[i+width+1]) * 0.05 -
                    a;
                    
                const lapB = 
                    (gridB[i-1] + gridB[i+1] + gridB[i-width] + gridB[i+width]) * 0.2 +
                    (gridB[i-width-1] + gridB[i-width+1] + gridB[i+width-1] + gridB[i+width+1]) * 0.05 -
                    b;
                
                // Reaction: 2B + A -> 3B
                const reaction = a * b * b;
                
                nextA[i] = a + (dA * lapA - reaction + feed * (1 - a));
                nextB[i] = b + (dB * lapB + reaction - (kill + feed) * b);
                
                // Clamp
                if (nextA[i] < 0) nextA[i] = 0; else if (nextA[i] > 1) nextA[i] = 1;
                if (nextB[i] < 0) nextB[i] = 0; else if (nextB[i] > 1) nextB[i] = 1;
            }
        }
        
        // Swap
        let temp = gridA; gridA = nextA; nextA = temp;
        temp = gridB; gridB = nextB; nextB = temp;
    }

    // Render
    for (let i = 0; i < width * height; i++) {
        const a = gridA[i];
        const b = gridB[i];
        const idx = i * 4;
        
        // Color map based on difference or B concentration
        // Simple: Black -> Green -> White
        const c = Math.floor((a - b) * 255);
        
        displayBuffer[idx] = 0;
        displayBuffer[idx+1] = c < 0 ? 0 : c; // Green
        displayBuffer[idx+2] = Math.floor(b * 255); // Blue tint
        displayBuffer[idx+3] = 255;
    }

    self.postMessage({
        type: 'frame',
        data: { buffer: displayBuffer.buffer }
    }, [displayBuffer.buffer]);
}
