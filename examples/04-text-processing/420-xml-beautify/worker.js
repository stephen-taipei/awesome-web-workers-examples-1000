/**
 * XML Beautify Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'BEAUTIFY':
            beautifyXML(payload.text, payload.indent);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function beautifyXML(xml, indent) {
    const startTime = performance.now();

    sendProgress(20, 'Parsing XML...');

    let indentStr;
    if (indent === 'tab') {
        indentStr = '\t';
    } else {
        indentStr = ' '.repeat(parseInt(indent, 10));
    }

    sendProgress(50, 'Formatting...');

    // Remove existing formatting
    let formatted = xml.replace(/>\s*</g, '><');

    // Add newlines after each tag
    formatted = formatted.replace(/></g, '>\n<');

    // Split into lines and add indentation
    const lines = formatted.split('\n');
    let depth = 0;
    const result = [];

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Decrease depth for closing tags
        if (trimmed.startsWith('</')) {
            depth = Math.max(0, depth - 1);
        }

        // Add indentation
        result.push(indentStr.repeat(depth) + trimmed);

        // Increase depth for opening tags (not self-closing)
        if (trimmed.match(/^<[^/!?][^>]*[^/]>$/) && !trimmed.match(/^<[^>]+\/>/)) {
            // Check if it's not a tag with inline content
            if (!trimmed.match(/<[^>]+>[^<]+<\/[^>]+>/)) {
                depth++;
            }
        }
    }

    const output = result.join('\n');

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: output,
            duration: endTime - startTime,
            stats: {
                inputSize: xml.length,
                outputSize: output.length,
                lineCount: result.length
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
