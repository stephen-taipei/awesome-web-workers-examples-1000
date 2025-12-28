// Predictive Scheduler Worker
onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'START') {
        const { param } = payload;
        const startTime = performance.now();
        const history = [];
        let predictions = 0, correct = 0;
        for (let i = 0; i < param; i++) {
            const actual = Math.random();
            if (history.length >= 10) {
                const predicted = history.reduce((a, b) => a + b) / history.length;
                predictions++;
                if (Math.abs(predicted - actual) < 0.3) correct++;
            }
            history.push(actual);
            if (history.length > 10) history.shift();
            if (i % 100 === 0) postMessage({ type: 'PROGRESS', payload: { percent: Math.round(i / param * 100), message: `Accuracy: ${predictions ? (correct/predictions*100).toFixed(1) : 0}%` } });
        }
        const duration = performance.now() - startTime;
        postMessage({ type: 'RESULT', payload: { 'Total': param, 'Predictions': predictions, 'Correct': correct, 'Accuracy': (correct/predictions*100).toFixed(1) + '%', 'Duration': duration } });
    }
};