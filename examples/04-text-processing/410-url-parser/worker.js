/**
 * URL Parser Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PARSE':
            parseURLs(payload.text);
            break;
        default:
            sendError('Unknown message type: ' + type);
    }
};

function parseURLs(text) {
    const startTime = performance.now();

    sendProgress(10, 'Extracting URLs...');

    const lines = text.split('\n').filter(line => line.trim());

    sendProgress(30, 'Parsing URLs...');

    const parsedUrls = [];
    let validUrls = 0;

    for (let i = 0; i < lines.length; i++) {
        const url = lines[i].trim();
        const parsed = parseURL(url);
        parsedUrls.push(parsed);

        if (parsed.valid) {
            validUrls++;
        }

        if (i % 100 === 0) {
            const progress = 30 + Math.floor((i / lines.length) * 60);
            sendProgress(progress, `Parsing URL ${i + 1} of ${lines.length}...`);
        }
    }

    const endTime = performance.now();

    sendProgress(100, 'Done');

    self.postMessage({
        type: 'RESULT',
        payload: {
            parsedUrls: parsedUrls,
            duration: endTime - startTime,
            stats: {
                totalUrls: lines.length,
                validUrls: validUrls
            }
        }
    });
}

function parseURL(urlString) {
    const result = {
        original: urlString,
        valid: false
    };

    try {
        // Use regex for parsing since URL API isn't available in all workers
        const urlRegex = /^(([^:/?#]+):)?(\/\/((([^:@]*)(:([^@]*))?@)?([^:/?#]*)(:(\d*))?))?(([^?#]*)(\?([^#]*))?(#(.*))?)?$/;
        const match = urlString.match(urlRegex);

        if (match) {
            result.protocol = match[2] || '';
            result.username = match[6] || '';
            result.password = match[8] || '';
            result.host = match[9] || '';
            result.port = match[11] || '';
            result.pathname = match[13] || '';
            result.search = match[15] || '';
            result.hash = match[17] || '';

            // Parse query parameters
            if (result.search) {
                result.params = parseQueryString(result.search);
            }

            result.valid = !!result.protocol && !!result.host;
        }

        // Handle special protocols
        if (urlString.startsWith('mailto:')) {
            result.protocol = 'mailto';
            result.email = urlString.slice(7);
            result.valid = true;
        }
    } catch (e) {
        result.error = e.message;
    }

    return result;
}

function parseQueryString(queryString) {
    const params = {};
    const pairs = queryString.split('&');

    for (const pair of pairs) {
        const [key, value] = pair.split('=');
        if (key) {
            params[decodeURIComponent(key)] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
        }
    }

    return params;
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
