self.onmessage = function(e) {
    const { command, modelSize, weightsPerLayer, prettyPrint } = e.data;

    if (command === 'serialize') {
        try {
            const start = performance.now();

            // 1. Simulate Model Generation
            self.postMessage({ type: 'progress', data: 'Generating random model weights...' });
            
            const model = {
                architecture: 'Simulated Deep Neural Network',
                created: new Date().toISOString(),
                layers: []
            };

            for (let i = 0; i < modelSize; i++) {
                // Generate random weights
                const weights = new Float32Array(weightsPerLayer);
                for (let j = 0; j < weightsPerLayer; j++) {
                    weights[j] = Math.random() * 2 - 1; // -1 to 1
                }
                
                // We convert Float32Array to regular array for JSON serialization
                // In a real scenario, you might save as binary, but this is a JSON serialization demo.
                model.layers.push({
                    id: `layer_${i}`,
                    type: 'dense',
                    activation: 'relu',
                    weights: Array.from(weights) 
                });
            }

            // 2. Serialize
            self.postMessage({ type: 'progress', data: 'Serializing to JSON...' });
            const jsonString = JSON.stringify(model, null, prettyPrint ? 2 : 0);
            
            const end = performance.now();
            const duration = (end - start).toFixed(2);
            const size = new Blob([jsonString]).size;

            self.postMessage({
                type: 'success',
                data: jsonString,
                duration: duration,
                size: size
            });

        } catch (error) {
            self.postMessage({ type: 'error', data: error.message });
        }
    }
};
