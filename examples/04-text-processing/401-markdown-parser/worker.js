/**
 * Markdown Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseMarkdown(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseMarkdown(text) {
    const startTime = performance.now();

    sendProgress(10, 'Parsing headers...');

    let html = text;

    // Escape HTML
    html = html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;');

    sendProgress(20, 'Processing code blocks...');

    // Code blocks
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    sendProgress(30, 'Processing headers...');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    sendProgress(50, 'Processing formatting...');

    // Bold and italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

    sendProgress(60, 'Processing links...');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    sendProgress(70, 'Processing blockquotes...');

    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

    sendProgress(80, 'Processing lists...');

    // Unordered lists
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    sendProgress(90, 'Processing paragraphs...');

    // Paragraphs (lines not already wrapped)
    const lines = html.split('\n');
    html = lines.map(line => {
        if (line.trim() === '') return '';
        if (line.match(/^<[hupob]/)) return line;
        return line;
    }).join('\n');

    // Convert double newlines to paragraph breaks
    html = html.replace(/\n\n+/g, '</p><p>');
    html = '<p>' + html + '</p>';
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<[hupob])/g, '$1');
    html = html.replace(/(<\/[hupob][^>]*>)<\/p>/g, '$1');

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            html: html,
            duration: endTime - startTime,
            stats: {
                inputLength: text.length,
                outputLength: html.length
            }
        }
    });
}

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}

function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
