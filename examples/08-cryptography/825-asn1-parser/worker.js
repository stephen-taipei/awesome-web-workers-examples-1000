self.onmessage = function(e) {
    if (e.data.type === 'PARSE') {
        const hex = e.data.payload.hex.replace(/\s+/g, '');
        const tree = parseASN1(hex);
        self.postMessage({ type: 'RESULT', payload: { tree }});
    }
};

function parseASN1(hex, indent = 0) {
    const bytes = hex.match(/.{2}/g) || [];
    if (bytes.length < 2) return 'Empty or invalid data';

    const pad = '  '.repeat(indent);
    let result = '';
    let i = 0;

    while (i < bytes.length) {
        const tag = parseInt(bytes[i], 16);
        const tagClass = (tag >> 6) & 3;
        const constructed = (tag >> 5) & 1;
        const tagNumber = tag & 0x1f;

        const tagNames = { 0x02: 'INTEGER', 0x03: 'BIT STRING', 0x04: 'OCTET STRING',
            0x05: 'NULL', 0x06: 'OID', 0x0c: 'UTF8String', 0x13: 'PrintableString',
            0x16: 'IA5String', 0x17: 'UTCTime', 0x30: 'SEQUENCE', 0x31: 'SET' };

        const tagName = tagNames[tag] || (constructed ? 'CONSTRUCTED' : `TAG(${tag.toString(16)})`);
        i++;

        if (i >= bytes.length) break;
        let len = parseInt(bytes[i], 16);
        i++;

        if (len & 0x80) {
            const lenBytes = len & 0x7f;
            len = 0;
            for (let j = 0; j < lenBytes && i < bytes.length; j++) {
                len = (len << 8) | parseInt(bytes[i], 16);
                i++;
            }
        }

        result += `${pad}${tagName} (len=${len})\n`;

        if (constructed && i + len * 2 <= bytes.length * 2) {
            result += parseASN1(bytes.slice(i, i + len).join(''), indent + 1);
        }
        i += len;
    }
    return result || 'No valid ASN.1 structure found';
}
