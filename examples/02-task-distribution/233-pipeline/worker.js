// Pipeline Pattern - Web Worker

self.onmessage = function(e) {
    const { itemId, stageIndex, pipelineType, data, delay } = e.data;
    const startTime = performance.now();

    let result;

    switch (pipelineType) {
        case 'imageProcess':
            result = processImageStage(stageIndex, data);
            break;
        case 'textAnalysis':
            result = processTextStage(stageIndex, data);
            break;
        case 'dataETL':
            result = processETLStage(stageIndex, data);
            break;
        case 'cryptoChain':
            result = processCryptoStage(stageIndex, data);
            break;
        default:
            result = data;
    }

    // Add artificial delay if specified
    if (delay > 0) {
        const start = performance.now();
        while (performance.now() - start < delay) {
            // Busy wait
        }
    }

    const processingTime = performance.now() - startTime;

    self.postMessage({
        itemId,
        stageIndex,
        result,
        processingTime
    });
};

// Image Processing Pipeline
function processImageStage(stage, data) {
    switch (stage) {
        case 0: // Decode & Resize
            return decodeAndResize(data);
        case 1: // Apply Filters
            return applyFilters(data);
        case 2: // Encode & Compress
            return encodeAndCompress(data);
        default:
            return data;
    }
}

function decodeAndResize(data) {
    // Simulate image decoding and resizing
    const result = new Array(Math.floor(data.length / 2));
    for (let i = 0; i < result.length; i++) {
        result[i] = (data[i * 2] + data[i * 2 + 1]) / 2;
    }
    return result;
}

function applyFilters(data) {
    // Simulate applying filters (blur, sharpen, etc.)
    const result = new Array(data.length);
    for (let i = 0; i < data.length; i++) {
        const prev = i > 0 ? data[i - 1] : data[i];
        const next = i < data.length - 1 ? data[i + 1] : data[i];
        result[i] = (prev + data[i] * 2 + next) / 4;
    }
    return result;
}

function encodeAndCompress(data) {
    // Simulate encoding and compression
    const result = [];
    for (let i = 0; i < data.length; i += 2) {
        const avg = i + 1 < data.length ? (data[i] + data[i + 1]) / 2 : data[i];
        result.push(Math.round(avg * 100) / 100);
    }
    return result;
}

// Text Analysis Pipeline
function processTextStage(stage, data) {
    switch (stage) {
        case 0: // Tokenize
            return tokenize(data);
        case 1: // Sentiment Analysis
            return analyzeSentiment(data);
        case 2: // Extract Keywords
            return extractKeywords(data);
        default:
            return data;
    }
}

function tokenize(data) {
    // Simulate tokenization
    const tokens = [];
    for (let i = 0; i < data.length; i++) {
        tokens.push({
            index: i,
            value: data[i],
            normalized: Math.abs(data[i] - 0.5)
        });
    }
    return tokens;
}

function analyzeSentiment(tokens) {
    // Simulate sentiment analysis
    let positiveCount = 0;
    let negativeCount = 0;

    for (const token of tokens) {
        if (token.value > 0.5) {
            positiveCount++;
            token.sentiment = 'positive';
        } else {
            negativeCount++;
            token.sentiment = 'negative';
        }
    }

    return {
        tokens,
        summary: {
            positive: positiveCount,
            negative: negativeCount,
            ratio: positiveCount / (positiveCount + negativeCount)
        }
    };
}

function extractKeywords(analysis) {
    // Simulate keyword extraction
    const { tokens, summary } = analysis;

    // Find "keywords" (high-value tokens)
    const keywords = tokens
        .filter(t => t.normalized > 0.3)
        .map(t => ({ index: t.index, score: t.normalized }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

    return {
        keywords,
        summary,
        keywordCount: keywords.length
    };
}

// Data ETL Pipeline
function processETLStage(stage, data) {
    switch (stage) {
        case 0: // Extract
            return extractData(data);
        case 1: // Transform
            return transformData(data);
        case 2: // Load
            return loadData(data);
        default:
            return data;
    }
}

function extractData(data) {
    // Simulate data extraction with validation
    const extracted = [];
    for (let i = 0; i < data.length; i++) {
        if (isValidData(data[i])) {
            extracted.push({
                id: i,
                raw: data[i],
                extracted: true
            });
        }
    }
    return extracted;
}

function isValidData(value) {
    return value !== undefined && value !== null && !isNaN(value);
}

function transformData(records) {
    // Simulate data transformation
    return records.map(record => ({
        ...record,
        normalized: (record.raw - 0) / (1 - 0),
        category: categorize(record.raw),
        transformed: true
    }));
}

function categorize(value) {
    if (value < 0.33) return 'low';
    if (value < 0.66) return 'medium';
    return 'high';
}

function loadData(records) {
    // Simulate data loading with aggregation
    const summary = {
        total: records.length,
        byCategory: { low: 0, medium: 0, high: 0 },
        average: 0
    };

    let sum = 0;
    for (const record of records) {
        summary.byCategory[record.category]++;
        sum += record.normalized;
    }

    summary.average = sum / records.length;

    return {
        records: records.slice(0, 10), // Sample
        summary,
        loaded: true
    };
}

// Crypto Chain Pipeline
function processCryptoStage(stage, data) {
    switch (stage) {
        case 0: // Hash
            return computeHash(data);
        case 1: // Encrypt
            return encryptData(data);
        case 2: // Sign
            return signData(data);
        default:
            return data;
    }
}

function computeHash(data) {
    // Simulate hash computation (simple checksum-like hash)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        hash = ((hash << 5) - hash + Math.floor(data[i] * 1000)) | 0;
    }

    return {
        originalLength: data.length,
        hash: Math.abs(hash).toString(16).padStart(8, '0'),
        data: data
    };
}

function encryptData(hashResult) {
    // Simulate encryption (XOR-like transformation)
    const key = parseInt(hashResult.hash.substring(0, 4), 16);
    const encrypted = hashResult.data.map((val, i) => {
        return ((Math.floor(val * 10000) ^ (key + i)) % 10000) / 10000;
    });

    return {
        ...hashResult,
        encrypted,
        encryptionKey: key.toString(16)
    };
}

function signData(encryptedResult) {
    // Simulate digital signature
    let signature = 0;
    for (let i = 0; i < encryptedResult.encrypted.length; i++) {
        signature = (signature * 31 + Math.floor(encryptedResult.encrypted[i] * 1000)) % 0xFFFFFFFF;
    }

    return {
        hash: encryptedResult.hash,
        encryptionKey: encryptedResult.encryptionKey,
        signature: signature.toString(16).padStart(8, '0'),
        verified: true,
        timestamp: Date.now()
    };
}
