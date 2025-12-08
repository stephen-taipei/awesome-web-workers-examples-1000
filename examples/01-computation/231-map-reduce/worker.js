// Map-Reduce Worker

let workerId = null;

self.onmessage = function(e) {
    const { action, data } = e.data;

    switch (action) {
        case 'init':
            workerId = data.id;
            self.postMessage({ type: 'initialized', workerId });
            break;

        case 'map':
            executeMap(data);
            break;

        case 'reduce':
            executeReduce(data);
            break;
    }
};

function executeMap(data) {
    const { jobType, chunk, chunkIndex, totalChunks } = data;
    const startTime = performance.now();

    self.postMessage({
        type: 'mapStart',
        workerId,
        chunkIndex,
        itemCount: chunk.length
    });

    let mappedResults = [];

    // Apply map function based on job type
    switch (jobType) {
        case 'wordcount':
            mappedResults = mapWordCount(chunk);
            break;
        case 'sum':
            mappedResults = mapSum(chunk);
            break;
        case 'average':
            mappedResults = mapAverage(chunk);
            break;
        case 'frequency':
            mappedResults = mapFrequency(chunk);
            break;
        case 'inverted-index':
            mappedResults = mapInvertedIndex(chunk, chunkIndex);
            break;
    }

    const duration = performance.now() - startTime;

    self.postMessage({
        type: 'mapComplete',
        workerId,
        chunkIndex,
        totalChunks,
        results: mappedResults,
        duration,
        itemsProcessed: chunk.length
    });
}

function executeReduce(data) {
    const { jobType, key, values } = data;
    const startTime = performance.now();

    self.postMessage({
        type: 'reduceStart',
        workerId,
        key,
        valueCount: values.length
    });

    let reducedResult;

    // Apply reduce function based on job type
    switch (jobType) {
        case 'wordcount':
            reducedResult = reduceWordCount(key, values);
            break;
        case 'sum':
            reducedResult = reduceSum(key, values);
            break;
        case 'average':
            reducedResult = reduceAverage(key, values);
            break;
        case 'frequency':
            reducedResult = reduceFrequency(key, values);
            break;
        case 'inverted-index':
            reducedResult = reduceInvertedIndex(key, values);
            break;
    }

    const duration = performance.now() - startTime;

    self.postMessage({
        type: 'reduceComplete',
        workerId,
        key,
        result: reducedResult,
        duration
    });
}

// Map Functions

function mapWordCount(chunk) {
    const results = [];
    chunk.forEach(text => {
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 0);

        words.forEach(word => {
            results.push({ key: word, value: 1 });
        });
    });
    return results;
}

function mapSum(chunk) {
    const results = [];
    chunk.forEach(num => {
        results.push({ key: 'total', value: parseFloat(num) || 0 });
    });
    return results;
}

function mapAverage(chunk) {
    const results = [];
    chunk.forEach(num => {
        const val = parseFloat(num) || 0;
        results.push({ key: 'stats', value: { sum: val, count: 1 } });
    });
    return results;
}

function mapFrequency(chunk) {
    const results = [];
    chunk.forEach(text => {
        const chars = text.toLowerCase().replace(/\s/g, '').split('');
        chars.forEach(char => {
            results.push({ key: char, value: 1 });
        });
    });
    return results;
}

function mapInvertedIndex(chunk, docId) {
    const results = [];
    chunk.forEach((text, idx) => {
        const documentId = `doc_${docId}_${idx}`;
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 0);

        const uniqueWords = [...new Set(words)];
        uniqueWords.forEach(word => {
            results.push({ key: word, value: documentId });
        });
    });
    return results;
}

// Reduce Functions

function reduceWordCount(key, values) {
    return { key, count: values.reduce((a, b) => a + b, 0) };
}

function reduceSum(key, values) {
    return { key, sum: values.reduce((a, b) => a + b, 0) };
}

function reduceAverage(key, values) {
    const totalSum = values.reduce((acc, v) => acc + v.sum, 0);
    const totalCount = values.reduce((acc, v) => acc + v.count, 0);
    return { key, average: totalCount > 0 ? totalSum / totalCount : 0, count: totalCount };
}

function reduceFrequency(key, values) {
    return { key, count: values.reduce((a, b) => a + b, 0) };
}

function reduceInvertedIndex(key, values) {
    const uniqueDocs = [...new Set(values)];
    return { key, documents: uniqueDocs, docCount: uniqueDocs.length };
}
