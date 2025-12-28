/**
 * #640 SIMD-like Worker
 */
self.onmessage = function(e) {
    const { a, b } = e.data;
    const c = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) {
        c[i] = a[i] + b[i];
    }
    self.postMessage({ result: c });
};
