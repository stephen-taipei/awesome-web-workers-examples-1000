self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'PROCESS') process(payload.text, payload.mode, payload.format);
};

function process(text, mode, format) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Converting...' } });

    let result, table = [];

    if (mode === 'encode') {
        const encoded = encode(text, format);
        result = encoded.result;
        table = encoded.table;
    } else {
        result = decode(text, format);
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            table,
            mode,
            format,
            duration: performance.now() - startTime
        }
    });
}

function encode(text, format) {
    const table = [];
    const codes = [];

    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        let formatted;

        switch (format) {
            case 'hex':
                formatted = code.toString(16).toUpperCase().padStart(2, '0');
                break;
            case 'octal':
                formatted = code.toString(8).padStart(3, '0');
                break;
            default:
                formatted = code.toString();
        }

        codes.push(formatted);

        if (table.length < 30) {
            table.push({
                char: text[i],
                dec: code,
                hex: code.toString(16).toUpperCase().padStart(2, '0'),
                oct: code.toString(8).padStart(3, '0'),
                bin: code.toString(2).padStart(8, '0')
            });
        }
    }

    return {
        result: codes.join(' '),
        table
    };
}

function decode(text, format) {
    const codes = text.trim().split(/\s+/);
    let result = '';

    for (const code of codes) {
        let charCode;

        switch (format) {
            case 'hex':
                charCode = parseInt(code, 16);
                break;
            case 'octal':
                charCode = parseInt(code, 8);
                break;
            default:
                charCode = parseInt(code, 10);
        }

        if (!isNaN(charCode) && charCode > 0) {
            result += String.fromCharCode(charCode);
        }
    }

    return result;
}
