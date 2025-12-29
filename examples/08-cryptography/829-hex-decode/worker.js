self.onmessage = function(e) {
    if (e.data.type === 'DECODE') {
        try {
            const hex = e.data.payload.hex.replace(/\s+/g, '');
            if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
                throw new Error('Invalid hex string');
            }
            const bytes = new Uint8Array(hex.match(/.{2}/g).map(h => parseInt(h, 16)));
            const decoded = new TextDecoder().decode(bytes);
            self.postMessage({ type: 'RESULT', payload: { decoded, size: bytes.length }});
        } catch (error) {
            self.postMessage({ type: 'ERROR', payload: { message: error.message }});
        }
    }
};
