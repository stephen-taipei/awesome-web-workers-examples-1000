self.onmessage = function(e) {
    if (e.data.type === 'ENCODE') {
        const { text, urlSafe } = e.data.payload;
        const bytes = new TextEncoder().encode(text);
        let encoded = btoa(String.fromCharCode(...bytes));
        if (urlSafe) {
            encoded = encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        }
        self.postMessage({ type: 'RESULT', payload: {
            encoded, inputSize: bytes.length, outputSize: encoded.length
        }});
    }
};
