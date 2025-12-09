// 簡易 NER 規則
// 實際 NER 通常使用機器學習模型 (CRF, LSTM, Transformer)

const RULES = [
    {
        type: 'EMAIL',
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
    },
    {
        type: 'DATE',
        regex: /\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b|\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi
    },
    {
        type: 'PHONE',
        regex: /\b(\+\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g
    },
    // 非常基礎的人名/地名啟發式規則（尋找連續的大寫單詞，排除句首）
    // 這只是一個演示，準確率很低
    {
        type: 'PROPER_NOUN', // Maybe Person or Location
        regex: /(?<!^|\. |\? |\! )\b([A-Z][a-z]+)( [A-Z][a-z]+)*\b/g
    }
];

// 一些常見的 Location 關鍵詞用於區分
const LOCATION_KEYWORDS = new Set(['New York', 'London', 'Paris', 'Tokyo', 'USA', 'UK', 'China', 'Street', 'Avenue', 'Park']);

self.onmessage = function(e) {
    const { text } = e.data;
    const startTime = performance.now();

    // 我們需要將文本轉換為帶有標籤的 HTML
    // 為了避免標籤重疊，一種簡單的方法是先找到所有匹配項，然後按位置排序，替換文本
    // 但替換會改變索引。
    // 更好的方法：構建一個區間列表，然後重建字串。

    let matches = [];

    for (const rule of RULES) {
        let match;
        while ((match = rule.regex.exec(text)) !== null) {
            let type = rule.type;
            const content = match[0];

            // Refine PROPER_NOUN
            if (type === 'PROPER_NOUN') {
                if (LOCATION_KEYWORDS.has(content) || content.includes('Street') || content.includes('Avenue')) {
                    type = 'LOCATION';
                } else {
                    type = 'PERSON'; // Guess
                }
            }

            matches.push({
                start: match.index,
                end: match.index + content.length,
                type: type,
                content: content
            });
        }
    }

    // Sort matches by start position
    matches.sort((a, b) => a.start - b.start);

    // Remove overlaps (prioritize earlier or longer matches)
    // Simple logic: if overlap, skip the second one
    const uniqueMatches = [];
    if (matches.length > 0) {
        uniqueMatches.push(matches[0]);
        for (let i = 1; i < matches.length; i++) {
            const prev = uniqueMatches[uniqueMatches.length - 1];
            const curr = matches[i];

            if (curr.start >= prev.end) {
                uniqueMatches.push(curr);
            }
        }
    }

    // Build HTML
    let resultHtml = '';
    let lastIndex = 0;

    for (const m of uniqueMatches) {
        // Add text before match
        resultHtml += escapeHtml(text.substring(lastIndex, m.start));

        // Add tagged match
        resultHtml += `<span class="entity entity-${m.type}" data-type="${m.type}">${escapeHtml(m.content)}</span>`;

        lastIndex = m.end;
    }

    // Add remaining text
    resultHtml += escapeHtml(text.substring(lastIndex));

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        html: resultHtml,
        count: uniqueMatches.length,
        duration: endTime - startTime
    });
};

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
