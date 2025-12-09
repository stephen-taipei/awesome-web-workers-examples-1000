self.onmessage = function(e) {
    const { text, indent } = e.data;
    const startTime = performance.now();

    try {
        const formatted = formatCode(text, indent);
        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            text: formatted,
            time: Math.round(endTime - startTime)
        });

    } catch (error) {
        self.postMessage({
            type: 'error',
            error: error.message
        });
    }
};

function formatCode(code, indentStr) {
    // Basic C-Style Formatter (Braces based)
    // Supports JS, Java, C#, CSS, etc.

    // 1. Remove comments or handle string literals?
    // Complexity warning: Full parser is needed for perfect handling.
    // Heuristic approach:
    // - Split by newlines or semicolons/braces?
    // - Track indentation level based on { and }

    let formatted = '';
    let level = 0;

    // Normalize newlines
    // Add newlines after { and ; and }
    // But protect strings!

    // Step 1: Tokenize roughly to protect strings and comments
    // Using a regex to split: "string", 'string', // comment, /* comment */, { } ;
    const regex = /(".*?"|'.*?'|\/\/.*|\/\*[\s\S]*?\*\/|\{|\}|;)/g;

    // We split by the regex but keep delimiters
    // 'code'.split(regex) gives [text, delim, text, delim...]

    const parts = code.split(regex);

    // Reconstruct with formatting
    let currentLine = '';

    const appendLine = () => {
        const trimmed = currentLine.trim();
        if (trimmed) {
            formatted += indentStr.repeat(level) + trimmed + '\n';
        }
        currentLine = '';
    };

    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        if (!part) continue;

        // Determine type
        const firstChar = part.charAt(0);

        if (firstChar === '{') {
            // Start block
            // If there was content before {, print it, then { on new line?
            // Or same line "header {"? Common style is K&R: "header {"
            // Let's assume input "if(){" is one chunk before.
            // Wait, split puts delimiters separate.
            // So "if()" is parts[i-1] (maybe) and "{" is parts[i].

            // Append { to current line
            currentLine += ' ' + part;
            appendLine();
            level++;
        } else if (firstChar === '}') {
            // End block
            appendLine(); // Flush previous content
            level = Math.max(0, level - 1);
            currentLine += part;
            appendLine();
        } else if (firstChar === ';') {
            // End statement
            currentLine += part;
            appendLine();
        } else if (firstChar === '"' || firstChar === "'" || part.startsWith('//') || part.startsWith('/*')) {
            // String or Comment
            // Just append
            currentLine += ' ' + part.trim();
        } else {
            // Regular code text
            // Trim and append
            // If it's just whitespace, ignore?
            if (part.trim()) {
                currentLine += (currentLine ? ' ' : '') + part.trim();
            }
        }
    }

    appendLine(); // Flush remaining

    return formatted.trim();
}
