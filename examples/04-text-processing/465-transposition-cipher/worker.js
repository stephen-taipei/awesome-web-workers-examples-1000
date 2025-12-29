self.onmessage = function(e) {
    const { type, payload } = e.data;
    if (type === 'PROCESS') process(payload.text, payload.key, payload.mode);
};

function process(text, key, mode) {
    const startTime = performance.now();
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: 'Processing...' } });

    // Get column order from key
    const keyChars = key.split('').map((c, i) => ({ char: c, index: i }));
    keyChars.sort((a, b) => a.char.localeCompare(b.char));
    const order = keyChars.map(k => k.index);

    let result, grid;

    if (mode === 'encrypt') {
        const encrypted = encrypt(text, key.length, order);
        result = encrypted.result;
        grid = encrypted.grid;
    } else {
        const decrypted = decrypt(text, key.length, order);
        result = decrypted.result;
        grid = decrypted.grid;
    }

    self.postMessage({
        type: 'RESULT',
        payload: {
            original: text,
            result,
            key,
            order,
            grid,
            mode,
            duration: performance.now() - startTime
        }
    });
}

function encrypt(text, numCols, order) {
    const numRows = Math.ceil(text.length / numCols);
    const grid = [];

    // Fill grid row by row
    for (let r = 0; r < numRows; r++) {
        const row = [];
        for (let c = 0; c < numCols; c++) {
            const idx = r * numCols + c;
            row.push(idx < text.length ? text[idx] : 'X');
        }
        grid.push(row);
    }

    // Read columns in order
    let result = '';
    for (let i = 0; i < numCols; i++) {
        const colIdx = order.indexOf(i);
        for (let r = 0; r < numRows; r++) {
            result += grid[r][colIdx];
        }
    }

    return { result, grid };
}

function decrypt(text, numCols, order) {
    const numRows = Math.ceil(text.length / numCols);
    const grid = Array(numRows).fill(null).map(() => Array(numCols).fill(''));

    // Fill columns in order
    let idx = 0;
    for (let i = 0; i < numCols; i++) {
        const colIdx = order.indexOf(i);
        for (let r = 0; r < numRows; r++) {
            if (idx < text.length) {
                grid[r][colIdx] = text[idx++];
            }
        }
    }

    // Read row by row
    let result = '';
    for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
            result += grid[r][c];
        }
    }

    return { result, grid };
}
