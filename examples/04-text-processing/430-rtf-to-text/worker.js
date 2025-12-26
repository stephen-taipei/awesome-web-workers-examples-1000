// RTF to Text Worker
// A simplified parser to strip RTF tags and controls

self.onmessage = function(e) {
    const { rtf } = e.data;

    try {
        const startTime = performance.now();

        const result = rtfToText(rtf);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: { result },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function rtfToText(rtf) {
    // Basic state machine approach
    let result = "";
    let i = 0;
    const len = rtf.length;

    // Groups stack? For RTF, braces { } denote groups.
    // Some groups are destination groups (e.g. fonttbl) that contain meta-info, not content.
    // We should skip content of destination groups.
    // Destination groups start with \*, e.g., {\*\generator ...}
    // Or specific keywords like \fonttbl, \colortbl, \stylesheet.

    // Stack of states. State: { skip: boolean }
    const stack = [{ skip: false }];

    while (i < len) {
        const char = rtf[i];

        if (char === '\\') {
            // Control word or symbol
            i++;
            if (i >= len) break;

            const nextChar = rtf[i];

            if (nextChar === '\\' || nextChar === '{' || nextChar === '}') {
                // Escaped char
                if (!stack[stack.length - 1].skip) result += nextChar;
                i++;
            } else if (nextChar === '\r' || nextChar === '\n') {
                // Ignored
                i++;
            } else if (nextChar === '*') {
                 // Destination group marker {\* ...}
                 // Mark current group as skip
                 if (stack.length > 0) stack[stack.length - 1].skip = true;
                 i++;
            } else if (nextChar === "'") {
                // Hex char \'xx
                if (!stack[stack.length - 1].skip) {
                    const hex = rtf.substr(i+1, 2);
                    if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
                        result += String.fromCharCode(parseInt(hex, 16));
                        i += 3;
                    } else {
                        // Invalid, just skip backslash
                        i++; // Should process quote?
                    }
                } else {
                    i += 3;
                }
            } else {
                // Control word \word
                let word = "";
                // Read word (a-z)
                while (i < len && /[a-z]/i.test(rtf[i])) {
                    word += rtf[i];
                    i++;
                }

                // Optional parameter (digits or -)
                let param = "";
                if (i < len && /[-0-9]/.test(rtf[i])) {
                     while (i < len && /[-0-9]/.test(rtf[i])) {
                        param += rtf[i];
                        i++;
                    }
                }

                // Space after control word is consumed
                if (i < len && rtf[i] === ' ') {
                    i++;
                }

                if (!stack[stack.length - 1].skip) {
                    // Check specific control words
                    if (word === 'par' || word === 'line' || word === 'row') {
                        result += '\n';
                    } else if (word === 'tab') {
                        result += '\t';
                    } else if (word === 'u') {
                         // Unicode char \uN
                         // \uN followed by substitute char (usually ? or other)
                         const code = parseInt(param);
                         // Signed 16-bit to char code
                         const charCode = code < 0 ? code + 65536 : code;
                         result += String.fromCharCode(charCode);
                         // Skip replacement char (usually next char? or keyword?)
                         // RTF spec: \uN? ? is replacement if reader doesn't support unicode
                         // We assume 1 char? Usually yes.
                         // Or search for \ucN (chars to skip). Default is 1.
                         // Simplified: just skip 1 char?
                         // Actually wait, ' ' was already consumed if exists?
                         // Often it is \u1234? or \u1234 ?
                         // If we are here, next char might be the replacement.
                         // Let's rely on standard assumption: skip next '?' or char.
                         // But we might be at end of string or next control word.
                         // Let's ignore complex skipping logic for simplified parser.
                    } else if (word === 'fonttbl' || word === 'colortbl' || word === 'stylesheet' || word === 'info') {
                         // These should be destination groups, usually handled by *
                         // But old RTF might not use *.
                         // If we are just inside a group { \fonttbl ... }, mark skip.
                         stack[stack.length - 1].skip = true;
                    }
                }
            }
        } else if (char === '{') {
            // Start group
            // Inherit skip state
            stack.push({ skip: stack[stack.length - 1].skip });
            i++;
        } else if (char === '}') {
            // End group
            if (stack.length > 1) stack.pop();
            i++;
        } else {
            // Regular char
            if (!stack[stack.length - 1].skip) {
                if (char !== '\r' && char !== '\n') {
                    result += char;
                }
            }
            i++;
        }
    }

    return result;
}
