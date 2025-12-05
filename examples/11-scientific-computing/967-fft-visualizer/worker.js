// Simple FFT Worker

self.onmessage = function(e) {
    const { command, f1, f2, noise, size } = e.data;

    if (command === 'analyze') {
        const start = performance.now();

        // 1. Generate Signal
        // Sampling rate fs
        const fs = 100; // Hertz
        const signal = new Float32Array(size);
        
        for (let i = 0; i < size; i++) {
            const t = i / fs;
            // Mix two sine waves + noise
            const val = Math.sin(2 * Math.PI * f1 * t) + 
                        0.5 * Math.sin(2 * Math.PI * f2 * t) + 
                        (Math.random() - 0.5) * noise * 2;
            signal[i] = val;
        }

        // 2. Compute FFT
        // Output: Magnitude spectrum
        const spectrum = fft(signal);

        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                signal,
                spectrum, // Only first half (Nyquist)
                duration: (end - start).toFixed(2)
            }
        });
    }
};

// Cooley-Tukey FFT algorithm (Radix-2, Recursive for simplicity)
// Returns magnitudes of the first N/2 bins
function fft(signal) {
    const n = signal.length;
    
    // Separate into real and imaginary
    const real = new Float32Array(signal);
    const imag = new Float32Array(n);
    
    // Bit reversal permutation could be done for iterative, 
    // but here we use a simple recursive implementation logic or a basic O(N^2) DFT for small N? 
    // No, N=2048 is too slow for O(N^2). We need O(N log N).
    
    // Iterative FFT
    // 1. Bit-reverse copy
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
        if (i < j) {
            const tr = real[i]; real[i] = real[j]; real[j] = tr;
            const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
        }
        let k = n >> 1;
        while (k <= j) {
            j -= k;
            k >>= 1;
        }
        j += k;
    }
    
    // 2. Butterfly updates
    // Loops: Stage -> Block -> Butterfly
    let l2 = 1;
    for (let l = 0; l < Math.log2(n); l++) {
        const l1 = l2;
        l2 <<= 1;
        const u1 = 1.0; 
        const u2 = 0.0;
        const theta = -Math.PI / l1;
        const w1 = Math.cos(theta);
        const w2 = Math.sin(theta);
        
        for (let j = 0; j < l1; j++) {
            // Compute twiddle factor for this j
            // Standard optimization: iterative calc of W
            // W^j = cos(j*theta) + i*sin(j*theta)
            const wr = Math.cos(j * theta);
            const wi = Math.sin(j * theta);
            
            for (let i = j; i < n; i += l2) {
                const i1 = i + l1;
                
                // Temp = W * Data[i1]
                const tr = wr * real[i1] - wi * imag[i1];
                const ti = wr * imag[i1] + wi * real[i1];
                
                real[i1] = real[i] - tr;
                imag[i1] = imag[i] - ti;
                real[i] += tr;
                imag[i] += ti;
            }
        }
    }
    
    // Calculate Magnitude: sqrt(r^2 + i^2)
    // Only need first N/2 bins (Symmetric for real input)
    const halfN = n / 2;
    const magnitudes = new Float32Array(halfN);
    
    for (let i = 0; i < halfN; i++) {
        magnitudes[i] = Math.sqrt(real[i]*real[i] + imag[i]*imag[i]);
    }
    
    return magnitudes;
}
