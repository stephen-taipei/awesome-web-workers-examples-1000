/**
 * Trie Builder Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROCESS':
            handleProcess(payload.data);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function handleProcess(data) {
    const startTime = performance.now();

    try {
        sendProgress(10, 'Processing...');
        const result = processData(data);
        sendProgress(90, 'Finalizing...');
        result.duration = performance.now() - startTime;
        sendResult(result);
    } catch (error) {
        sendError('Processing error: ' + error.message);
    }
}

function processData(data) {
    const words = Array.isArray(data) ? data.map(i => typeof i === 'string' ? i : i.name || String(i)) : [String(data)];
    const trie = { children: {}, isEnd: false };
    words.forEach(word => {
        let node = trie;
        for (const char of word.toLowerCase()) {
            if (!node.children[char]) node.children[char] = { children: {}, isEnd: false };
            node = node.children[char];
        }
        node.isEnd = true;
    });
    return { output: { trie, words: words.length }, stats: { count: words.length, processed: words.length } };
}

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}

function sendResult(data) {
    self.postMessage({ type: 'RESULT', payload: data });
}

function sendError(message) {
    self.postMessage({ type: 'ERROR', payload: { message } });
}
