// Grammar rules
const grammarRules = [
    {
        pattern: /\b(their|there|they're)\s+(going|coming|doing|making|taking)\b/gi,
        check: (match) => match[1].toLowerCase() === 'their' ? "their" : null,
        message: "Possible confusion: 'their' (possessive) vs 'they're' (they are)",
        suggestion: "they're",
        type: 'grammar'
    },
    {
        pattern: /\b(me|him|her|them)\s+and\s+(i|me|him|her|them|he|she|we|they)\b/gi,
        check: () => true,
        message: "Consider rephrasing: put 'I' or other pronouns first",
        suggestion: "Rephrase to: 'X and I' or 'X and me' depending on context",
        type: 'grammar'
    },
    {
        pattern: /\bthe\s+team\s+(are|were)\b/gi,
        check: () => true,
        message: "Subject-verb agreement: 'team' is singular in American English",
        suggestion: "the team is/was",
        type: 'grammar'
    },
    {
        pattern: /\beach\s+of\s+the\s+\w+\s+have\b/gi,
        check: () => true,
        message: "Subject-verb agreement: 'each' is singular",
        suggestion: "each of the ... has",
        type: 'grammar'
    },
    {
        pattern: /\bcould\s+of\b/gi,
        check: () => true,
        message: "Common error: 'could of' should be 'could have'",
        suggestion: "could have",
        type: 'grammar'
    },
    {
        pattern: /\bwould\s+of\b/gi,
        check: () => true,
        message: "Common error: 'would of' should be 'would have'",
        suggestion: "would have",
        type: 'grammar'
    },
    {
        pattern: /\bshould\s+of\b/gi,
        check: () => true,
        message: "Common error: 'should of' should be 'should have'",
        suggestion: "should have",
        type: 'grammar'
    },
    {
        pattern: /\bits\s+a\b/gi,
        check: (match, context) => {
            // Check if it might need an apostrophe
            return context.match(/its\s+a\s+(beautiful|nice|great|good|bad|wonderful)/i);
        },
        message: "Check: 'its' (possessive) vs 'it's' (it is)",
        suggestion: "it's a",
        type: 'grammar'
    },
    {
        pattern: /\bisnt\b/gi,
        check: () => true,
        message: "Missing apostrophe in contraction",
        suggestion: "isn't",
        type: 'spelling'
    },
    {
        pattern: /\bdont\b/gi,
        check: () => true,
        message: "Missing apostrophe in contraction",
        suggestion: "don't",
        type: 'spelling'
    },
    {
        pattern: /\bwont\b/gi,
        check: () => true,
        message: "Missing apostrophe in contraction",
        suggestion: "won't",
        type: 'spelling'
    },
    {
        pattern: /\bless\s+people\b/gi,
        check: () => true,
        message: "Use 'fewer' for countable nouns",
        suggestion: "fewer people",
        type: 'style'
    },
    {
        pattern: /\bbetween\s+you\s+and\s+I\b/gi,
        check: () => true,
        message: "Use objective case after prepositions",
        suggestion: "between you and me",
        type: 'grammar'
    },
    {
        pattern: /\bvery\s+unique\b/gi,
        check: () => true,
        message: "'Unique' is absolute and cannot be modified by 'very'",
        suggestion: "unique",
        type: 'style'
    },
    {
        pattern: /\balot\b/gi,
        check: () => true,
        message: "'Alot' is not a word",
        suggestion: "a lot",
        type: 'spelling'
    },
    {
        pattern: /\btommorrow\b/gi,
        check: () => true,
        message: "Spelling error",
        suggestion: "tomorrow",
        type: 'spelling'
    },
    {
        pattern: /\brecieve\b/gi,
        check: () => true,
        message: "Spelling error: remember 'i before e except after c'",
        suggestion: "receive",
        type: 'spelling'
    },
    {
        pattern: /\boccured\b/gi,
        check: () => true,
        message: "Spelling error: double 'r' needed",
        suggestion: "occurred",
        type: 'spelling'
    },
    {
        pattern: /\bplaying\s+good\b/gi,
        check: () => true,
        message: "Use adverb to modify verb",
        suggestion: "playing well",
        type: 'grammar'
    }
];

function checkGrammar(text) {
    const errors = [];
    let annotatedText = text;
    const errorPositions = [];

    grammarRules.forEach(rule => {
        let match;
        const regex = new RegExp(rule.pattern.source, rule.pattern.flags);

        while ((match = regex.exec(text)) !== null) {
            const shouldReport = typeof rule.check === 'function'
                ? rule.check(match, text)
                : true;

            if (shouldReport) {
                const start = match.index;
                const end = start + match[0].length;
                const context = text.substring(
                    Math.max(0, start - 20),
                    Math.min(text.length, end + 20)
                );

                errors.push({
                    type: rule.type,
                    message: rule.message,
                    suggestion: rule.suggestion,
                    match: match[0],
                    start: start,
                    end: end,
                    context: context
                });

                errorPositions.push({
                    start,
                    end,
                    type: rule.type,
                    match: match[0]
                });
            }
        }
    });

    // Sort error positions by start index (descending) to replace from end to start
    errorPositions.sort((a, b) => b.start - a.start);

    // Build annotated HTML
    let htmlText = escapeHtml(text);
    const offsetMap = buildOffsetMap(text, htmlText);

    errorPositions.forEach(pos => {
        const htmlStart = offsetMap[pos.start] || pos.start;
        const htmlEnd = offsetMap[pos.end] || pos.end;

        const before = htmlText.substring(0, htmlStart);
        const match = htmlText.substring(htmlStart, htmlEnd);
        const after = htmlText.substring(htmlEnd);

        htmlText = before +
            `<span class="error-word error-${pos.type}">${match}<span class="error-tooltip">${pos.type}: Click for details</span></span>` +
            after;
    });

    return {
        errors: errors,
        annotatedHtml: htmlText
    };
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function buildOffsetMap(original, escaped) {
    const map = {};
    let escIdx = 0;

    for (let origIdx = 0; origIdx < original.length; origIdx++) {
        map[origIdx] = escIdx;

        const char = original[origIdx];
        if (char === '&') escIdx += 5; // &amp;
        else if (char === '<') escIdx += 4; // &lt;
        else if (char === '>') escIdx += 4; // &gt;
        else if (char === '"') escIdx += 6; // &quot;
        else if (char === "'") escIdx += 6; // &#039;
        else escIdx += 1;
    }

    map[original.length] = escIdx;
    return map;
}

self.onmessage = function(e) {
    const { type, text } = e.data;

    if (type === 'check') {
        const startTime = performance.now();

        self.postMessage({
            type: 'progress',
            data: { progress: 0.3 }
        });

        const result = checkGrammar(text);

        self.postMessage({
            type: 'progress',
            data: { progress: 0.9 }
        });

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                errors: result.errors,
                annotatedHtml: result.annotatedHtml,
                time: endTime - startTime
            }
        });
    }
};
