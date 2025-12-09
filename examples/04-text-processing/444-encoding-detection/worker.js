self.onmessage = function(e) {
    const { buffer } = e.data;
    const startTime = performance.now();

    const result = detectEncoding(new Uint8Array(buffer));

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        encoding: result.encoding,
        confidence: result.confidence,
        time: endTime - startTime
    });
};

function detectEncoding(bytes) {
    const len = bytes.length;

    // 1. Check BOM (Byte Order Mark)
    if (len >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        return { encoding: 'UTF-8', confidence: 'High (BOM)' };
    }
    if (len >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
        return { encoding: 'UTF-16BE', confidence: 'High (BOM)' };
    }
    if (len >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
        return { encoding: 'UTF-16LE', confidence: 'High (BOM)' };
    }

    // 2. Check for Binary (Null bytes in text usually indicate binary or UTF-16/32)
    let nullCount = 0;
    for (let i = 0; i < Math.min(len, 1000); i++) {
        if (bytes[i] === 0) nullCount++;
    }

    // If lots of nulls, likely UTF-16 or Binary
    if (nullCount > 0) {
        // Simple heuristic: if every other byte is 0, it's UTF-16
        // Check first few bytes
        if (len > 10) {
            let evenNulls = 0;
            let oddNulls = 0;
            for (let i=0; i<Math.min(len, 100); i+=2) {
                if (bytes[i] === 0) evenNulls++;
                if (bytes[i+1] === 0) oddNulls++;
            }

            if (evenNulls > 40 && oddNulls === 0) return { encoding: 'UTF-16BE', confidence: 'Medium' };
            if (oddNulls > 40 && evenNulls === 0) return { encoding: 'UTF-16LE', confidence: 'Medium' };
        }

        // Else assume binary
        // return { encoding: 'Binary', confidence: 'Medium' };
    }

    // 3. Valid UTF-8 Check
    // UTF-8 follows specific bit patterns
    let isUtf8 = true;
    let validUtf8Sequences = 0;

    let i = 0;
    while (i < len) {
        const byte = bytes[i];

        if ((byte & 0x80) === 0) { // ASCII
            i++;
            continue;
        }

        let expectedLen = 0;
        if ((byte & 0xE0) === 0xC0) expectedLen = 1;
        else if ((byte & 0xF0) === 0xE0) expectedLen = 2;
        else if ((byte & 0xF8) === 0xF0) expectedLen = 3;
        else {
            isUtf8 = false;
            break;
        }

        // Check continuation bytes (must be 10xxxxxx)
        if (i + expectedLen >= len) break; // Incomplete at end

        for (let j = 1; j <= expectedLen; j++) {
            if ((bytes[i + j] & 0xC0) !== 0x80) {
                isUtf8 = false;
                break;
            }
        }
        if (!isUtf8) break;

        validUtf8Sequences++;
        i += expectedLen + 1;
    }

    if (isUtf8) {
        if (validUtf8Sequences > 0) return { encoding: 'UTF-8', confidence: 'High' };
        // Only ASCII found
        return { encoding: 'ASCII / UTF-8', confidence: 'High' };
    }

    // 4. Heuristics for Legacy Encodings (ISO-8859-1, Windows-1252, Big5, Shift_JIS)
    // This is hard without frequency tables.
    // If not UTF-8 and no nulls, likely 8-bit extended ASCII.

    // Check Big5 (Common in TW/HK)
    // First byte: 0x81-0xFE
    // Second byte: 0x40-0x7E, 0xA1-0xFE
    let isBig5 = true;
    let big5Seqs = 0;
    i = 0;
    while (i < len) {
        if (bytes[i] < 0x80) { i++; continue; }

        if (bytes[i] >= 0x81 && bytes[i] <= 0xFE) {
            if (i + 1 >= len) break;
            const b2 = bytes[i+1];
            if ((b2 >= 0x40 && b2 <= 0x7E) || (b2 >= 0xA1 && b2 <= 0xFE)) {
                big5Seqs++;
                i += 2;
                continue;
            }
        }
        isBig5 = false;
        break;
    }

    if (isBig5 && big5Seqs > 0) return { encoding: 'Big5', confidence: 'Medium' };

    // Default fallback
    return { encoding: 'Windows-1252 / ISO-8859-1', confidence: 'Low' };
}
