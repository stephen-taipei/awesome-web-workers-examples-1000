self.onmessage = function(e) {
    const { text, mode } = e.data;
    const startTime = performance.now();

    try {
        let result;
        if (mode === 'encode') {
            // Text -> UTF-8 Bytes (Hex)
            const encoder = new TextEncoder();
            const view = encoder.encode(text);

            // Convert to Hex string
            result = Array.from(view)
                .map(b => b.toString(16).padStart(2, '0'))
                .join(' ');
        } else {
            // Hex -> Text
            // Remove spaces and validate hex
            const cleanHex = text.replace(/\s+/g, '');
            if (cleanHex.length % 2 !== 0) {
                throw new Error("Invalid Hex string length");
            }

            const bytes = new Uint8Array(cleanHex.length / 2);
            for (let i = 0; i < cleanHex.length; i += 2) {
                const byte = parseInt(cleanHex.substr(i, 2), 16);
                if (isNaN(byte)) throw new Error(`Invalid hex character at index ${i}`);
                bytes[i / 2] = byte;
            }

            const decoder = new TextDecoder('utf-8');
            result = decoder.decode(bytes);
        }

        const endTime = performance.now();

        self.postMessage({
            result: result,
            time: endTime - startTime
        });
    } catch (err) {
        self.postMessage({
            error: err.toString(),
            time: performance.now() - startTime
        });
    }
};
