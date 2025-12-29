self.onmessage = function(e) {
    if (e.data.type === 'DECODE') {
        try {
            let b64 = e.data.payload.base64;
            // Handle URL-safe base64
            b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4) b64 += '=';
            const decoded = atob(b64);
            const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));
            const text = new TextDecoder().decode(bytes);
            self.postMessage({ type: 'RESULT', payload: { decoded: text, size: bytes.length }});
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { message: 'Invalid Base64 string' }});
        }
    }
};
