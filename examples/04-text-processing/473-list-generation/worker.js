self.onmessage = function(e) {
    const { text, type, sort } = e.data;

    // Split and clean
    let items = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);

    // Sort
    if (sort === 'asc') {
        items.sort((a, b) => a.localeCompare(b));
    } else if (sort === 'desc') {
        items.sort((a, b) => b.localeCompare(a));
    } else if (sort === 'length') {
        items.sort((a, b) => a.length - b.length);
    }

    // Format
    let result = '';

    if (type === 'html-ul') {
        result = '<ul>\n' + items.map(item => `  <li>${escapeHtml(item)}</li>`).join('\n') + '\n</ul>';
    } else if (type === 'html-ol') {
        result = '<ol>\n' + items.map(item => `  <li>${escapeHtml(item)}</li>`).join('\n') + '\n</ol>';
    } else {
        result = items.map((item, index) => {
            switch (type) {
                case 'bullet': return `* ${item}`;
                case 'dash': return `- ${item}`;
                case 'plus': return `+ ${item}`;
                case 'numbered': return `${index + 1}. ${item}`;
                case 'letter': return `${String.fromCharCode(97 + (index % 26))}. ${item}`;
                case 'markdown-task': return `- [ ] ${item}`;
                default: return item;
            }
        }).join('\n');
    }

    self.postMessage({
        result,
        count: items.length
    });
};

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;")
               .replace(/"/g, "&quot;")
               .replace(/'/g, "&#039;");
}
