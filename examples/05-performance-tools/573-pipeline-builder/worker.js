// Pipeline Builder Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();

        // Define pipeline stages
        const stages = [
            { name: 'Parse', fn: v => v * 2 },
            { name: 'Validate', fn: v => v > 10 ? v : null },
            { name: 'Transform', fn: v => v ? v + 5 : null },
            { name: 'Format', fn: v => v ? Math.round(v) : null }
        ];

        let passed = 0;
        let dropped = 0;

        for (let i = 0; i < param; i++) {
            let value = i;
            let valid = true;

            for (const stage of stages) {
                value = stage.fn(value);
                if (value === null) {
                    valid = false;
                    break;
                }
            }

            if (valid) passed++;
            else dropped++;

            if (i % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Pipeline stage processing` } });
            }
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Input': param, 'Passed': passed, 'Dropped': dropped, 'Stages': stages.length, 'Duration': duration } });
    }
};
