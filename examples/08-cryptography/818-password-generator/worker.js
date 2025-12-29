self.onmessage = function(e) {
    if (e.data.type === 'GENERATE') {
        const { length, uppercase, lowercase, numbers, symbols } = e.data.payload;
        let charset = '';
        if (uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (numbers) charset += '0123456789';
        if (symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';
        if (!charset) charset = 'abcdefghijklmnopqrstuvwxyz';

        const bytes = crypto.getRandomValues(new Uint8Array(length));
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset[bytes[i] % charset.length];
        }
        const entropy = length * Math.log2(charset.length);
        self.postMessage({ type: 'RESULT', payload: { password, entropy }});
    }
};
