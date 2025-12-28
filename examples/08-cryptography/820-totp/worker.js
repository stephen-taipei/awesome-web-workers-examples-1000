self.onmessage = async function(e) {
    if (e.data.type === 'GENERATE') {
        const secret = e.data.payload.secret;
        const timeStep = 30;
        const counter = Math.floor(Date.now() / 1000 / timeStep);
        const remaining = timeStep - (Math.floor(Date.now() / 1000) % timeStep);

        // Base32 decode
        const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        for (const c of secret.toUpperCase().replace(/=+$/, '')) {
            const val = base32Chars.indexOf(c);
            if (val >= 0) bits += val.toString(2).padStart(5, '0');
        }
        const keyBytes = new Uint8Array(Math.floor(bits.length / 8));
        for (let i = 0; i < keyBytes.length; i++) {
            keyBytes[i] = parseInt(bits.substr(i * 8, 8), 2);
        }

        // Counter to bytes (big-endian 8 bytes)
        const counterBytes = new Uint8Array(8);
        let c = counter;
        for (let i = 7; i >= 0; i--) { counterBytes[i] = c & 0xff; c = Math.floor(c / 256); }

        // HMAC-SHA1
        const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
        const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBytes));

        // Dynamic truncation
        const offset = hmac[19] & 0xf;
        const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset+1] << 16 | hmac[offset+2] << 8 | hmac[offset+3]) % 1000000;

        self.postMessage({ type: 'RESULT', payload: { totp: code.toString().padStart(6, '0'), remaining }});
    }
};
