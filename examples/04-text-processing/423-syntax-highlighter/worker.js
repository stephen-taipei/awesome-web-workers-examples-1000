/**
 * Syntax Highlighter Web Worker
 */
const colors = {
    keyword: '#569cd6',
    string: '#ce9178',
    comment: '#6a9955',
    number: '#b5cea8',
    function: '#dcdcaa',
    operator: '#d4d4d4',
    tag: '#569cd6',
    attr: '#9cdcfe',
    default: '#d4d4d4'
};

const jsKeywords = ['function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return', 'class', 'import', 'export', 'from', 'async', 'await', 'true', 'false', 'null', 'undefined', 'new', 'this'];
const pyKeywords = ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'return', 'import', 'from', 'as', 'True', 'False', 'None', 'and', 'or', 'not', 'in', 'is', 'try', 'except', 'with', 'self'];

self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'HIGHLIGHT') highlight(payload.text, payload.language);
};

function highlight(code, language) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Tokenizing...' } });

    let result = escapeHTML(code);
    let tokenCount = 0;

    // Comments
    if (language === 'javascript' || language === 'python') {
        result = result.replace(/(\/\/.*$|#.*$)/gm, (m) => { tokenCount++; return span('comment', m); });
        result = result.replace(/(\/\*[\s\S]*?\*\/)/g, (m) => { tokenCount++; return span('comment', m); });
    }

    // Strings
    result = result.replace(/("[^"]*"|'[^']*'|`[^`]*`)/g, (m) => { tokenCount++; return span('string', m); });

    // Numbers
    result = result.replace(/\b(\d+\.?\d*)\b/g, (m) => { tokenCount++; return span('number', m); });

    // Keywords
    const keywords = language === 'python' ? pyKeywords : jsKeywords;
    for (const kw of keywords) {
        const regex = new RegExp('\\b(' + kw + ')\\b', 'g');
        result = result.replace(regex, (m) => { tokenCount++; return span('keyword', m); });
    }

    // Functions
    result = result.replace(/\b([a-zA-Z_]\w*)\s*\(/g, (m, fn) => { tokenCount++; return span('function', fn) + '('; });

    // HTML tags
    if (language === 'html') {
        result = result.replace(/(&lt;\/?[a-zA-Z][a-zA-Z0-9]*)/g, (m) => { tokenCount++; return span('tag', m); });
        result = result.replace(/([a-zA-Z-]+)=/g, (m, attr) => { tokenCount++; return span('attr', attr) + '='; });
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: result,
            duration: performance.now() - startTime,
            stats: { tokenCount }
        }
    });
}

function span(type, text) {
    return `<span style="color:${colors[type]}">${text}</span>`;
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
