/**
 * SHA-256 Hash Generator - Web Worker
 * Uses Web Crypto API for secure hashing
 */

self.onmessage = async function(event) {
    const { type, payload } = event.data;
    if (type === 'HASH') {
        try {
            const startTime = performance.now();
            sendProgress(10, 'Preparing data...');

            const text = payload.text;
            const encoder = new TextEncoder();
            const data = encoder.encode(text);

            sendProgress(30, 'Computing SHA-256...');

            // Use Web Crypto API
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = new Uint8Array(hashBuffer);

            sendProgress(90, 'Formatting result...');

            // Convert to hex string
            const hash = Array.from(hashArray)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const duration = performance.now() - startTime;

            self.postMessage({
                type: 'RESULT',
                payload: {
                    hash: hash,
                    duration: duration,
                    inputSize: data.length
                }
            });
        } catch (error) {
            self.postMessage({
                type: 'ERROR',
                payload: { message: error.message }
            });
        }
    }
};

function sendProgress(percent, message) {
    self.postMessage({ type: 'PROGRESS', payload: { percent, message } });
}
