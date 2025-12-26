self.onmessage = async function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    if (type === 'hash') {
        await crypto.subtle.digest('SHA-256', data);
    } else if (type === 'encrypt') {
        // AES-GCM
        const key = await crypto.subtle.generateKey(
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
        const iv = crypto.getRandomValues(new Uint8Array(12));
        await crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            data
        );
    }

    const endTime = performance.now();

    self.postMessage({
        duration: endTime - startTime,
        size: data.byteLength
    });
};
