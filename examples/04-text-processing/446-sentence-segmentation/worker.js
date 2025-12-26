self.onmessage = function(e) {
    const { text } = e.data;
    const startTime = performance.now();

    // Advanced Sentence Segmentation Logic
    // Challenges:
    // 1. Abbreviations (Mr., Dr., etc.) ending in period.
    // 2. Ellipsis (...)
    // 3. Quotes enclosing punctuation.
    // 4. CJK fullwidth punctuation (。！？)

    // We can use a lookbehind/lookahead regex or a multi-pass approach.
    // Simple approach: split by terminators, then rejoin if needed.

    // Regex for terminators:
    // [.!?] for English
    // [。！？] for CJK

    // 1. Replace potential false positives temporarily? Or use a robust regex.
    // Golden rule: Terminating punctuation + space + capital letter (for English)
    // Or Terminating punctuation (for CJK)

    // Step 1: Split
    // ([.!?。！？]+) matches delimiters.
    // Keep delimiters in result using capture group.

    // This regex splits by punctuation that is followed by space or end of string, OR CJK punctuation.
    // (?<=[.!?])\s+(?=[A-Z]) is hard in JS regex without full lookbehind support in all envs (though modern JS supports it).

    // Let's assume standard modern browser support for Lookbehind since this is "Web Workers 1000".

    // Match:
    // 1. CJK terminators: [。！？]
    // 2. English terminators followed by space: [.!?](?=\s)

    // But we want to KEEP the delimiter with the previous sentence.

    let sentences = [];

    // Simple pass: replace delimiters with a special separator
    // Protect common abbreviations
    let safeText = text
        .replace(/(Mr|Mrs|Ms|Dr|Sr|Jr)\./g, "$1\u0000") // simple protection
        .replace(/\.\.\./g, "\u0001"); // protect ellipsis

    // Split logic
    // We want to split AFTER [.!?] if followed by whitespace, or after [。！？] anywhere.

    // Using replace to insert a unique separator
    const SEP = '|||SEP|||';

    safeText = safeText.replace(/([.!?]+)(\s+|$)|([。！？]+)/g, (match, p1, p2, p3) => {
        if (p3) {
            // CJK delimiter found
            return p3 + SEP; // Keep delimiter
        } else {
            // English delimiter found
            return p1 + (p2 || '') + SEP; // Keep delimiter and trailing space
        }
    });

    sentences = safeText.split(SEP);

    // Cleanup
    sentences = sentences.map(s =>
        s.replace(/\u0000/g, ".")
         .replace(/\u0001/g, "...")
         .trim()
    ).filter(s => s.length > 0);

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        sentences: sentences,
        time: endTime - startTime
    });
};
