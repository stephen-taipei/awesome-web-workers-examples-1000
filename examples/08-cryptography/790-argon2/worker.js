/**
 * Argon2 Password Hashing - Web Worker
 * Simplified Argon2-like simulation using PBKDF2
 */

self.onmessage = async function(event) {
    const { type, payload } = event.data;

    if (type === 'HASH') {
        try {
            const startTime = performance.now();
            sendProgress(10, 'Initializing...');

            const { password, salt, memory, iterations, parallelism, hashLen } = payload;

            sendProgress(20, 'Processing memory blocks...');

            // Simulate Argon2 using iterative hashing
            const hash = await argon2Simulate(password, salt, memory, iterations, parallelism, hashLen);

            sendProgress(90, 'Formatting result...');

            const duration = performance.now() - startTime;

            self.postMessage({
                type: 'RESULT',
                payload: {
                    hash: hash,
                    memory: memory,
                    iterations: iterations,
                    parallelism: parallelism,
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

// Simulate Argon2 using multiple rounds of PBKDF2
async function argon2Simulate(password, salt, memory, iterations, parallelism, hashLen) {
    const encoder = new TextEncoder();

    // Calculate iterations based on memory cost (simplified)
    const memoryBlocks = Math.floor(memory / 1024);
    const totalIterations = iterations * memoryBlocks;

    // Import password key
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Initial hash
    let currentSalt = encoder.encode(salt);

    // Simulate memory-hard iterations
    for (let i = 0; i < iterations; i++) {
        sendProgress(20 + Math.floor((i / iterations) * 60), `Iteration ${i + 1}/${iterations}...`);

        const bits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: currentSalt,
                iterations: memoryBlocks,
                hash: 'SHA-512'
            },
            passwordKey,
            512
        );

        currentSalt = new Uint8Array(bits);
    }

    // Final key derivation
    const finalBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: currentSalt,
            iterations: 1,
            hash: 'SHA-256'
        },
        passwordKey,
        hashLen * 8
    );

    // Convert to hex
    return Array.from(new Uint8Array(finalBits))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}
