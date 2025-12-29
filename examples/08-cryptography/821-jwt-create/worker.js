self.onmessage = async function(e) {
    if (e.data.type === 'CREATE') {
        try {
            const { data, secret } = e.data.payload;
            const header = { alg: 'HS256', typ: 'JWT' };

            // Add standard claims
            data.iat = Math.floor(Date.now() / 1000);
            data.exp = data.iat + 3600; // 1 hour expiry

            const base64url = (str) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            const headerB64 = base64url(JSON.stringify(header));
            const payloadB64 = base64url(JSON.stringify(data));
            const message = headerB64 + '.' + payloadB64;

            // Create HMAC signature
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
            const signatureB64 = base64url(String.fromCharCode(...new Uint8Array(signature)));

            const jwt = message + '.' + signatureB64;
            self.postMessage({ type: 'RESULT', payload: { jwt }});
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { message: error.message }});
        }
    }
};
