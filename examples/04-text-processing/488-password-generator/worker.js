self.onmessage = function(e) {
    const { type, length, count, options } = e.data;

    if (type === 'generate') {
        const startTime = performance.now();

        // Build character set
        let charset = '';
        if (options.uppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (options.lowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (options.numbers) charset += '0123456789';
        if (options.symbols) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

        const charsetLength = charset.length;
        const passwords = [];

        // Calculate entropy per character
        const entropyPerChar = Math.log2(charsetLength);
        const totalEntropy = entropyPerChar * length;

        for (let i = 0; i < count; i++) {
            let password = '';

            // Generate random bytes
            const randomValues = new Uint32Array(length);
            // Use a simple PRNG since crypto.getRandomValues may not be available in all workers
            for (let j = 0; j < length; j++) {
                randomValues[j] = Math.floor(Math.random() * 0xFFFFFFFF);
            }

            for (let j = 0; j < length; j++) {
                const index = randomValues[j] % charsetLength;
                password += charset[index];
            }

            passwords.push(password);

            // Report progress every 100 passwords
            if (i % 100 === 0) {
                self.postMessage({
                    type: 'progress',
                    data: { progress: i / count }
                });
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                passwords: passwords,
                count: count,
                time: endTime - startTime,
                avgEntropy: totalEntropy
            }
        });
    }
};
