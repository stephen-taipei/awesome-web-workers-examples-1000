// 簡易 POS 詞典與規則
// 這是非常基礎的演示，真實的 POS Tagger (如 Brill Tagger, HMM, Neural Networks) 要複雜得多。

const LEXICON = {
    "the": "DT", "a": "DT", "an": "DT",
    "i": "PRP", "you": "PRP", "he": "PRP", "she": "PRP", "it": "PRP", "we": "PRP", "they": "PRP",
    "is": "VBZ", "am": "VBP", "are": "VBP", "was": "VBD", "were": "VBD",
    "have": "VB", "has": "VBZ", "had": "VBD",
    "and": "CC", "or": "CC", "but": "CC",
    "in": "IN", "on": "IN", "at": "IN", "of": "IN", "to": "TO",
    "dog": "NN", "cat": "NN", "fox": "NN", "man": "NN", "woman": "NN", "park": "NN",
    "quick": "JJ", "brown": "JJ", "lazy": "JJ", "good": "JJ", "bad": "JJ",
    "jumps": "VBZ", "jumped": "VBD", "run": "VB", "runs": "VBZ"
};

const SUFFIX_RULES = [
    { suffix: "ing", tag: "VBG" },
    { suffix: "ed", tag: "VBD" },
    { suffix: "ly", tag: "RB" },
    { suffix: "ness", tag: "NN" },
    { suffix: "ment", tag: "NN" },
    { suffix: "ion", tag: "NN" },
    { suffix: "ist", tag: "NN" },
    { suffix: "ize", tag: "VB" },
    { suffix: "able", tag: "JJ" },
    { suffix: "ive", tag: "JJ" },
    { suffix: "ous", tag: "JJ" },
    { suffix: "s", tag: "NNS" } // Plural noun or verb 3rd person, ambiguous but simplistic default
];

self.onmessage = function(e) {
    const { text } = e.data;
    const startTime = performance.now();

    // Simple tokenization by splitting on space (removing punctuation for simplicity in checking)
    // In a real app, tokenization is a complex step itself.
    const tokens = text.split(/\s+/);
    const taggedWords = [];

    for (let i = 0; i < tokens.length; i++) {
        let token = tokens[i];
        // Remove trailing punctuation
        const originalToken = token;
        token = token.replace(/[^\w\s]|_/g, "").toLowerCase();

        let tag = "NN"; // Default to Noun

        // 1. Check Lexicon
        if (LEXICON[token]) {
            tag = LEXICON[token];
        }
        // 2. Check Suffix Rules
        else if (/^\d+$/.test(token)) {
            tag = "CD"; // Cardinal Number
        }
        else {
            for (const rule of SUFFIX_RULES) {
                if (token.endsWith(rule.suffix)) {
                    tag = rule.tag;
                    break;
                }
            }

            // Heuristic for Capitalized words (Proper Noun)
            if (originalToken[0] === originalToken[0].toUpperCase() && /^[a-zA-Z]/.test(originalToken[0])) {
                // Not first word of sentence? Or assume all caps is NNP if unknown
                // This is a weak heuristic but works for names often
                if (i > 0) {
                    tag = "NNP";
                }
            }
        }

        taggedWords.push({ word: originalToken, tag: tag });
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        taggedWords: taggedWords,
        duration: endTime - startTime
    });
};
