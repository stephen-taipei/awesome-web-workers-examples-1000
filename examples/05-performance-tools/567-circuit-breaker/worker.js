// Circuit Breaker Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();

        let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
        let failures = 0;
        let successes = 0;
        let trips = 0;
        const threshold = 5;

        for (let i = 0; i < param; i++) {
            const success = Math.random() > 0.3;

            if (state === 'CLOSED') {
                if (success) {
                    successes++;
                    failures = 0;
                } else {
                    failures++;
                    if (failures >= threshold) {
                        state = 'OPEN';
                        trips++;
                    }
                }
            } else if (state === 'OPEN') {
                // Wait period (simulate with random)
                if (Math.random() > 0.8) {
                    state = 'HALF_OPEN';
                }
            } else if (state === 'HALF_OPEN') {
                if (success) {
                    state = 'CLOSED';
                    failures = 0;
                    successes++;
                } else {
                    state = 'OPEN';
                    trips++;
                }
            }

            if (i % 100 === 0) {
                postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `State: ${state}` } });
            }
        }

        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total Calls': param, 'Successes': successes, 'Circuit Trips': trips, 'Final State': state, 'Duration': duration } });
    }
};
