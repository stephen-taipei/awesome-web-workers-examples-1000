self.onmessage = function(e) {
    const { text, format, maxDepth } = e.data;

    // Parse Markdown headers
    const lines = text.split('\n');
    let toc = [];

    // Slug generation map to handle duplicates
    const slugs = new Map();

    function generateSlug(text) {
        let slug = text.toLowerCase()
            .replace(/[^\w\s-]/g, '') // remove non-word chars
            .replace(/\s+/g, '-')     // replace spaces with -
            .replace(/^-+|-+$/g, ''); // trim -

        if (!slug) slug = 'section';

        if (slugs.has(slug)) {
            let count = slugs.get(slug);
            slugs.set(slug, count + 1);
            return `${slug}-${count}`;
        } else {
            slugs.set(slug, 1);
            return slug;
        }
    }

    for (let line of lines) {
        // Match # Header
        const match = line.match(/^(#+)\s+(.*)/);
        if (match) {
            const level = match[1].length;
            if (level > maxDepth) continue;

            const title = match[2].trim();
            const slug = generateSlug(title);

            toc.push({ level, title, slug });
        }
    }

    // Format Output
    let result = '';

    if (toc.length > 0) {
        const minLevel = Math.min(...toc.map(t => t.level));

        result = toc.map(item => {
            const indentLevel = Math.max(0, item.level - minLevel);
            const indent = '  '.repeat(indentLevel);

            if (format === 'markdown') {
                return `${indent}- [${item.title}](#${item.slug})`;
            } else { // html
                return `${indent}<li><a href="#${item.slug}">${escapeHtml(item.title)}</a></li>`;
            }
        }).join('\n');

        if (format === 'html') {
            result = `<ul>\n${result}\n</ul>`;
            // Note: Nested ULs is better HTML practice but keeping it simple flat with indent for now
            // or we could implement proper nesting logic similar to Tree Structure.
        }
    } else {
        result = "";
    }

    self.postMessage({
        result,
        count: toc.length
    });
};

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;");
}
