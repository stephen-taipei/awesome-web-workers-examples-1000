self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'CALCULATE') calculate(payload.text1, payload.text2);
};

function calculate(text1, text2) {
    const startTime = performance.now();

    if (text1.length !== text2.length) {
        self.postMessage({
            type: 'ERROR',
            payload: { message: `Strings must have equal length. String 1: ${text1.length}, String 2: ${text2.length}` }
        });
        return;
    }

    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Calculating...' } });

    let distance = 0;
    const comparison = [];
    const diffPositions = [];

    for (let i = 0; i < text1.length; i++) {
        const match = text1[i] === text2[i];
        comparison.push({
            char1: text1[i],
            char2: text2[i],
            match
        });

        if (!match) {
            distance++;
            diffPositions.push(i);
        }
    }

    const similarity = text1.length === 0 ? 1 : 1 - (distance / text1.length);

    self.postMessage({
        type: 'RESULT',
        payload: {
            text1,
            text2,
            distance,
            similarity,
            comparison,
            diffPositions,
            duration: performance.now() - startTime
        }
    });
}
