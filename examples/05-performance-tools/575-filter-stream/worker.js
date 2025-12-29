// Filter Stream Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();

        let passed = 0;
        let filtered = 0;

        for (let i = 0; i < param; i++) {
            const value = Math.random() * 100;

            // Multi-stage filter
            const passesMin = value > 20;
            const passesMax = value < 80;
            const passesRange = passesMin && passesMax;

            if (passesRange) {
                passed++;
            } else {
                filtered++;
            }

            if (i % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Passed: ${passed}, Filtered: ${filtered}` } });
            }
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Passed': passed, 'Filtered': filtered, 'Pass Rate': (passed / param * 100).toFixed(1) + '%', 'Duration': duration } });
    }
};
