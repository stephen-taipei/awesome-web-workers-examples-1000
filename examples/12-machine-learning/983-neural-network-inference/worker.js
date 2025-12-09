// Neural Network Inference Benchmark Worker

let isRunning = false;

self.onmessage = async function(e) {
    const { command, hiddenLayers, batchSize } = e.data;

    if (command === 'start') {
        self.postMessage({ type: 'status', data: 'Generating Weights...' });

        // Architecture: Input(784) -> Hidden... -> Output(10)
        const architecture = [784, ...hiddenLayers, 10];
        const weights = [];
        const biases = [];

        // Initialize random weights
        for (let i = 0; i < architecture.length - 1; i++) {
            const inputDim = architecture[i];
            const outputDim = architecture[i + 1];
            
            // Flattened weight matrix: rows=outputDim, cols=inputDim
            // W[i] size: outputDim * inputDim
            const W = new Float32Array(outputDim * inputDim);
            const B = new Float32Array(outputDim);

            for (let j = 0; j < W.length; j++) W[j] = (Math.random() - 0.5) * 0.1;
            for (let j = 0; j < B.length; j++) B[j] = 0.0;

            weights.push({ data: W, rows: outputDim, cols: inputDim });
            biases.push(B);
        }

        // Generate dummy batch input
        // Size: inputDim * batchSize
        const inputDim = architecture[0];
        const inputBatch = new Float32Array(inputDim * batchSize);
        for(let i=0; i<inputBatch.length; i++) inputBatch[i] = Math.random();

        isRunning = true;
        self.postMessage({ type: 'status', data: 'Benchmarking...' });

        let totalSamples = 0;
        let lastReportTime = performance.now();
        let samplesSinceReport = 0;
        let latencySum = 0;
        let batchCount = 0;

        // Loop
        while (isRunning) {
            const start = performance.now();

            // Forward Pass
            let currentInput = inputBatch; // Shape: (InputDim, BatchSize) - Column vectors?
            // Usually Batch is Row-major: (BatchSize, InputDim).
            // Let's use (BatchSize, InputDim) for standard matmul: Output = Input * W^T + B
            // Or standard: Output^T = W * Input^T + B.
            // To keep it simple and cache friendly for JS, let's simulate layer by layer.
            // We'll treat input as one large flat array and do manual loop.
            
            // Current Input size changes per layer.
            let currentBatchSize = batchSize;
            let currentFeatures = inputDim;

            // Using a pre-allocated buffer for activations would be faster, but we allocate new for simplicity of code logic
            // In high-perf code, we would swap buffers.
            
            for (let i = 0; i < weights.length; i++) {
                const W = weights[i]; // output x input
                const B = biases[i];
                const outputFeatures = W.rows;
                
                const nextInput = new Float32Array(currentBatchSize * outputFeatures);

                // MatMul: Batch(N, In) * W^T(In, Out) -> Output(N, Out)
                // OR
                // W(Out, In) * Batch^T(In, N) -> Output^T(Out, N)
                
                // Let's implement: for each sample in batch...
                for (let b = 0; b < currentBatchSize; b++) {
                    const inputOffset = b * currentFeatures;
                    const outputOffset = b * outputFeatures;

                    for (let r = 0; r < outputFeatures; r++) {
                        let sum = B[r];
                        const wOffset = r * currentFeatures;
                        
                        // Vector dot product
                        for (let c = 0; c < currentFeatures; c++) {
                            sum += currentInput[inputOffset + c] * W.data[wOffset + c];
                        }
                        
                        // ReLU Activation (except last layer maybe? let's do ReLU everywhere for speed test)
                        if (i < weights.length - 1) {
                            nextInput[outputOffset + r] = Math.max(0, sum);
                        } else {
                            nextInput[outputOffset + r] = sum; // Linear last layer (Logits)
                        }
                    }
                }
                currentInput = nextInput;
                currentFeatures = outputFeatures;
            }

            const end = performance.now();
            const duration = end - start;
            
            latencySum += duration;
            batchCount++;
            samplesSinceReport += batchSize;
            totalSamples += batchSize;

            // Report every 500ms
            if (end - lastReportTime >= 500) {
                const elapsed = (end - lastReportTime) / 1000; // seconds
                const ips = samplesSinceReport / elapsed;
                const avgLat = latencySum / batchCount;

                self.postMessage({
                    type: 'result',
                    data: {
                        ips,
                        avgLatency: avgLat,
                        totalSamples
                    }
                });

                lastReportTime = end;
                samplesSinceReport = 0;
                latencySum = 0;
                batchCount = 0;
                
                // Yield to event loop to handle stop messages
                await new Promise(r => setTimeout(r, 0)); 
            }
        }
    }
};
