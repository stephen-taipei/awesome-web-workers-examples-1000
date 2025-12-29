/**
 * Bcrypt Password Hashing - Web Worker
 * Simplified Bcrypt-like implementation for demonstration
 */

self.onmessage = async function(event) {
    const { type, payload } = event.data;

    if (type === 'HASH') {
        try {
            const startTime = performance.now();
            sendProgress(10, 'Generating salt...');

            const { password, cost } = payload;

            // Generate random salt
            const salt = generateSalt();

            sendProgress(20, `Hashing with cost factor ${cost}...`);

            // Perform bcrypt-like hashing
            const hash = await bcryptHash(password, salt, cost);

            sendProgress(90, 'Formatting result...');

            const duration = performance.now() - startTime;

            self.postMessage({
                type: 'RESULT',
                payload: {
                    hash: hash,
                    cost: cost,
                    duration: duration
                }
            });
        } catch (error) {
            self.postMessage({
                type: 'ERROR',
                payload: { message: error.message }
            });
        }
    } else if (type === 'VERIFY') {
        try {
            const { password, hash } = payload;
            sendProgress(50, 'Verifying...');

            const match = await bcryptVerify(password, hash);

            self.postMessage({
                type: 'VERIFY_RESULT',
                payload: { match }
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

// Generate random salt
function generateSalt() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return base64Encode(bytes);
}

// Bcrypt-like hash function
async function bcryptHash(password, salt, cost) {
    const encoder = new TextEncoder();
    const iterations = Math.pow(2, cost);

    // Use PBKDF2 as base for key stretching
    const passwordKey = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits']
    );

    // Derive using many iterations
    const derivedBits = await crypto.subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: encoder.encode(salt),
            iterations: iterations,
            hash: 'SHA-256'
        },
        passwordKey,
        192 // 24 bytes
    );

    const hashBytes = new Uint8Array(derivedBits);

    // Format as bcrypt-like string
    const costStr = cost.toString().padStart(2, '0');
    return `$2a$${costStr}$${salt}${base64Encode(hashBytes)}`;
}

// Verify password against hash
async function bcryptVerify(password, hash) {
    // Parse bcrypt hash
    const parts = hash.split('$');
    if (parts.length !== 4) return false;

    const cost = parseInt(parts[2]);
    const saltAndHash = parts[3];
    const salt = saltAndHash.substring(0, 22);

    // Rehash and compare
    const newHash = await bcryptHash(password, salt, cost);
    return hash === newHash;
}

// Base64 encoding (bcrypt-style)
function base64Encode(bytes) {
    const chars = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < bytes.length; i += 3) {
        const b1 = bytes[i];
        const b2 = bytes[i + 1] || 0;
        const b3 = bytes[i + 2] || 0;

        result += chars[b1 >> 2];
        result += chars[((b1 & 3) << 4) | (b2 >> 4)];
        if (i + 1 < bytes.length) {
            result += chars[((b2 & 15) << 2) | (b3 >> 6)];
        }
        if (i + 2 < bytes.length) {
            result += chars[b3 & 63];
        }
    }

    return result;
}
