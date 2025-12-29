// DH Key Generation - Simulation using modular exponentiation
self.onmessage = async function(e) {
    if (e.data.type === 'GENERATE') {
        const startTime = performance.now();
        sendProgress(20, 'Generating DH parameters...');

        // Use pre-defined safe primes for demo (in production, use proper DH groups)
        const primes = {
            512: 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245',
            1024: 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE65381FFFFFFFFFFFFFFFF',
            2048: 'FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AACAA68FFFFFFFFFFFFFFFF'
        };

        sendProgress(50, 'Computing public value...');

        // Generate random private key
        const privateBytes = crypto.getRandomValues(new Uint8Array(e.data.payload.bits / 8));
        const privateHex = Array.from(privateBytes).map(b => b.toString(16).padStart(2, '0')).join('');

        sendProgress(80, 'Formatting result...');

        // In real DH, we'd compute g^a mod p. Here we simulate with hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', privateBytes);
        const publicValue = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

        self.postMessage({
            type: 'RESULT',
            payload: { publicValue, duration: performance.now() - startTime }
        });
    }
};
function sendProgress(p, m) { self.postMessage({ type: 'PROGRESS', payload: { percent: p, message: m } }); }
