// Pipeline Parallelism - Web Worker
// Each worker handles one stage of the pipeline

self.onmessage = function(e) {
    const { stage, stageIndex, item, pipelineType, stageDelay } = e.data;

    processStage(stage, stageIndex, item, pipelineType, stageDelay);
};

function processStage(stage, stageIndex, item, pipelineType, stageDelay) {
    const startTime = performance.now();

    // Simulate stage-specific processing
    let result;

    switch (pipelineType) {
        case 'imageProcess':
            result = processImageStage(stage, item, stageDelay);
            break;
        case 'dataETL':
            result = processETLStage(stage, item, stageDelay);
            break;
        case 'textProcess':
            result = processTextStage(stage, item, stageDelay);
            break;
        default:
            result = genericStageProcess(item, stageDelay);
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'stageComplete',
        stageIndex,
        stage,
        itemId: item.id,
        result: {
            ...item,
            ...result,
            [`stage${stageIndex}Complete`]: true
        },
        processingTime: endTime - startTime
    });
}

// Image Processing Pipeline Stages
function processImageStage(stage, item, delay) {
    switch (stage) {
        case 'load':
            // Simulate image loading/decoding
            simulateWork(delay);
            return {
                loaded: true,
                width: 1920,
                height: 1080,
                pixels: generatePixelData(100)
            };

        case 'resize':
            // Simulate image resizing
            simulateWork(delay);
            const scale = 0.5;
            return {
                resized: true,
                newWidth: Math.floor((item.width || 1920) * scale),
                newHeight: Math.floor((item.height || 1080) * scale),
                pixels: item.pixels ? item.pixels.map(p => Math.floor(p * 0.9)) : []
            };

        case 'filter':
            // Simulate applying filters (blur, sharpen, etc.)
            simulateWork(delay);
            const filtered = item.pixels ? item.pixels.map(p => {
                // Simple filter simulation
                return Math.floor((p + 10) * 1.1) % 256;
            }) : [];
            return {
                filtered: true,
                filterType: 'sharpen',
                pixels: filtered
            };

        case 'encode':
            // Simulate encoding/compression
            simulateWork(delay);
            const checksum = item.pixels ? item.pixels.reduce((a, b) => a + b, 0) : 0;
            return {
                encoded: true,
                format: 'jpeg',
                quality: 85,
                checksum: checksum % 10000
            };
    }
}

// Data ETL Pipeline Stages
function processETLStage(stage, item, delay) {
    switch (stage) {
        case 'extract':
            // Simulate data extraction
            simulateWork(delay);
            return {
                extracted: true,
                rawData: generateRawData(),
                recordCount: 100 + Math.floor(Math.random() * 50)
            };

        case 'validate':
            // Simulate validation
            simulateWork(delay);
            const validRecords = (item.recordCount || 100) - Math.floor(Math.random() * 5);
            return {
                validated: true,
                validRecords,
                invalidRecords: (item.recordCount || 100) - validRecords,
                validationRules: ['type', 'range', 'required']
            };

        case 'transform':
            // Simulate data transformation
            simulateWork(delay);
            return {
                transformed: true,
                transformations: ['normalize', 'aggregate', 'enrich'],
                outputRecords: item.validRecords || 95
            };

        case 'load':
            // Simulate loading to destination
            simulateWork(delay);
            return {
                loaded: true,
                destination: 'database',
                insertedRows: item.outputRecords || 95,
                duration: delay
            };
    }
}

// Text Processing Pipeline Stages
function processTextStage(stage, item, delay) {
    switch (stage) {
        case 'tokenize':
            // Simulate tokenization
            simulateWork(delay);
            const tokenCount = 50 + Math.floor(Math.random() * 100);
            return {
                tokenized: true,
                tokens: tokenCount,
                uniqueTokens: Math.floor(tokenCount * 0.7)
            };

        case 'normalize':
            // Simulate text normalization
            simulateWork(delay);
            return {
                normalized: true,
                operations: ['lowercase', 'remove_punctuation', 'trim'],
                cleanTokens: item.tokens || 50
            };

        case 'analyze':
            // Simulate analysis (sentiment, entities, etc.)
            simulateWork(delay);
            return {
                analyzed: true,
                sentiment: Math.random() > 0.5 ? 'positive' : 'neutral',
                confidence: (0.7 + Math.random() * 0.3).toFixed(2),
                entities: Math.floor(Math.random() * 5)
            };

        case 'index':
            // Simulate indexing
            simulateWork(delay);
            return {
                indexed: true,
                indexSize: (item.uniqueTokens || 35) * 4,
                searchable: true
            };
    }
}

function genericStageProcess(item, delay) {
    simulateWork(delay);
    return { processed: true };
}

function simulateWork(targetDelay) {
    // Simulate CPU work for the specified duration
    const start = performance.now();
    const iterations = Math.floor(targetDelay * 500); // Adjust multiplier for your system

    let result = 0;
    for (let i = 0; i < iterations; i++) {
        result += Math.sin(i) * Math.cos(i);
        result = Math.sqrt(Math.abs(result) + 1);
    }

    // If we finished too early, spin a bit more
    while (performance.now() - start < targetDelay * 0.9) {
        result += Math.random();
    }

    return result;
}

function generatePixelData(count) {
    const pixels = [];
    for (let i = 0; i < count; i++) {
        pixels.push(Math.floor(Math.random() * 256));
    }
    return pixels;
}

function generateRawData() {
    const data = [];
    for (let i = 0; i < 10; i++) {
        data.push({
            field1: Math.random() * 100,
            field2: String.fromCharCode(65 + Math.floor(Math.random() * 26)),
            field3: Date.now() + i
        });
    }
    return data;
}
