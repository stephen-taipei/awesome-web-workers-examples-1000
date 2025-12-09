self.onmessage = function(e) {
    const { text, mode, separator } = e.data;
    const startTime = performance.now();

    try {
        let result;
        if (mode === 'toHex') {
            // Text -> Hex
            // 這裡假設文本是 ASCII 或 Latin1。如果是 Unicode，需要決定編碼方式。
            // 為了簡單且與傳統 Hex 編輯器行為一致，我們這裡只轉換每個字元的 charCode (低 8 位或 16 位?)
            // 但更好的做法是先轉 UTF-8 Bytes 再轉 Hex (像 413 那樣)
            // 不過既然 413 已經做了 UTF-8，這裡我們做 "String char code to Hex"
            // 這樣對於 ASCII 字元是一樣的，但對於中文會顯示 Unicode code point 的 Hex

            // 修正：為了通用性，我們還是使用 UTF-8 編碼作為中間格式，這樣 Hex 代表的是位元組
            // 否則直接 charCodeAt() 對於 surrogate pairs 處理會很麻煩

            const encoder = new TextEncoder();
            const view = encoder.encode(text);

            result = Array.from(view)
                .map(b => b.toString(16).padStart(2, '0'))
                .join(separator);

        } else {
            // Hex -> Text
            // Remove all possible separators
            const cleanHex = text.replace(/[^0-9a-fA-F]/g, '');
            if (cleanHex.length % 2 !== 0) {
                throw new Error("Invalid Hex string length (must be even)");
            }

            const bytes = new Uint8Array(cleanHex.length / 2);
            for (let i = 0; i < cleanHex.length; i += 2) {
                bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
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
