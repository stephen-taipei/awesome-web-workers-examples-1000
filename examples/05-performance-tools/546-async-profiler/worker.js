self.onmessage = async function(e) {
    if (e.data.type === 'START') await runBenchmark(e.data.payload.param);
};

async function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    const timings = [];
    
    const profileAsync = async (name, fn) => {
        const start = performance.now();
        const result = await fn();
        timings.push({ name, duration: performance.now() - start });
        return result;
    };
    
    sendProgress(25, 'Async task 1...');
    await profileAsync('Promise.resolve', async () => {
        for (let i = 0; i < iterations; i++) await Promise.resolve(i);
    });
    
    sendProgress(50, 'Async task 2...');
    await profileAsync('Promise.all', async () => {
        for (let i = 0; i < iterations / 100; i++) {
            await Promise.all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
        }
    });
    
    sendProgress(75, 'Async task 3...');
    await profileAsync('Sequential', async () => {
        for (let i = 0; i < iterations / 10; i++) {
            await Promise.resolve(i);
        }
    });
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: Object.fromEntries(timings.map(t => [t.name, t.duration.toFixed(2) + ' ms'])) });
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
