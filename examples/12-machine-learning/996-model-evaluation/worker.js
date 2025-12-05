self.onmessage = function(e) {
    const { command, sampleSize, tpr, fpr, prevalence } = e.data;

    if (command === 'evaluate') {
        const start = performance.now();

        self.postMessage({ type: 'status', data: 'Generating Data and Evaluating...' });

        let tp = 0; // True Positives
        let fn = 0; // False Negatives
        let fp = 0; // False Positives
        let tn = 0; // True Negatives

        for (let i = 0; i < sampleSize; i++) {
            const isPositiveActual = Math.random() < prevalence; // Determine actual label
            
            let isPositivePredicted;
            if (isPositiveActual) {
                // If actual is positive, prediction is positive with TPR probability
                isPositivePredicted = Math.random() < tpr;
            } else {
                // If actual is negative, prediction is positive with FPR probability
                isPositivePredicted = Math.random() < fpr;
            }

            if (isPositiveActual && isPositivePredicted) {
                tp++;
            } else if (isPositiveActual && !isPositivePredicted) {
                fn++;
            } else if (!isPositiveActual && isPositivePredicted) {
                fp++;
            } else { // !isPositiveActual && !isPositivePredicted
                tn++;
            }
        }

        // Calculate Metrics
        const accuracy = (tp + tn) / sampleSize;
        const precision = tp / (tp + fp) || 0; // Handle division by zero
        const recall = tp / (tp + fn) || 0;    // Handle division by zero
        const f1Score = (2 * precision * recall) / (precision + recall) || 0; // Handle division by zero

        // Matthews Correlation Coefficient (MCC)
        const numerator = (tp * tn) - (fp * fn);
        const denominator = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
        const mcc = denominator === 0 ? 0 : numerator / denominator;


        const end = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                tp, fn, fp, tn,
                accuracy,
                precision,
                recall,
                f1Score,
                mcc,
                duration: (end - start).toFixed(2)
            }
        });
    }
};
