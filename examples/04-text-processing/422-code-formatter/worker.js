/**
 * Code Formatter Web Worker
 */
self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'FORMAT') formatCode(payload.text, payload.language);
};

function formatCode(code, language) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Formatting...' } });

    let result;
    try {
        switch (language) {
            case 'json':
                result = JSON.stringify(JSON.parse(code), null, 2);
                break;
            case 'javascript':
                result = formatJavaScript(code);
                break;
            case 'css':
                result = formatCSS(code);
                break;
            default:
                result = code;
        }
    } catch (e) {
        self.postMessage({ type: 'ERROR', payload: { message: e.message } });
        return;
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            result: result,
            duration: performance.now() - startTime,
            stats: { lineCount: result.split('\n').length }
        }
    });
}

function formatJavaScript(code) {
    let result = '';
    let indent = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const prev = code[i - 1];

        if (inString) {
            result += char;
            if (char === stringChar && prev !== '\\') inString = false;
            continue;
        }

        if (char === '"' || char === "'" || char === '`') {
            inString = true;
            stringChar = char;
            result += char;
        } else if (char === '{') {
            result += ' {\n' + '    '.repeat(++indent);
        } else if (char === '}') {
            result = result.trimEnd() + '\n' + '    '.repeat(--indent) + '}';
        } else if (char === ';') {
            result += ';\n' + '    '.repeat(indent);
        } else if (char === '(' && prev !== ' ') {
            result += '(';
        } else {
            result += char;
        }
    }

    return result.replace(/\n\s*\n/g, '\n').trim();
}

function formatCSS(code) {
    let result = code.replace(/\s*{\s*/g, ' {\n    ');
    result = result.replace(/;\s*/g, ';\n    ');
    result = result.replace(/\s*}\s*/g, '\n}\n\n');
    result = result.replace(/    \n}/g, '}');
    return result.trim();
}
