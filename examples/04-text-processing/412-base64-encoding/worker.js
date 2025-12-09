self.onmessage = function(e) {
    const { text, mode } = e.data;
    const startTime = performance.now();

    try {
        let result;
        if (mode === 'encode') {
            // btoa 不支援 Unicode 字元，需要先編碼
            result = btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g,
                function toSolidBytes(match, p1) {
                    return String.fromCharCode('0x' + p1);
            }));
        } else {
            // decode
            result = decodeURIComponent(atob(text).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
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
