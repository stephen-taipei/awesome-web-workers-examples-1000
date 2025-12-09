self.onmessage = function(e) {
    const { text, delimiter, format } = e.data;

    // 1. Detect delimiter
    let detectedDelimiter = ',';
    if (delimiter !== 'auto') {
        const map = {
            'comma': ',',
            'tab': '\t',
            'pipe': '|',
            'semicolon': ';'
        };
        detectedDelimiter = map[delimiter];
    } else {
        // Simple auto-detection: choose the one that occurs most consistently
        const candidates = [',', '\t', '|', ';'];
        let bestScore = -1;

        const lines = text.split('\n').slice(0, 5); // Check first 5 lines

        for (const cand of candidates) {
            const counts = lines.map(line => line.split(cand).length);
            // Variance calculation? Or just ensure > 1 column and consistent count
            const avg = counts.reduce((a, b) => a + b, 0) / counts.length;

            // Check consistency (std dev)
            const variance = counts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / counts.length;

            // Score: Prefer consistent counts, then higher counts
            if (variance < 0.1 && avg > 1) {
                if (avg > bestScore) {
                    bestScore = avg;
                    detectedDelimiter = cand;
                }
            }
        }
    }

    // 2. Parse data
    const rows = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const data = rows.map(line => {
        // Handle quotes for CSV? Simple split for now as this is a format converter demo
        // For robust CSV parsing, a state machine is needed.
        // We'll do a simple split but respect quotes if easy, or just simple split.
        // Let's stick to simple split for simplicity unless complex data provided.
        return line.split(detectedDelimiter).map(cell => cell.trim());
    });

    if (data.length === 0) {
        self.postMessage({ result: '', rows: 0, cols: 0 });
        return;
    }

    const numRows = data.length;
    const numCols = data.reduce((max, row) => Math.max(max, row.length), 0);

    // Normalize columns
    data.forEach(row => {
        while (row.length < numCols) row.push('');
    });

    // 3. Format
    let result = '';
    const colWidths = new Array(numCols).fill(0);

    // Calculate column widths
    data.forEach(row => {
        row.forEach((cell, i) => {
            colWidths[i] = Math.max(colWidths[i], cell.length);
        });
    });

    if (format === 'ascii') {
        // +---+---+
        // | A | B |
        // +---+---+
        const separator = '+' + colWidths.map(w => '-'.repeat(w + 2)).join('+') + '+';

        result += separator + '\n';
        data.forEach((row, rowIndex) => {
            const line = '|' + row.map((cell, i) => {
                return ' ' + cell.padEnd(colWidths[i]) + ' ';
            }).join('|') + '|';
            result += line + '\n';
            if (rowIndex === 0 || rowIndex === numRows - 1) { // Header separator and bottom
                 result += separator + '\n';
            }
        });
    } else if (format === 'markdown') {
        // | A | B |
        // |---|---|
        // | 1 | 2 |

        const header = '| ' + data[0].map((cell, i) => cell.padEnd(colWidths[i])).join(' | ') + ' |';
        const sep = '| ' + colWidths.map(w => '-'.repeat(w)).join(' | ') + ' |';

        result += header + '\n' + sep + '\n';

        for (let i = 1; i < numRows; i++) {
            const line = '| ' + data[i].map((cell, j) => cell.padEnd(colWidths[j])).join(' | ') + ' |';
            result += line + '\n';
        }
    } else if (format === 'html') {
        result += '<table>\n';
        result += '  <thead>\n    <tr>\n';
        data[0].forEach(cell => {
            result += `      <th>${escapeHtml(cell)}</th>\n`;
        });
        result += '    </tr>\n  </thead>\n';
        result += '  <tbody>\n';
        for (let i = 1; i < numRows; i++) {
            result += '    <tr>\n';
            data[i].forEach(cell => {
                result += `      <td>${escapeHtml(cell)}</td>\n`;
            });
            result += '    </tr>\n';
        }
        result += '  </tbody>\n</table>';
    } else if (format === 'latex') {
        result += '\\begin{tabular}{|' + 'l|'.repeat(numCols) + '}\n';
        result += '\\hline\n';
        data.forEach(row => {
            result += row.map(cell => escapeLatex(cell)).join(' & ') + ' \\\\\n';
            result += '\\hline\n';
        });
        result += '\\end{tabular}';
    }

    self.postMessage({
        result,
        rows: numRows,
        cols: numCols
    });
};

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}

function escapeLatex(text) {
    return text.replace(/([&%$#_{}])/g, "\\$1");
}
