self.onmessage = function(e) {
    if (e.data.type === 'PARSE') {
        const pem = e.data.payload.pem;
        const info = parsePEM(pem);
        self.postMessage({ type: 'RESULT', payload: { info }});
    }
};

function parsePEM(pem) {
    const headerMatch = pem.match(/-----BEGIN (.+?)-----/);
    const footerMatch = pem.match(/-----END (.+?)-----/);

    if (!headerMatch || !footerMatch) {
        return { Error: 'Invalid PEM format', Hint: 'Missing BEGIN/END markers' };
    }

    const type = headerMatch[1];
    const lines = pem.split('\n').filter(l => !l.startsWith('-----') && l.trim());
    const b64Content = lines.join('');

    try {
        const decoded = atob(b64Content);
        const bytes = Uint8Array.from(decoded, c => c.charCodeAt(0));

        return {
            'Type': type,
            'Format': 'PEM (Base64 encoded)',
            'Decoded Size': bytes.length + ' bytes',
            'Base64 Length': b64Content.length + ' characters',
            'First Bytes (hex)': Array.from(bytes.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '),
            'Status': 'Valid PEM'
        };
    } catch (error) {
        return { Error: 'Decoding failed', Details: error.message };
    }
}
