self.onmessage = function(e) {
    const qsString = e.data.qs;
    const startTime = performance.now();

    try {
        const result = parseQueryString(qsString);
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

function parseQueryString(str) {
    // 移除開頭的 ? (如果有的話)
    if (str.startsWith('?')) {
        str = str.substring(1);
    }

    // 處理多行輸入 (如果是批量模式)
    // 但這裡假設是單個大的 Query String 或換行分隔的多個參數
    // 我們將換行替換為 & 以支援多行輸入
    str = str.replace(/[\r\n]+/g, '&');

    const params = new URLSearchParams(str);
    const result = {};

    for (const [key, value] of params.entries()) {
        // 嘗試處理嵌套結構 user[name]=Alice
        if (key.includes('[') && key.endsWith(']')) {
            const parts = key.split(/\[|\]/).filter(p => p); // "user[name]" -> ["user", "name"]
            let current = result;

            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                if (!current[part]) {
                    current[part] = {};
                }
                current = current[part];
            }

            const lastPart = parts[parts.length - 1];
            current[lastPart] = value;
        } else {
            // 處理陣列 tags=a&tags=b
            if (result.hasOwnProperty(key)) {
                if (Array.isArray(result[key])) {
                    result[key].push(value);
                } else {
                    result[key] = [result[key], value];
                }
            } else {
                result[key] = value;
            }
        }
    }

    return result;
}
