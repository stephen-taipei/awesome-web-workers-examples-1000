/**
 * #009 平方根計算 - Web Worker
 *
 * 使用牛頓迭代法（巴比倫法）計算高精度平方根
 * 支援任意精度的十進位小數計算
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
            calculateSquareRoot(payload.number, payload.precision);
            break;

        case 'CALCULATE_BATCH':
            shouldStop = false;
            calculateBatch(payload.numbers, payload.precision);
            break;

        case 'VERIFY':
            shouldStop = false;
            verifySquareRoot(payload.number, payload.precision);
            break;

        case 'COMPARE_METHODS':
            shouldStop = false;
            compareMethods(payload.number, payload.precision);
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
 * 使用牛頓迭代法計算平方根
 * @param {string} numberStr - 要計算平方根的數字（字串形式）
 * @param {number} precision - 小數位數精度
 */
function calculateSquareRoot(numberStr, precision) {
    const startTime = performance.now();

    try {
        // 解析輸入數字
        const num = parseNumber(numberStr);
        if (num.isNegative) {
            throw new Error('無法計算負數的平方根');
        }
        if (num.isZero) {
            self.postMessage({
                type: 'CALCULATE_RESULT',
                payload: {
                    number: numberStr,
                    result: '0',
                    precision: precision,
                    iterations: 0,
                    time: performance.now() - startTime
                }
            });
            return;
        }

        // 報告開始計算
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '開始計算平方根...' }
        });

        // 使用牛頓迭代法計算
        const result = newtonSqrt(num.value, precision, (percent, message) => {
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

        const endTime = performance.now();

        self.postMessage({
            type: 'CALCULATE_RESULT',
            payload: {
                number: numberStr,
                result: result.value,
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
 * 批量計算多個數字的平方根
 * @param {string[]} numbers - 數字陣列
 * @param {number} precision - 精度
 */
function calculateBatch(numbers, precision) {
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
            if (num.isNegative) {
                results.push({
                    number: numberStr,
                    result: 'N/A (負數)',
                    error: true
                });
            } else if (num.isZero) {
                results.push({
                    number: numberStr,
                    result: '0'
                });
            } else {
                const sqrt = newtonSqrt(num.value, precision);
                results.push({
                    number: numberStr,
                    result: sqrt.value,
                    iterations: sqrt.iterations
                });
            }
        } catch (error) {
            results.push({
                number: numberStr,
                result: `錯誤: ${error.message}`,
                error: true
            });
        }

        // 報告進度
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
            precision,
            totalTime: endTime - startTime,
            count: results.length
        }
    });
}

/**
 * 驗證平方根計算結果
 * @param {string} numberStr - 原始數字
 * @param {number} precision - 精度
 */
function verifySquareRoot(numberStr, precision) {
    const startTime = performance.now();

    try {
        const num = parseNumber(numberStr);
        if (num.isNegative) {
            throw new Error('無法計算負數的平方根');
        }

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '開始驗證計算...' }
        });

        // 計算平方根
        const sqrt = newtonSqrt(num.value, precision + 10, (percent, message) => {
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent: Math.floor(percent / 2), message }
            });
        });

        if (shouldStop) return;

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 50, message: '驗證結果中...' }
        });

        // 將結果平方驗證
        const squared = multiplyStrings(sqrt.value, sqrt.value, precision * 2);

        // 計算誤差
        const error = subtractStrings(num.value, squared);

        const endTime = performance.now();

        self.postMessage({
            type: 'VERIFY_RESULT',
            payload: {
                number: numberStr,
                squareRoot: sqrt.value,
                squared: squared,
                error: error,
                precision: precision,
                iterations: sqrt.iterations,
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
 * @param {string} numberStr - 數字
 * @param {number} precision - 精度
 */
function compareMethods(numberStr, precision) {
    const results = [];

    try {
        const num = parseNumber(numberStr);
        if (num.isNegative) {
            throw new Error('無法計算負數的平方根');
        }

        // 方法 1: 標準牛頓法
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '測試牛頓迭代法...' }
        });

        const start1 = performance.now();
        const newton = newtonSqrt(num.value, precision);
        const time1 = performance.now() - start1;
        results.push({
            method: '牛頓迭代法 (Babylonian)',
            result: newton.value,
            iterations: newton.iterations,
            time: time1
        });

        if (shouldStop) return;

        // 方法 2: 二分搜尋法
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 33, message: '測試二分搜尋法...' }
        });

        const start2 = performance.now();
        const binary = binarySqrt(num.value, precision);
        const time2 = performance.now() - start2;
        results.push({
            method: '二分搜尋法',
            result: binary.value,
            iterations: binary.iterations,
            time: time2
        });

        if (shouldStop) return;

        // 方法 3: 數位逐位法
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 66, message: '測試數位逐位法...' }
        });

        const start3 = performance.now();
        const digit = digitByDigitSqrt(num.value, precision);
        const time3 = performance.now() - start3;
        results.push({
            method: '數位逐位法',
            result: digit.value,
            iterations: digit.iterations,
            time: time3
        });

        self.postMessage({
            type: 'COMPARE_RESULT',
            payload: {
                number: numberStr,
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

// ============ 高精度數學運算 ============

/**
 * 解析數字字串
 * @param {string} str - 數字字串
 * @returns {object} - 解析結果
 */
function parseNumber(str) {
    str = str.trim();
    const isNegative = str.startsWith('-');
    if (isNegative) str = str.slice(1);

    // 移除前導零（但保留小數點前的一個零）
    const parts = str.split('.');
    parts[0] = parts[0].replace(/^0+/, '') || '0';

    const value = parts.join('.');
    const isZero = /^0+(\.0*)?$/.test(str) || str === '0';

    return { value, isNegative, isZero };
}

/**
 * 牛頓迭代法計算平方根
 * x_{n+1} = (x_n + S/x_n) / 2
 *
 * @param {string} numStr - 數字字串
 * @param {number} precision - 精度
 * @param {function} progressCallback - 進度回調
 * @returns {object} - 結果和迭代次數
 */
function newtonSqrt(numStr, precision, progressCallback = null) {
    // 轉換為 BigInt 運算的精度因子
    const scale = BigInt(10) ** BigInt(precision + 20); // 額外精度用於中間計算

    // 解析數字為 BigInt（乘以 scale^2 以便進行整數運算）
    const S = stringToBigInt(numStr, precision + 20);

    // 初始猜測值（使用數字的一半位數作為估計）
    let x = initialGuess(numStr, precision + 20);

    let iterations = 0;
    const maxIterations = precision * 2 + 100;
    const steps = [];
    let prevX = 0n;

    while (iterations < maxIterations) {
        if (shouldStop) break;

        // x = (x + S/x) / 2
        const quotient = (S * scale) / x;
        const newX = (x + quotient) / 2n;

        iterations++;

        // 記錄前幾步
        if (iterations <= 10) {
            steps.push({
                iteration: iterations,
                value: bigIntToString(newX, precision + 20).slice(0, 50) + '...'
            });
        }

        // 報告進度
        if (progressCallback && iterations % 10 === 0) {
            const estimatedProgress = Math.min(95, iterations * 2);
            progressCallback(estimatedProgress, `迭代 ${iterations}...`);
        }

        // 檢查收斂（當 x 不再變化時）
        if (newX === prevX || newX === x) {
            break;
        }

        prevX = x;
        x = newX;
    }

    // 轉換結果為字串
    const resultStr = bigIntToString(x, precision + 20);
    const trimmedResult = trimPrecision(resultStr, precision);

    return {
        value: trimmedResult,
        iterations,
        steps
    };
}

/**
 * 二分搜尋法計算平方根
 * @param {string} numStr - 數字字串
 * @param {number} precision - 精度
 * @returns {object} - 結果和迭代次數
 */
function binarySqrt(numStr, precision) {
    const scale = BigInt(10) ** BigInt(precision + 20);
    const S = stringToBigInt(numStr, precision + 20);

    // 設定搜尋範圍
    let low = 1n;
    let high = S > scale ? S : scale;

    let iterations = 0;
    const maxIterations = (precision + 20) * 4;

    while (iterations < maxIterations) {
        if (shouldStop) break;

        const mid = (low + high) / 2n;
        const midSquared = (mid * mid) / scale;

        iterations++;

        if (midSquared === S) {
            const resultStr = bigIntToString(mid, precision + 20);
            return { value: trimPrecision(resultStr, precision), iterations };
        } else if (midSquared < S) {
            if (low === mid) break;
            low = mid;
        } else {
            if (high === mid) break;
            high = mid;
        }

        // 當範圍足夠小時停止
        if (high - low <= 1n) break;
    }

    const result = (low + high) / 2n;
    const resultStr = bigIntToString(result, precision + 20);
    return { value: trimPrecision(resultStr, precision), iterations };
}

/**
 * 數位逐位法計算平方根
 * @param {string} numStr - 數字字串
 * @param {number} precision - 精度
 * @returns {object} - 結果和迭代次數
 */
function digitByDigitSqrt(numStr, precision) {
    const scale = BigInt(10) ** BigInt(precision + 20);
    const S = stringToBigInt(numStr, precision + 20);

    let result = 0n;
    let remainder = S;
    let iterations = 0;

    // 找到最高位的起始點
    let bit = 1n;
    while (bit * bit <= S) {
        bit *= 10n;
    }
    bit /= 10n;

    while (bit > 0n && iterations < precision + 50) {
        if (shouldStop) break;

        iterations++;
        const test = result + bit;

        if (test * test <= S * scale / (scale / (bit * bit))) {
            if ((result + bit) * (result + bit) <= S) {
                result = result + bit;
            }
        }

        // 嘗試添加這個位
        if ((result + bit) * (result + bit) <= S) {
            result += bit;
        }

        bit /= 10n;
    }

    const resultStr = bigIntToString(result, precision + 20);
    return { value: trimPrecision(resultStr, precision), iterations };
}

/**
 * 將字串數字轉換為 BigInt（考慮小數）
 * @param {string} str - 數字字串
 * @param {number} decimalPlaces - 小數位數
 * @returns {bigint}
 */
function stringToBigInt(str, decimalPlaces) {
    const parts = str.split('.');
    let intPart = parts[0] || '0';
    let decPart = parts[1] || '';

    // 補齊或截斷小數部分
    if (decPart.length < decimalPlaces) {
        decPart = decPart.padEnd(decimalPlaces, '0');
    } else {
        decPart = decPart.slice(0, decimalPlaces);
    }

    // 對於平方根，需要乘以 scale^2
    decPart = decPart.padEnd(decimalPlaces * 2, '0');

    return BigInt(intPart + decPart);
}

/**
 * 將 BigInt 轉換為字串（考慮小數）
 * @param {bigint} num - BigInt 數字
 * @param {number} decimalPlaces - 小數位數
 * @returns {string}
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
 * @param {string} numStr - 數字字串
 * @param {number} decimalPlaces - 小數位數
 * @returns {bigint}
 */
function initialGuess(numStr, decimalPlaces) {
    // 使用數字的一半位數作為初始猜測
    const parts = numStr.split('.');
    const intPart = parts[0];
    const intLength = intPart.length;

    // 初始猜測: 10^(位數/2)
    const guessLength = Math.ceil(intLength / 2);
    let guess = '1' + '0'.repeat(guessLength - 1);

    // 轉換為帶精度的 BigInt
    guess = guess + '0'.repeat(decimalPlaces);

    return BigInt(guess);
}

/**
 * 截斷到指定精度
 * @param {string} numStr - 數字字串
 * @param {number} precision - 精度
 * @returns {string}
 */
function trimPrecision(numStr, precision) {
    const parts = numStr.split('.');
    if (parts.length === 1) return numStr;

    let decPart = parts[1].slice(0, precision);
    // 移除尾部的零
    decPart = decPart.replace(/0+$/, '');

    if (decPart.length === 0) {
        return parts[0];
    }

    return parts[0] + '.' + decPart;
}

/**
 * 高精度乘法
 * @param {string} a - 第一個數
 * @param {string} b - 第二個數
 * @param {number} precision - 精度
 * @returns {string}
 */
function multiplyStrings(a, b, precision) {
    const scale = BigInt(10) ** BigInt(precision);
    const aInt = stringToBigIntSimple(a, precision);
    const bInt = stringToBigIntSimple(b, precision);

    const result = (aInt * bInt) / scale;
    return bigIntToString(result, precision);
}

/**
 * 簡單的字串轉 BigInt
 */
function stringToBigIntSimple(str, decimalPlaces) {
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
 * @param {string} a - 被減數
 * @param {string} b - 減數
 * @returns {string}
 */
function subtractStrings(a, b) {
    const precision = Math.max(
        (a.split('.')[1] || '').length,
        (b.split('.')[1] || '').length
    );

    const aInt = stringToBigIntSimple(a, precision);
    const bInt = stringToBigIntSimple(b, precision);

    const result = aInt - bInt;
    const isNegative = result < 0n;
    const absResult = isNegative ? -result : result;

    let str = bigIntToString(absResult, precision);
    return (isNegative ? '-' : '') + str;
}

/**
 * 檢查數字是否接近零
 * @param {string} numStr - 數字字串
 * @param {number} precision - 精度
 * @returns {boolean}
 */
function isCloseToZero(numStr, precision) {
    const str = numStr.replace('-', '');
    const parts = str.split('.');

    if (parts[0] !== '0') return false;
    if (!parts[1]) return true;

    // 檢查小數部分的有效數字位置
    const firstNonZero = parts[1].search(/[1-9]/);
    if (firstNonZero === -1) return true;

    return firstNonZero >= precision - 2;
}

// 報告 Worker 已準備就緒
self.postMessage({
    type: 'READY',
    payload: { message: 'Worker 已準備就緒' }
});
