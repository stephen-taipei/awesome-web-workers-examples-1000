self.onmessage = function(e) {
    if (e.data.type === 'GENERATE') {
        const { size, format } = e.data.payload;
        const bytes = crypto.getRandomValues(new Uint8Array(size));
        let output;
        if (format === 'hex') {
            output = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        } else if (format === 'base64') {
            output = btoa(String.fromCharCode(...bytes));
        } else {
            output = Array.from(bytes).join(', ');
        }
        self.postMessage({ type: 'RESULT', payload: { output, size }});
    }
};
