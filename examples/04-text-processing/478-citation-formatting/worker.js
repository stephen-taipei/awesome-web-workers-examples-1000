self.onmessage = function(e) {
    const { text, style } = e.data;

    let items;
    try {
        items = JSON.parse(text);
        if (!Array.isArray(items)) {
            items = [items];
        }
    } catch (err) {
        self.postMessage({ error: 'Invalid JSON format' });
        return;
    }

    // Sort items alphabetically by first author
    items.sort((a, b) => {
        const authA = a.author || '';
        const authB = b.author || '';
        return authA.localeCompare(authB);
    });

    let result = items.map((item, index) => formatItem(item, style, index + 1)).join('\n\n');

    self.postMessage({
        result,
        count: items.length
    });
};

function formatItem(item, style, index) {
    const authors = parseAuthors(item.author);
    const title = item.title || 'Untitled';
    const year = item.year || 'n.d.';
    const publisher = item.publisher || '';
    const journal = item.journal || '';
    const vol = item.volume || '';
    const issue = item.issue || '';
    const pages = item.pages || '';

    if (style === 'apa') {
        // Author, A. A. (Year). Title. Publisher/Journal.
        const authStr = formatAuthorsAPA(authors);
        if (item.type === 'journal') {
            return `${authStr} (${year}). ${title}. *${journal}, ${vol}*(${issue}), ${pages}.`;
        } else {
            return `${authStr} (${year}). *${title}*. ${publisher}.`;
        }
    } else if (style === 'mla') {
        // Author. "Title." Container, vol, issue, Year, pages.
        const authStr = formatAuthorsMLA(authors);
        if (item.type === 'journal') {
            return `${authStr} "${title}." *${journal}*, vol. ${vol}, no. ${issue}, ${year}, pp. ${pages}.`;
        } else {
            return `${authStr} *${title}*. ${publisher}, ${year}.`;
        }
    } else if (style === 'chicago') {
        const authStr = formatAuthorsChicago(authors);
        if (item.type === 'journal') {
            return `${authStr} "${title}." *${journal}* ${vol}, no. ${issue} (${year}): ${pages}.`;
        } else {
            return `${authStr} *${title}*. ${publisher}, ${year}.`;
        }
    } else if (style === 'ieee') {
        // [1] A. Author, "Title," ...
        const authStr = formatAuthorsIEEE(authors);
        if (item.type === 'journal') {
            return `[${index}] ${authStr}, "${title}," *${journal}*, vol. ${vol}, no. ${issue}, pp. ${pages}, ${year}.`;
        } else {
            return `[${index}] ${authStr}, *${title}*. ${publisher}, ${year}.`;
        }
    }
    return item.title;
}

function parseAuthors(authorStr) {
    // "Last, First" or "Last, First and Last2, First2"
    if (!authorStr) return [];
    // Split by 'and' or '&'
    // This is simple parsing; specific logic needed for "Last, F." vs "First Last"
    return authorStr.split(/\s+and\s+|\s*&\s*/).map(a => a.trim());
}

function formatAuthorsAPA(authors) {
    // Smith, J. D.
    if (!authors.length) return '';
    return authors.join(', & '); // Simplified
}

function formatAuthorsMLA(authors) {
    // Smith, John.
    if (!authors.length) return '';
    if (authors.length === 1) return `${authors[0]}.`;
    if (authors.length === 2) return `${authors[0]}, and ${authors[1]}.`;
    return `${authors[0]}, et al.`;
}

function formatAuthorsChicago(authors) {
    return formatAuthorsMLA(authors); // Similar for bibliography
}

function formatAuthorsIEEE(authors) {
    // J. D. Smith
    if (!authors.length) return '';
    return authors.join(', ');
}
