// 簡易中文詞典 (常用詞)
const DICTIONARY = new Set([
    "今天", "天氣", "真好", "我們", "一起", "去", "公園", "散步", "吧",
    "中國", "分詞", "算法", "測試", "效果", "如何", "這個", "是一個", "簡單", "例子",
    "最大", "匹配", "正向", "逆向", "中文", "處理", "Web", "Worker",
    "開發", "工程師", "代碼", "編寫", "非常", "有趣", "學習", "進步",
    "你好", "世界", "電腦", "科學", "技術", "人工智能", "數據", "分析"
    // 在實際應用中，這裡應該是一個包含數萬個詞彙的字典 Trie 樹
]);

self.onmessage = function(e) {
    const { text, algorithm } = e.data;
    const startTime = performance.now();

    let words = [];
    if (algorithm === 'fmm') {
        words = fmm(text);
    } else {
        words = bmm(text);
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        words: words,
        duration: endTime - startTime
    });
};

// 正向最大匹配 (Forward Maximum Matching)
function fmm(text) {
    const maxLen = 5; // 假設最大詞長
    const result = [];
    let pos = 0;

    while (pos < text.length) {
        let len = maxLen;
        let matched = false;

        while (len > 0) {
            if (pos + len > text.length) {
                len = text.length - pos;
            }

            const sub = text.substr(pos, len);
            if (DICTIONARY.has(sub) || len === 1) { // 詞典中有或者是單字
                result.push(sub);
                pos += len;
                matched = true;
                break;
            }
            len--;
        }

        if (!matched) {
            result.push(text[pos]);
            pos++;
        }
    }
    return result;
}

// 逆向最大匹配 (Backward Maximum Matching)
function bmm(text) {
    const maxLen = 5;
    const result = [];
    let pos = text.length;

    while (pos > 0) {
        let len = maxLen;
        let matched = false;

        while (len > 0) {
            if (pos - len < 0) {
                len = pos;
            }

            const sub = text.substr(pos - len, len);
            if (DICTIONARY.has(sub) || len === 1) {
                result.unshift(sub);
                pos -= len;
                matched = true;
                break;
            }
            len--;
        }

        if (!matched) {
            result.unshift(text[pos-1]);
            pos--;
        }
    }
    return result;
}
