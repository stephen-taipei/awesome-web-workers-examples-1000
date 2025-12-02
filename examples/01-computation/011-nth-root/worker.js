/**
 * #011 N次方根計算 - Web Worker
 *
 * 使用牛頓迭代法和二分搜尋計算任意次方根
 * 支援整數和分數次方根
 */

// 停止標誌
let shouldStop = false;

/**
 * 訊息處理器
 */
self.onmessage = function (e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'CALCULATE':
            shouldStop = false;
            calculateNthRoot(payload.number, payload.n, payload.precision);
            break;

        case 'CALCULATE_BATCH':
            shouldStop = false;
            calculateBatch(payload.numbers, payload.n, payload.precision);
            break;

        case 'VERIFY':
            shouldStop = false;
            verifyNthRoot(payload.number, payload.n, payload.precision);
            break;

        case 'COMPARE_METHODS':
            shouldStop = false;
            compareMethods(payload.number, payload.n, payload.precision);
            break;

        case 'CALCULATE_TABLE':
            shouldStop = false;
            calculateTable(payload.number, payload.maxN, payload.precision);
            break;

        case 'STOP':
            shouldStop = true;
            break;

        default:
            self.postMessage({
                type: 'ERROR',
                payload: { message: `未知的訊息類型: ${type}` }
            });
    }
};

/**
 * 計算 N 次方根
 * @param {string} numberStr - 要計算方根的數字
 * @param {number} n - 方根次數（可以是小數）
 * @param {number} precision - 小數位數精度
 */
function calculateNthRoot(numberStr, n, precision) {
    const startTime = performance.now();

    try {
        // 驗證輸入
        if (n === 0) {
            throw new Error('次數不能為 0');
        }

        const num = parseNumber(numberStr);

        // 處理特殊情況
        if (num.isZero) {
            if (n < 0) {
                throw new Error('0 的負次方根未定義');
            }
            self.postMessage({
                type: 'CALCULATE_RESULT',
                payload: {
                    number: numberStr,
                    n: n,
                    result: '0',
                    precision: precision,
                    iterations: 0,
                    time: performance.now() - startTime
                }
            });
            return;
        }

        // 處理負數
        if (num.isNegative) {
            // 只有奇數次方根才能處理負數
            if (!isOddRoot(n)) {
                throw new Error(`負數的 ${n} 次方根在實數範圍內未定義`);
            }
        }

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '開始計算...' }
        });

        // 使用牛頓迭代法計算
        const isNegative = num.isNegative;
        const absValue = isNegative ? num.value.replace('-', '') : num.value;

        // 處理負次方根：x^(-1/n) = 1 / x^(1/n)
        const isNegativeN = n < 0;
        const absN = Math.abs(n);

        const result = newtonNthRoot(absValue, absN, precision, (percent, message) => {
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent, message }
            });
        });

        if (shouldStop) {
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent: 0, message: '計算已停止' }
            });
            return;
        }

        let finalResult = result.value;

        // 處理負次方根
        if (isNegativeN) {
            finalResult = divideOne(finalResult, precision);
        }

        // 處理負數
        if (isNegative && isOddRoot(n)) {
            finalResult = '-' + finalResult;
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'CALCULATE_RESULT',
            payload: {
                number: numberStr,
                n: n,
                result: finalResult,
                precision: precision,
                iterations: result.iterations,
                time: endTime - startTime,
                steps: result.steps
            }
        });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: { message: error.message }
        });
    }
}

/**
 * 批量計算同一數字的多個次方根
 * @param {string[]} numbers - 數字陣列
 * @param {number} n - 方根次數
 * @param {number} precision - 精度
 */
function calculateBatch(numbers, n, precision) {
    const startTime = performance.now();
    const results = [];
    const total = numbers.length;

    for (let i = 0; i < numbers.length; i++) {
        if (shouldStop) {
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent: 0, message: '計算已停止' }
            });
            return;
        }

        const numberStr = numbers[i].trim();
        if (!numberStr) continue;

        try {
            const num = parseNumber(numberStr);

            if (num.isZero) {
                results.push({
                    number: numberStr,
                    result: n > 0 ? '0' : '未定義'
                });
            } else if (num.isNegative && !isOddRoot(n)) {
                results.push({
                    number: numberStr,
                    result: '未定義（負數）',
                    error: true
                });
            } else {
                const isNegative = num.isNegative;
                const absValue = isNegative ? num.value.replace('-', '') : num.value;
                const root = newtonNthRoot(absValue, Math.abs(n), precision);

                let finalResult = root.value;
                if (n < 0) {
                    finalResult = divideOne(finalResult, precision);
                }
                if (isNegative && isOddRoot(n)) {
                    finalResult = '-' + finalResult;
                }

                results.push({
                    number: numberStr,
                    result: finalResult,
                    iterations: root.iterations
                });
            }
        } catch (error) {
            results.push({
                number: numberStr,
                result: `錯誤: ${error.message}`,
                error: true
            });
        }

        const percent = Math.floor(((i + 1) / total) * 100);
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent, message: `計算中 ${i + 1}/${total}` }
        });
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'BATCH_RESULT',
        payload: {
            results,
            n,
            precision,
            totalTime: endTime - startTime,
            count: results.length
        }
    });
}

/**
 * 驗證 N 次方根計算結果
 */
function verifyNthRoot(numberStr, n, precision) {
    const startTime = performance.now();

    try {
        const num = parseNumber(numberStr);

        if (num.isNegative && !isOddRoot(n)) {
            throw new Error(`負數的 ${n} 次方根在實數範圍內未定義`);
        }

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '開始驗證計算...' }
        });

        const isNegative = num.isNegative;
        const absValue = isNegative ? num.value.replace('-', '') : num.value;
        const absN = Math.abs(n);

        const root = newtonNthRoot(absValue, absN, precision + 10, (percent, message) => {
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent: Math.floor(percent / 2), message }
            });
        });

        if (shouldStop) return;

        let rootResult = root.value;
        if (n < 0) {
            rootResult = divideOne(rootResult, precision + 10);
        }
        if (isNegative && isOddRoot(n)) {
            rootResult = '-' + rootResult;
        }

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 50, message: '驗證結果中...' }
        });

        // 將結果做 n 次方驗證
        const powered = powerString(rootResult, n, precision * 2);

        // 計算誤差
        const error = subtractStrings(num.value, powered);

        const endTime = performance.now();

        self.postMessage({
            type: 'VERIFY_RESULT',
            payload: {
                number: numberStr,
                n: n,
                nthRoot: rootResult,
                powered: powered,
                error: error,
                precision: precision,
                iterations: root.iterations,
                time: endTime - startTime,
                isAccurate: isCloseToZero(error, precision)
            }
        });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: { message: error.message }
        });
    }
}

/**
 * 比較不同方法的效能
 */
function compareMethods(numberStr, n, precision) {
    const results = [];

    try {
        const num = parseNumber(numberStr);

        if (num.isNegative && !isOddRoot(n)) {
            throw new Error(`負數的 ${n} 次方根在實數範圍內未定義`);
        }

        const isNegative = num.isNegative;
        const absValue = isNegative ? num.value.replace('-', '') : num.value;
        const absN = Math.abs(n);

        // 方法 1: 牛頓法
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '測試牛頓迭代法...' }
        });

        const start1 = performance.now();
        const newton = newtonNthRoot(absValue, absN, precision);
        const time1 = performance.now() - start1;

        let newtonResult = newton.value;
        if (n < 0) newtonResult = divideOne(newtonResult, precision);
        if (isNegative && isOddRoot(n)) newtonResult = '-' + newtonResult;

        results.push({
            method: '牛頓迭代法',
            result: newtonResult,
            iterations: newton.iterations,
            time: time1
        });

        if (shouldStop) return;

        // 方法 2: 二分搜尋法
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 50, message: '測試二分搜尋法...' }
        });

        const start2 = performance.now();
        const binary = binaryNthRoot(absValue, absN, precision);
        const time2 = performance.now() - start2;

        let binaryResult = binary.value;
        if (n < 0) binaryResult = divideOne(binaryResult, precision);
        if (isNegative && isOddRoot(n)) binaryResult = '-' + binaryResult;

        results.push({
            method: '二分搜尋法',
            result: binaryResult,
            iterations: binary.iterations,
            time: time2
        });

        self.postMessage({
            type: 'COMPARE_RESULT',
            payload: {
                number: numberStr,
                n: n,
                precision,
                results
            }
        });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: { message: error.message }
        });
    }
}

/**
 * 計算同一數字的多個次方根表格
 */
function calculateTable(numberStr, maxN, precision) {
    const startTime = performance.now();
    const results = [];

    try {
        const num = parseNumber(numberStr);

        if (num.isNegative) {
            throw new Error('表格計算僅支援正數');
        }

        if (num.isZero) {
            for (let i = 2; i <= maxN; i++) {
                results.push({ n: i, result: '0' });
            }
            self.postMessage({
                type: 'TABLE_RESULT',
                payload: { number: numberStr, results, precision, totalTime: 0 }
            });
            return;
        }

        const absValue = num.value;

        for (let i = 2; i <= maxN; i++) {
            if (shouldStop) {
                self.postMessage({
                    type: 'PROGRESS',
                    payload: { percent: 0, message: '計算已停止' }
                });
                return;
            }

            const root = newtonNthRoot(absValue, i, precision);
            results.push({
                n: i,
                result: root.value,
                iterations: root.iterations
            });

            const percent = Math.floor(((i - 1) / (maxN - 1)) * 100);
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent, message: `計算 ${i} 次方根...` }
            });
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'TABLE_RESULT',
            payload: {
                number: numberStr,
                results,
                precision,
                totalTime: endTime - startTime
            }
        });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: { message: error.message }
        });
    }
}

// ============ 高精度數學運算 ============

/**
 * 解析數字字串
 */
function parseNumber(str) {
    str = str.trim();
    const isNegative = str.startsWith('-');
    if (isNegative) str = str.slice(1);

    const parts = str.split('.');
    parts[0] = parts[0].replace(/^0+/, '') || '0';

    const value = (isNegative ? '-' : '') + parts.join('.');
    const isZero = /^0+(\.0*)?$/.test(str) || str === '0';

    return { value, isNegative, isZero };
}

/**
 * 判斷是否為奇數次方根
 */
function isOddRoot(n) {
    // 處理分數次方根
    if (!Number.isInteger(n)) {
        // 將分數簡化
        const [num, den] = toFraction(n);
        // 如果分子是奇數，則可以處理負數
        return num % 2 !== 0;
    }
    return n % 2 !== 0;
}

/**
 * 將小數轉換為分數（近似）
 */
function toFraction(decimal) {
    const tolerance = 1e-10;
    let num = 1;
    let den = 1;

    // 簡單的連分數展開
    let x = decimal;
    let a = Math.floor(x);
    let h1 = 1, h2 = 0;
    let k1 = 0, k2 = 1;
    let h = a;
    let k = 1;

    while (Math.abs(decimal - h / k) > tolerance && k < 10000) {
        x = 1 / (x - a);
        a = Math.floor(x);

        const h_new = a * h + h1;
        const k_new = a * k + k1;

        h1 = h;
        k1 = k;
        h = h_new;
        k = k_new;
    }

    return [h, k];
}

/**
 * 牛頓迭代法計算 N 次方根
 * x_{n+1} = ((n-1) * x_n + S / x_n^(n-1)) / n
 */
function newtonNthRoot(numStr, n, precision, progressCallback = null) {
    const scale = BigInt(10) ** BigInt(precision + 20);
    const S = stringToBigInt(numStr, precision + 20, n);

    let x = initialGuess(numStr, precision + 20, n);

    let iterations = 0;
    const maxIterations = precision * 3 + 100;
    const steps = [];
    let prevX = 0n;

    const nBig = BigInt(Math.round(n));
    const nMinus1 = nBig - 1n;

    // 對於非整數 n，使用不同的方法
    const isIntegerN = Number.isInteger(n);

    while (iterations < maxIterations) {
        if (shouldStop) break;

        let newX;

        if (isIntegerN) {
            // x = ((n-1) * x + S / x^(n-1)) / n
            let xPowNMinus1 = x;
            for (let i = 1n; i < nMinus1; i++) {
                xPowNMinus1 = (xPowNMinus1 * x) / scale;
            }

            if (xPowNMinus1 === 0n) break;

            const quotient = (S * scale) / xPowNMinus1;
            newX = (nMinus1 * x + quotient) / nBig;
        } else {
            // 對於非整數 n，使用對數法轉換
            // 這裡簡化處理，使用近似的整數方法
            const approxN = Math.round(n);
            const nB = BigInt(approxN);
            const nM1 = nB - 1n;

            let xPowNMinus1 = x;
            for (let i = 1n; i < nM1; i++) {
                xPowNMinus1 = (xPowNMinus1 * x) / scale;
            }

            if (xPowNMinus1 === 0n) break;

            const quotient = (S * scale) / xPowNMinus1;
            newX = (nM1 * x + quotient) / nB;
        }

        iterations++;

        if (iterations <= 10) {
            steps.push({
                iteration: iterations,
                value: bigIntToString(newX, precision + 20).slice(0, 50) + '...'
            });
        }

        if (progressCallback && iterations % 10 === 0) {
            const estimatedProgress = Math.min(95, iterations * 2);
            progressCallback(estimatedProgress, `迭代 ${iterations}...`);
        }

        if (newX === prevX || newX === x) {
            break;
        }

        prevX = x;
        x = newX;
    }

    const resultStr = bigIntToString(x, precision + 20);
    const trimmedResult = trimPrecision(resultStr, precision);

    return {
        value: trimmedResult,
        iterations,
        steps
    };
}

/**
 * 二分搜尋法計算 N 次方根
 */
function binaryNthRoot(numStr, n, precision) {
    const scale = BigInt(10) ** BigInt(precision + 20);
    const S = stringToBigInt(numStr, precision + 20, n);

    let low = 1n;
    let high = S > scale ? S : scale;

    let iterations = 0;
    const maxIterations = (precision + 20) * 5;
    const nInt = Math.round(n);

    while (iterations < maxIterations) {
        if (shouldStop) break;

        const mid = (low + high) / 2n;

        // 計算 mid^n
        let midPowN = mid;
        for (let i = 1; i < nInt; i++) {
            midPowN = (midPowN * mid) / scale;
        }

        iterations++;

        if (midPowN === S) {
            const resultStr = bigIntToString(mid, precision + 20);
            return { value: trimPrecision(resultStr, precision), iterations };
        } else if (midPowN < S) {
            if (low === mid) break;
            low = mid;
        } else {
            if (high === mid) break;
            high = mid;
        }

        if (high - low <= 1n) break;
    }

    const result = (low + high) / 2n;
    const resultStr = bigIntToString(result, precision + 20);
    return { value: trimPrecision(resultStr, precision), iterations };
}

/**
 * 將字串數字轉換為 BigInt
 */
function stringToBigInt(str, decimalPlaces, n) {
    const parts = str.split('.');
    let intPart = parts[0] || '0';
    let decPart = parts[1] || '';

    if (decPart.length < decimalPlaces) {
        decPart = decPart.padEnd(decimalPlaces, '0');
    } else {
        decPart = decPart.slice(0, decimalPlaces);
    }

    // 乘以 scale^n
    const nInt = Math.round(n);
    decPart = decPart.padEnd(decimalPlaces * nInt, '0');

    return BigInt(intPart + decPart);
}

/**
 * 將 BigInt 轉換為字串
 */
function bigIntToString(num, decimalPlaces) {
    let str = num.toString();

    if (str.length <= decimalPlaces) {
        str = str.padStart(decimalPlaces + 1, '0');
    }

    const intPart = str.slice(0, str.length - decimalPlaces) || '0';
    const decPart = str.slice(str.length - decimalPlaces);

    return intPart + '.' + decPart;
}

/**
 * 計算初始猜測值
 */
function initialGuess(numStr, decimalPlaces, n) {
    const parts = numStr.split('.');
    const intPart = parts[0];
    const intLength = intPart.length;

    const guessLength = Math.ceil(intLength / n);
    let guess = '1' + '0'.repeat(Math.max(0, guessLength - 1));

    guess = guess + '0'.repeat(decimalPlaces);

    return BigInt(guess);
}

/**
 * 截斷到指定精度
 */
function trimPrecision(numStr, precision) {
    const parts = numStr.split('.');
    if (parts.length === 1) return numStr;

    let decPart = parts[1].slice(0, precision);
    decPart = decPart.replace(/0+$/, '');

    if (decPart.length === 0) {
        return parts[0];
    }

    return parts[0] + '.' + decPart;
}

/**
 * 計算 1 / x
 */
function divideOne(numStr, precision) {
    const scale = BigInt(10) ** BigInt(precision + 20);
    const num = stringToBigIntSimple(numStr, precision + 20);

    if (num === 0n) return 'Infinity';

    const result = (scale * scale) / num;
    const resultStr = bigIntToString(result, precision + 20);
    return trimPrecision(resultStr, precision);
}

/**
 * 計算 x^n（整數次方）
 */
function powerString(numStr, n, precision) {
    const isNegative = numStr.startsWith('-');
    const absStr = isNegative ? numStr.slice(1) : numStr;

    const scale = BigInt(10) ** BigInt(precision);
    let result = stringToBigIntSimple(absStr, precision);

    const absN = Math.abs(Math.round(n));

    // 計算 x^n
    let power = result;
    for (let i = 1; i < absN; i++) {
        power = (power * result) / scale;
    }

    // 負次方
    if (n < 0) {
        power = (scale * scale) / power;
    }

    let resultStr = bigIntToString(power, precision);

    // 處理負數的奇數次方
    if (isNegative && absN % 2 !== 0) {
        resultStr = '-' + resultStr;
    }

    return trimPrecision(resultStr, precision);
}

/**
 * 簡單的字串轉 BigInt
 */
function stringToBigIntSimple(str, decimalPlaces) {
    str = str.replace('-', '');
    const parts = str.split('.');
    let intPart = parts[0] || '0';
    let decPart = parts[1] || '';

    if (decPart.length < decimalPlaces) {
        decPart = decPart.padEnd(decimalPlaces, '0');
    } else {
        decPart = decPart.slice(0, decimalPlaces);
    }

    return BigInt(intPart + decPart);
}

/**
 * 高精度減法
 */
function subtractStrings(a, b) {
    const aIsNeg = a.startsWith('-');
    const bIsNeg = b.startsWith('-');

    const precision = Math.max(
        (a.replace('-', '').split('.')[1] || '').length,
        (b.replace('-', '').split('.')[1] || '').length
    );

    const aInt = stringToBigIntSimple(a.replace('-', ''), precision) * (aIsNeg ? -1n : 1n);
    const bInt = stringToBigIntSimple(b.replace('-', ''), precision) * (bIsNeg ? -1n : 1n);

    const result = aInt - bInt;
    const isNegative = result < 0n;
    const absResult = isNegative ? -result : result;

    let str = bigIntToString(absResult, precision);
    return (isNegative ? '-' : '') + str;
}

/**
 * 檢查數字是否接近零
 */
function isCloseToZero(numStr, precision) {
    const str = numStr.replace('-', '');
    const parts = str.split('.');

    if (parts[0] !== '0') return false;
    if (!parts[1]) return true;

    const firstNonZero = parts[1].search(/[1-9]/);
    if (firstNonZero === -1) return true;

    return firstNonZero >= precision - 2;
}

// 報告 Worker 已準備就緒
self.postMessage({
    type: 'READY',
    payload: { message: 'Worker 已準備就緒' }
});
