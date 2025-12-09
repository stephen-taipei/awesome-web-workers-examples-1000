self.onmessage = function(e) {
    const { text, indent } = e.data;
    const startTime = performance.now();

    try {
        const formatted = formatXml(text, indent);
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

function formatXml(xml, indentStr) {
    let formatted = '';
    let pad = 0;

    // Remove existing whitespace between tags to start fresh
    // Caution: This naive regex might break whitespace inside tags content if not careful.
    // A robust parser would tokenise.
    // For this example, we assume standard "data oriented" XML where whitespace between tags is insignificant.
    // But we must preserve whitespace inside text content.

    // Simple approach: Split by tags
    // >\s*<  ->  ><  (strip whitespace between tags)
    const cleanXml = xml.replace(/>\s*</g, '><').trim();

    // Split into tokens: tags and text
    // Regex matches: <[^>]+>
    const tokens = cleanXml.match(/(<[^>]+>|[^<]+)/g) || [];

    tokens.forEach(token => {
        let indent = 0;

        if (token.match(/^<\//)) {
            // Closing tag </tag>: decrease pad
            pad = Math.max(0, pad - 1);
        } else if (token.match(/^<.*\/>/)) {
            // Self-closing tag <tag/>: no change
        } else if (token.match(/^<\?/)) {
            // XML declaration <?xml ... ?>: no change (usually top level)
        } else if (token.match(/^<!/)) {
            // Comments or DOCTYPE <!-- -->: no change
        } else if (token.match(/^<[^>]+>/)) {
            // Opening tag <tag>: increase pad next time
            // But verify it's not a self-closing tag (handled above by regex order? No, strictly check end)
            // Using refined logic
            indent = 1;
        } else {
            // Text content: no indentation change, but should it be on new line?
            // Usually text stays with opening tag or on new line indented.
            // Let's simple format: everything on new line
            indent = 0;
        }

        // Add current indentation
        // Check if token is closing tag, we already decreased pad
        // Check if token is text content:
        // Strategy:
        // 1. Opening tag: Print indent + tag. Pad++.
        // 2. Closing tag: Pad--. Print indent + tag.
        // 3. Text: Print indent + text (or inline?).

        // Re-eval logic for simple loop:

        if (token.match(/^<\//)) {
            // Closing tag
            // pad is already decreased
            formatted += '\n' + indentStr.repeat(pad) + token;
        } else if (token.match(/^<.*>$/)) {
            // Tag (Opening, Self-closing, Comment, Instruction)

            // Check self-closing or special
            if (token.match(/^<.*\/>/) || token.match(/^<\?/) || token.match(/^<!/)) {
                formatted += '\n' + indentStr.repeat(pad) + token;
            } else {
                // Opening tag
                formatted += '\n' + indentStr.repeat(pad) + token;
                pad++;
            }
        } else {
            // Text content
            // If text is short, maybe keep on same line?
            // For generic beautifier, usually put on new line or keep inline if strict.
            // Let's put on new line for clarity
            formatted += '\n' + indentStr.repeat(pad) + token.trim();
        }
    });

    return formatted.trim();
}
