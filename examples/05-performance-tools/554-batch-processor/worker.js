self.onmessage = function(e) {
    if (e.data.type === 'START') runBenchmark(e.data.payload.param);
};

class BatchProcessor {
    constructor(batchSize, processFn) {
        this.batch = [];
        this.batchSize = batchSize;
        this.processFn = processFn;
        this.processed = 0;
    }
    add(item) {
        this.batch.push(item);
        if (this.batch.length >= this.batchSize) this.flush();
    }
    flush() {
        if (this.batch.length > 0) {
            this.processFn(this.batch);
            this.processed += this.batch.length;
            this.batch = [];
        }
    }
}

function runBenchmark(iterations) {
    sendProgress(0, 'Starting...');
    let batchCount = 0;
    
    sendProgress(25, 'Individual processing...');
    const individualStart = performance.now();
    for (let i = 0; i < iterations; i++) Math.sqrt(i);
    const individualTime = performance.now() - individualStart;
    
    sendProgress(60, 'Batch processing...');
    const processor = new BatchProcessor(100, (batch) => {
        batch.forEach(i => Math.sqrt(i));
        batchCount++;
    });
    const batchStart = performance.now();
    for (let i = 0; i < iterations; i++) processor.add(i);
    processor.flush();
    const batchTime = performance.now() - batchStart;
    
    sendProgress(100, 'Complete');
    self.postMessage({ type: 'RESULT', payload: {
        'Individual Time': individualTime.toFixed(2) + ' ms',
        'Batch Time': batchTime.toFixed(2) + ' ms',
        'Batches Processed': batchCount,
        'Items per Batch': 100
    }});
}

function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
