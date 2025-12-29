self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'ROTATE') rotate(payload.text, payload.amount, payload.direction);
};

function rotate(text, amount, direction) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Rotating...' } });

    const len = text.length;
    if (len === 0) {
        self.postMessage({
            type: 'RESULT',
            payload: { original: text, result: text, steps: [text], amount, direction, duration: 0 }
        });
        return;
    }

    // Normalize rotation amount
    let normalizedAmount = amount % len;
    if (normalizedAmount < 0) normalizedAmount += len;

    // Convert right rotation to left rotation equivalent
    if (direction === 'right') {
        normalizedAmount = len - normalizedAmount;
    }

    // Generate steps for visualization (limit to reasonable amount)
    const steps = [text];
    let current = text;
    const stepsToShow = Math.min(normalizedAmount, 10);

    for (let i = 0; i < stepsToShow; i++) {
        current = current.slice(1) + current[0];
        steps.push(current);
    }

    // Final result
    const result = text.slice(normalizedAmount) + text.slice(0, normalizedAmount);

    if (normalizedAmount > stepsToShow) {
        steps.push('...');
        steps.push(result);
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            steps,
            amount,
            direction,
            duration: performance.now() - startTime
        }
    });
}
