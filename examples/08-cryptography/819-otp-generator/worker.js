self.onmessage = function(e) {
    if (e.data.type === 'GENERATE') {
        const { digits } = e.data.payload;
        const max = Math.pow(10, digits);
        const bytes = crypto.getRandomValues(new Uint32Array(1));
        const otp = (bytes[0] % max).toString().padStart(digits, '0');
        self.postMessage({ type: 'RESULT', payload: { otp }});
    }
};
