/**
 * PBKDF2 Key Derivation - Web Worker
 * Uses Web Crypto API for PBKDF2
 */

self.onmessage = async function(event) {
    const { type, payload } = event.data;
    if (type === 'DERIVE') {
        try {
            const startTime = performance.now();
            sendProgress(10, 'Preparing...');

            const { password, salt, iterations, keyLength, algorithm } = payload;
            const encoder = new TextEncoder();

            sendProgress(20, 'Importing password...');

            // Import password as key
            const passwordKey = await crypto.subtle.importKey(
                'raw',
                encoder.encode(password),
                'PBKDF2',
                false,
                ['deriveBits']
            );

            sendProgress(40, `Deriving key (${iterations.toLocaleString()} iterations)...`);

            // Derive bits using PBKDF2
            const derivedBits = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode(salt),
                    iterations: iterations,
                    hash: algorithm
                },
                passwordKey,
                keyLength
            );

            sendProgress(90, 'Formatting result...');

            // Convert to hex string
            const key = Array.from(new Uint8Array(derivedBits))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');

            const duration = performance.now() - startTime;

            self.postMessage({
                type: 'RESULT',
                payload: {
                    key: key,
                    iterations: iterations,
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
