self.onmessage = function(e) {
    const { iterations, precision } = e.data;

    // We want to measure compute, not memory.
    // So we use local variables.
    // To prevent optimization removing the loop, we must use the result.

    // A simple multiply-add loop: a = a * b + c
    // 2 FLOPS per iteration.

    let a = 1.1;
    let b = 1.000001;
    let c = 0.000001;

    // If precision is 32, we should use Float32Array to enforce 32-bit math?
    // JS numbers are always double precision (64-bit) unless inside TypedArrays or Math.fround.
    // Using Math.fround adds overhead (function call).
    // Using Float32Array read/write adds memory overhead.

    // For a pure JS benchmark:
    // "Float64" is natural JS number.
    // "Float32" simulation with Math.fround is closer to 32-bit behavior but slower due to conversion.

    const start = performance.now();

    if (precision === '32') {
        // Use Math.fround to simulate single precision
        // Note: This benchmarks the cost of fround + operations, which might be slower than 64-bit in JS engines.
        for (let i = 0; i < iterations; i++) {
            a = Math.fround(Math.fround(a * b) + c);
        }
    } else {
        // Standard double precision
        for (let i = 0; i < iterations; i++) {
            a = a * b + c;
        }
    }

    const end = performance.now();
    const duration = end - start;

    // FLOPS = (Operations) / (Time in seconds)
    // Operations = iterations * 2 (mul + add)
    const ops = iterations * 2;
    const gflops = (ops / 1e9) / (duration / 1000);

    self.postMessage({
        gflops,
        duration,
        result: a
    });
};
