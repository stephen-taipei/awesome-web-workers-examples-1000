self.onmessage = async function(e) {
    if (e.data.type === 'VERIFY') {
        try {
            const { jwt, secret } = e.data.payload;
            const parts = jwt.split('.');
            if (parts.length !== 3) throw new Error('Invalid JWT format');

            const base64urlDecode = (str) => atob(str.replace(/-/g, '+').replace(/_/g, '/'));
            const base64url = (str) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

            const decoded = JSON.parse(base64urlDecode(parts[1]));
            const message = parts[0] + '.' + parts[1];

            // Verify signature
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
            const expectedSig = base64url(String.fromCharCode(...new Uint8Array(signature)));

            const valid = expectedSig === parts[2];
            self.postMessage({ type: 'RESULT', payload: { valid, decoded }});
        } catch (error) {
            self.postMessage({ type: 'RESULT', payload: { valid: false, decoded: { error: error.message }}});
        }
    }
};
