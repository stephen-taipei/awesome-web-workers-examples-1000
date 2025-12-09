self.onmessage = function(e) {
    const { text, action } = e.data;

    // Simple Markdown Footnote Regex: [^id] and [^id]: content
    // Note: This is a basic implementation.

    const refRegex = /\[\^([^\]]+)\](?!:)/g;
    const defRegex = /^\[\^([^\]]+)\]:\s+(.*)$/gm;

    let result = '';
    let count = 0;

    if (action === 'extract') {
        let match;
        let footnotes = [];
        while ((match = defRegex.exec(text)) !== null) {
            footnotes.push({ id: match[1], content: match[2] });
        }

        result = footnotes.map((f, i) => `${i+1}. [${f.id}] ${f.content}`).join('\n');
        count = footnotes.length;

    } else if (action === 'renumber') {
        // Find all refs and defs
        let refs = [];
        let match;
        while ((match = refRegex.exec(text)) !== null) {
            refs.push(match[1]);
        }

        // Remove duplicates in order of appearance
        let uniqueRefs = [...new Set(refs)];
        let mapping = new Map();
        uniqueRefs.forEach((id, index) => mapping.set(id, index + 1));

        // Replace refs
        let newText = text.replace(refRegex, (m, id) => {
            return mapping.has(id) ? `[^${mapping.get(id)}]` : m;
        });

        // Replace defs
        newText = newText.replace(defRegex, (m, id, content) => {
            return mapping.has(id) ? `[^${mapping.get(id)}]: ${content}` : m;
        });

        result = newText;
        count = mapping.size;

    } else if (action === 'markdown-to-html') {
        // 1. Replace refs with <sup><a href="#fn1" id="ref1">[1]</a></sup>
        // 2. Collect defs and build footer list

        let footnotes = new Map(); // id -> content
        let match;

        // Strip defs from main text but store them
        let bodyText = text.replace(defRegex, (m, id, content) => {
            footnotes.set(id, content);
            return ''; // Remove definition from body
        });

        // Replace refs
        let refCounter = 1;
        let usedIds = new Map(); // originalId -> newNumber

        bodyText = bodyText.replace(refRegex, (m, id) => {
            if (!footnotes.has(id)) return m; // Or treat as missing

            if (!usedIds.has(id)) {
                usedIds.set(id, refCounter++);
            }
            const num = usedIds.get(id);
            return `<sup id="fnref:${num}"><a href="#fn:${num}" rel="footnote">${num}</a></sup>`;
        });

        // Append footer
        if (usedIds.size > 0) {
            result = bodyText.trim() + '\n\n<div class="footnotes">\n<hr>\n<ol>\n';

            // Sort by appearance order (1, 2, 3...)
            // Invert map: num -> id
            let numToId = new Map();
            for (let [id, num] of usedIds) numToId.set(num, id);

            for (let i = 1; i <= usedIds.size; i++) {
                const id = numToId.get(i);
                const content = footnotes.get(id);
                result += `<li id="fn:${i}">${escapeHtml(content)} <a href="#fnref:${i}" title="Return to text">↩</a></li>\n`;
            }
            result += '</ol>\n</div>';
        } else {
            result = bodyText;
        }

        count = usedIds.size;
    }

    self.postMessage({
        result,
        count
    });
};

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;");
}
