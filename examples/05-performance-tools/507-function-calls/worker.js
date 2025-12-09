self.onmessage = function(e) {
    const { iterations } = e.data;
    const results = [];
    let start, end;

    // 1. Direct Call
    function direct(a, b) { return a + b; }
    start = performance.now();
    for (let i = 0; i < iterations; i++) {
        direct(i, i);
    }
    end = performance.now();
    results.push({ name: 'Direct Call', time: end - start });
    self.postMessage({ type: 'progress', percent: 20 });

    // 2. Object Method
    const obj = { method(a, b) { return a + b; } };
    start = performance.now();
    for (let i = 0; i < iterations; i++) {
        obj.method(i, i);
    }
    end = performance.now();
    results.push({ name: 'Object Method', time: end - start });
    self.postMessage({ type: 'progress', percent: 40 });

    // 3. Closure (with context access)
    // Create a new closure inside loop would be too slow (allocation),
    // so we test calling a pre-defined closure.
    let x = 10;
    const closure = (a, b) => a + b + x;
    start = performance.now();
    for (let i = 0; i < iterations; i++) {
        closure(i, i);
    }
    end = performance.now();
    results.push({ name: 'Closure Access', time: end - start });
    self.postMessage({ type: 'progress', percent: 60 });

    // 4. Function.prototype.call
    start = performance.now();
    for (let i = 0; i < iterations; i++) {
        direct.call(null, i, i);
    }
    end = performance.now();
    results.push({ name: 'Function.call', time: end - start });
    self.postMessage({ type: 'progress', percent: 80 });

    // 5. Function.prototype.apply
    // Apply is generally slower due to array argument handling
    start = performance.now();
    const args = [1, 2]; // Reusing args array to avoid allocation noise
    for (let i = 0; i < iterations; i++) {
        args[0] = i; args[1] = i;
        direct.apply(null, args);
    }
    end = performance.now();
    results.push({ name: 'Function.apply', time: end - start });

    self.postMessage({ type: 'complete', results });
};
