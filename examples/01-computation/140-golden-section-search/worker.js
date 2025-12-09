self.onmessage = function(e) {
    const { funcStr, a, b, tol } = e.data;

    try {
        const f = new Function('x', 'return ' + funcStr);
        goldenSectionSearch(f, a, b, tol);
    } catch (err) {
        self.postMessage({ type: 'error', message: err.toString() });
    }
};

function goldenSectionSearch(f, a, b, tol) {
    const phi = (1 + Math.sqrt(5)) / 2;
    const resphi = 2 - phi; // 1/phi^2 approximation, actually (3-sqrt(5))/2 is 0.382... which is 2-phi

    // Initial points
    let x1 = a + resphi * (b - a);
    let x2 = b - resphi * (b - a);

    let f1 = f(x1);
    let f2 = f(x2);

    // Golden Section Search usually defines x1 < x2 or vice versa.
    // Standard: x1 = b - (b-a)/phi, x2 = a + (b-a)/phi
    // Let's stick to the definition:
    // x1 = b - (b-a)/phi
    // x2 = a + (b-a)/phi

    // Re-calculating using standard definition for clarity
    // invPhi = 0.618...
    // invPhi2 = 0.382...

    // Let's use the property that we keep one point.
    // Interval [a, b]
    // c = a + (1 - 1/phi)(b - a)
    // d = a + 1/phi(b - a)

    let c = b - (b - a) / phi;
    let d = a + (b - a) / phi;

    let fc = f(c);
    let fd = f(d);

    let iter = 0;
    const history = [];
    const startTime = performance.now();

    // Initial report
    self.postMessage({
        type: 'progress',
        percent: 0,
        iteration: 0,
        a, b
    });

    while (Math.abs(b - a) > tol) {
        iter++;

        history.push({
            iter,
            a, b,
            x1: c, x2: d,
            f1: fc, f2: fd
        });

        if (fc < fd) {
            // Minimum is in [a, d]
            b = d;
            d = c;
            fd = fc;
            c = b - (b - a) / phi;
            fc = f(c);
        } else {
            // Minimum is in [c, b]
            a = c;
            c = d;
            fc = fd;
            d = a + (b - a) / phi;
            fd = f(d);
        }

        // Report progress periodically to avoid flooding main thread
        // For very fast convergence, this might only fire a few times
        if (iter % 5 === 0 || Math.abs(b - a) < tol * 10) {
            self.postMessage({
                type: 'progress',
                percent: Math.max(0, Math.min(100, (1 - (Math.abs(b-a) / Math.abs(history[0].b - history[0].a))) * 100)),
                iteration: iter,
                a, b
            });
        }

        // Safety break
        if (iter > 10000) break;
    }

    const minX = (a + b) / 2;
    const minY = f(minX);
    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        minX,
        minY,
        iterations: iter,
        execTime: endTime - startTime,
        history
    });
}
