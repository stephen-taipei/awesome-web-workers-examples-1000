self.onmessage = function(e) {
    if (e.data.type === 'ENCODE') {
        const { text, uppercase, separator } = e.data.payload;
        const bytes = new TextEncoder().encode(text);
        let hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0'));
        if (uppercase) hex = hex.map(h => h.toUpperCase());
        const encoded = hex.join(separator ? ' ' : '');
        self.postMessage({ type: 'RESULT', payload: { encoded, inputSize: bytes.length }});
    }
};
