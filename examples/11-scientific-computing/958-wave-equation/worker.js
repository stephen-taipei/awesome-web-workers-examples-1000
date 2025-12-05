// Wave Equation Solver (Finite Difference)

let buffer1; // Float32Array (Current state)
let buffer2; // Float32Array (Previous state)
let displayBuffer; // Uint8ClampedArray (RGBA output)
let width, height;
let damping = 0.99;
let frequency = 5; // Rain frequency
let isRunning = false;

self.onmessage = function(e) {
    const { command } = e.data;

    if (command === 'start') {
        width = e.data.width;
        height = e.data.height;
        damping = e.data.damping;
        frequency = e.data.frequency;
        
        // Init buffers
        const size = width * height;
        buffer1 = new Float32Array(size);
        buffer2 = new Float32Array(size);
        displayBuffer = new Uint8ClampedArray(size * 4); // RGBA
        
        isRunning = true;
        loop();
    } 
    else if (command === 'params') {
        if (e.data.damping !== undefined) damping = e.data.damping;
        if (e.data.frequency !== undefined) frequency = e.data.frequency;
    }
    else if (command === 'disturb') {
        disturb(e.data.x, e.data.y, 500);
    }
    else if (command === 'reset') {
        buffer1.fill(0);
        buffer2.fill(0);
    }
    else if (command === 'next') {
        // Receive display buffer back to reuse memory
        // e.data.buffer is the ArrayBuffer transferred back
        displayBuffer = new Uint8ClampedArray(e.data.buffer);
        loop();
    }
};

function disturb(x, y, strength) {
    if (x > 1 && x < width - 1 && y > 1 && y < height - 1) {
        const idx = y * width + x;
        buffer1[idx] = strength;
    }
}

function loop() {
    if (!isRunning) return;

    // Raindrops
    if (frequency > 0 && Math.random() < (frequency / 100)) {
        const x = Math.floor(Math.random() * (width - 2)) + 1;
        const y = Math.floor(Math.random() * (height - 2)) + 1;
        disturb(x, y, Math.random() * 300 + 200);
    }

    // Wave Equation Step
    for (let i = width; i < width * height - width; i++) {
        // Laplacian neighbors
        //   T
        // L C R
        //   B
        
        // New Value = (prev1[i-1] + prev1[i+1] + prev1[i-w] + prev1[i+w]) / 2 - prev2[i]
        // Damping applied to result
        
        const val = (
            buffer1[i - 1] + 
            buffer1[i + 1] + 
            buffer1[i - width] + 
            buffer1[i + width]
        ) / 2 - buffer2[i];
        
        buffer2[i] = val * damping;
    }

    // Swap buffers
    const temp = buffer1;
    buffer1 = buffer2;
    buffer2 = temp;

    // Render to pixels
    for (let i = 0; i < width * height; i++) {
        const val = buffer1[i];
        const idx = i * 4;
        
        // Color map: Blue water
        // Clamp val -255 to 255
        
        const intensity = Math.min(255, Math.max(0, val + 128));
        
        // RGB
        displayBuffer[idx] = 0; // R
        displayBuffer[idx+1] = Math.min(255, intensity + 50); // G
        displayBuffer[idx+2] = 255; // B
        displayBuffer[idx+3] = 255; // A
        
        // Highlights logic
        if (val > 0) {
             displayBuffer[idx] = val;
             displayBuffer[idx+1] = val + 50;
        }
    }

    // Transfer buffer to main thread
    self.postMessage({
        type: 'frame',
        data: { buffer: displayBuffer.buffer }
    }, [displayBuffer.buffer]);
}
