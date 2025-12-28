/**
 * HMAC Generator - Web Worker
 * Uses Web Crypto API for HMAC generation
 */

self.onmessage = async function(event) {
    const { type, payload } = event.data;
    if (type === 'HMAC') {
        try {
            const startTime = performance.now();
            sendProgress(10, 'Preparing data...');

            const { message, key, algorithm } = payload;
            const encoder = new TextEncoder();

            sendProgress(30, 'Importing key...');

            // Import the key
            const cryptoKey = await crypto.subtle.importKey(
                'raw',
                encoder.encode(key),
                { name: 'HMAC', hash: algorithm },
                false,
                ['sign']
            );

            sendProgress(60, 'Computing HMAC...');

            // Sign the message
            const signature = await crypto.subtle.sign(
                'HMAC',
                cryptoKey,
                encoder.encode(message)
            );

            sendProgress(90, 'Formatting result...');

            // Convert to hex string
            const hmac = Array.from(new Uint8Array(signature))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const duration = performance.now() - startTime;

            self.postMessage({
                type: 'RESULT',
                payload: {
                    hmac: hmac,
                    algorithm: algorithm,
                    duration: duration
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
