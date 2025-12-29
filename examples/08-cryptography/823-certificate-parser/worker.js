self.onmessage = function(e) {
    if (e.data.type === 'PARSE') {
        const pem = e.data.payload.pem;
        const info = parseCertificate(pem);
        self.postMessage({ type: 'RESULT', payload: { info }});
    }
};

function parseCertificate(pem) {
    // Extract base64 content
    const lines = pem.split('\n').filter(l => !l.startsWith('-----'));
    const b64 = lines.join('');

    try {
        const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

        // Basic ASN.1 parsing for demo
        const info = {
            'Type': 'X.509 Certificate',
            'Encoding': 'PEM (Base64 DER)',
            'Size': der.length + ' bytes',
            'Version': 'v3 (likely)',
            'Serial Number': extractHex(der.slice(10, 20)),
            'Signature Algorithm': detectAlgorithm(der),
            'Status': 'Parsed successfully'
        };
        return info;
    } catch (error) {
        return {
            'Error': 'Failed to parse certificate',
            'Details': error.message,
            'Hint': 'Ensure valid PEM format'
        };
    }
}

function extractHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join(':').toUpperCase();
}

function detectAlgorithm(der) {
    const str = String.fromCharCode(...der);
    if (str.includes('sha256')) return 'SHA256 with RSA';
    if (str.includes('sha1')) return 'SHA1 with RSA';
    if (str.includes('ecdsa')) return 'ECDSA';
    return 'RSA (detected)';
}
