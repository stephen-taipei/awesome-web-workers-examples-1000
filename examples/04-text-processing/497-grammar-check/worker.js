self.onmessage = function(e) {
    const { text } = e.data;

    // Basic Rule Engine
    // Real grammar checking requires NLP (tokens, POS tagging, parse trees).
    // This example uses Regex for common mistakes to demonstrate the concept.

    const rules = [
        {
            regex: /\b(I) has\b/gi,
            message: "Subject-verb agreement error. 'I' uses 'have'.",
            replacement: "I have"
        },
        {
            regex: /\b(a) ([aeiou][a-z]*)\b/gi,
            message: "Use 'an' before vowel sounds.",
            replacement: "an $2",
            filter: (match) => !match[2].startsWith('u') // Simplistic check for 'university' etc.
        },
        {
            regex: /\b(an) ([^aeiou][a-z]*)\b/gi,
            message: "Use 'a' before consonant sounds.",
            replacement: "a $2",
            filter: (match) => !match[2].startsWith('h') // 'hour' vs 'house'
        },
        {
            regex: /\b(their) (is|are|was|were)\b/gi,
            message: "Possible confusion between 'their' and 'there'.",
            replacement: "there $2"
        },
        {
            regex: /\b(its) (raining|going|a|the)\b/gi,
            message: "Did you mean 'it's' (it is)?",
            replacement: "it's $2"
        },
        {
            regex: /\b(to) (many|much)\b/gi,
            message: "Did you mean 'too'?",
            replacement: "too $2"
        },
        {
            regex: /\b(affect|effect)\b/gi,
            message: "Check usage of affect (verb) vs effect (noun).",
            // Hard to suggest without context, just warn
        },
        {
            regex: /\s,\s/g,
            message: "Remove space before comma.",
            replacement: ", "
        },
        {
            regex: /\b(alot)\b/gi,
            message: "'alot' is not a word.",
            replacement: "a lot"
        }
    ];

    let issues = [];

    rules.forEach(rule => {
        let match;
        // Reset lastIndex for global regex
        rule.regex.lastIndex = 0;

        while ((match = rule.regex.exec(text)) !== null) {
            if (rule.filter && !rule.filter(match)) continue;

            let replacement = rule.replacement;
            if (replacement) {
                // Replace $1, $2 etc in replacement string with captured groups
                replacement = replacement.replace(/\$(\d)/g, (_, n) => match[n] || '');
            }

            issues.push({
                index: match.index,
                length: match[0].length,
                match: match[0],
                message: rule.message,
                replacement: replacement
            });
        }
    });

    // Sort by position
    issues.sort((a, b) => a.index - b.index);

    self.postMessage({ issues });
};
