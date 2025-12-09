self.onmessage = function(e) {
    const { text, format } = e.data;

    let outlines = [];

    if (format === 'markdown') {
        const lines = text.split('\n');
        for (let line of lines) {
            const match = line.match(/^(#+)\s+(.*)/);
            if (match) {
                outlines.push({
                    level: match[1].length,
                    text: match[2].trim()
                });
            }
        }
    } else if (format === 'html') {
        // Simple Regex parsing for demo (not robust for nested tags or attrs with >)
        // Global match for <h1...h6>
        const regex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
        let match;
        while ((match = regex.exec(text)) !== null) {
            // strip inner tags
            const content = match[2].replace(/<[^>]+>/g, '').trim();
            outlines.push({
                level: parseInt(match[1]),
                text: content
            });
        }
    } else {
        // Text mode: heuristic
        // 1. All caps lines?
        // 2. Numbered lines (1. , 1.1)
        // 3. Indented lines?
        const lines = text.split('\n');
        for (let line of lines) {
            line = line.trimEnd();
            if (!line) continue;

            // Check for numbering 1., 1.1
            const numMatch = line.match(/^\s*(\d+(\.\d+)*)\.?\s+(.*)/);
            if (numMatch) {
                const dots = (numMatch[1].match(/\./g) || []).length;
                outlines.push({
                    level: dots + 1,
                    text: numMatch[3]
                });
                continue;
            }

            // Check for Indentation
            const indentMatch = line.match(/^(\s+)(.*)/);
            if (indentMatch) {
                const level = Math.floor(indentMatch[1].length / 2) + 1;
                outlines.push({
                    level: level,
                    text: indentMatch[2]
                });
                continue;
            }

            // Check for All Caps (short lines)
            if (line === line.toUpperCase() && /[A-Z]/.test(line) && line.length < 50) {
                 outlines.push({
                    level: 1,
                    text: line
                });
            }
        }
    }

    // Format Result
    let result = '';
    if (outlines.length > 0) {
        // Find min level to normalize
        const minLevel = Math.min(...outlines.map(o => o.level));

        result = outlines.map(o => {
            const indent = '    '.repeat(Math.max(0, o.level - minLevel));
            return `${indent}- ${o.text}`;
        }).join('\n');
    } else {
        result = "No headings found.";
    }

    self.postMessage({
        result,
        count: outlines.length
    });
};
