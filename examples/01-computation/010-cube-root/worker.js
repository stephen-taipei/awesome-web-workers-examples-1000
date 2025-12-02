/**
 * #010 立方根計算 - Web Worker
 *
 * 使用牛頓迭代法計算高精度立方根
 * 支援正負數和任意精度的十進位小數計算
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
            calculateCubeRoot(payload.number, payload.precision);
            break;

        case 'CALCULATE_BATCH':
            shouldStop = false;
            calculateBatch(payload.numbers, payload.precision);
            break;

        case 'VERIFY':
            shouldStop = false;
            verifyCubeRoot(payload.number, payload.precision);
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
 * 使用牛頓迭代法計算立方根
 * @param {string} numberStr - 要計算立方根的數字（字串形式）
 * @param {number} precision - 小數位數精度
 */
function calculateCubeRoot(numberStr, precision) {
    const startTime = performance.now();

    try {
        // 解析輸入數字
        const num = parseNumber(numberStr);

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
            payload: { percent: 0, message: '開始計算立方根...' }
        });

        // 使用牛頓迭代法計算（處理負數）
        const isNegative = num.isNegative;
        const absValue = isNegative ? num.value.slice(1) : num.value;

        const result = newtonCbrt(absValue, precision, (percent, message) => {
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

        // 負數的立方根是負的
        const finalResult = isNegative ? '-' + result.value : result.value;

        self.postMessage({
            type: 'CALCULATE_RESULT',
            payload: {
                number: numberStr,
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
 * 批量計算多個數字的立方根
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

            if (num.isZero) {
                results.push({
                    number: numberStr,
                    result: '0'
                });
            } else {
                const isNegative = num.isNegative;
                const absValue = isNegative ? num.value.slice(1) : num.value;
                const cbrt = newtonCbrt(absValue, precision);
                const finalResult = isNegative ? '-' + cbrt.value : cbrt.value;

                results.push({
                    number: numberStr,
                    result: finalResult,
                    iterations: cbrt.iterations
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
 * 驗證立方根計算結果
 * @param {string} numberStr - 原始數字
 * @param {number} precision - 精度
 */
function verifyCubeRoot(numberStr, precision) {
    const startTime = performance.now();

    try {
        const num = parseNumber(numberStr);

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '開始驗證計算...' }
        });

        // 計算立方根
        const isNegative = num.isNegative;
        const absValue = isNegative ? num.value.slice(1) : num.value;

        const cbrt = newtonCbrt(absValue, precision + 10, (percent, message) => {
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent: Math.floor(percent / 2), message }
            });
        });

        if (shouldStop) return;

        const cbrtResult = isNegative ? '-' + cbrt.value : cbrt.value;

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 50, message: '驗證結果中...' }
        });

        // 將結果立方驗證
        const cubed = cubeString(cbrtResult, precision * 2);

        // 計算誤差
        const error = subtractStrings(num.value, cubed);

        const endTime = performance.now();

        self.postMessage({
            type: 'VERIFY_RESULT',
            payload: {
                number: numberStr,
                cubeRoot: cbrtResult,
                cubed: cubed,
                error: error,
                precision: precision,
                iterations: cbrt.iterations,
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
        const isNegative = num.isNegative;
        const absValue = isNegative ? num.value.slice(1) : num.value;

        // 方法 1: 牛頓法
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '測試牛頓迭代法...' }
        });

        const start1 = performance.now();
        const newton = newtonCbrt(absValue, precision);
        const time1 = performance.now() - start1;
        results.push({
            method: '牛頓迭代法',
            result: isNegative ? '-' + newton.value : newton.value,
            iterations: newton.iterations,
            time: time1
        });

        if (shouldStop) return;

        // 方法 2: 哈雷法 (Halley's method)
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 33, message: '測試哈雷法...' }
        });

        const start2 = performance.now();
        const halley = halleyCbrt(absValue, precision);
        const time2 = performance.now() - start2;
        results.push({
            method: '哈雷法 (Halley)',
            result: isNegative ? '-' + halley.value : halley.value,
            iterations: halley.iterations,
            time: time2
        });

        if (shouldStop) return;

        // 方法 3: 二分搜尋法
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 66, message: '測試二分搜尋法...' }
        });

        const start3 = performance.now();
        const binary = binaryCbrt(absValue, precision);
        const time3 = performance.now() - start3;
        results.push({
            method: '二分搜尋法',
            result: isNegative ? '-' + binary.value : binary.value,
            iterations: binary.iterations,
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

    const value = (isNegative ? '-' : '') + parts.join('.');
    const isZero = /^0+(\.0*)?$/.test(str) || str === '0';

    return { value, isNegative, isZero };
}

/**
 * 牛頓迭代法計算立方根
 * x_{n+1} = (2*x_n + S/x_n^2) / 3
 *
 * @param {string} numStr - 數字字串（正數）
 * @param {number} precision - 精度
 * @param {function} progressCallback - 進度回調
 * @returns {object} - 結果和迭代次數
 */
function newtonCbrt(numStr, precision, progressCallback = null) {
    // 轉換為 BigInt 運算的精度因子
    const scale = BigInt(10) ** BigInt(precision + 20);

    // 解析數字為 BigInt（乘以 scale^3 以便進行整數運算）
    const S = stringToBigInt(numStr, precision + 20);

    // 初始猜測值
    let x = initialGuess(numStr, precision + 20);

    let iterations = 0;
    const maxIterations = precision * 2 + 100;
    const steps = [];
    let prevX = 0n;

    const two = 2n;
    const three = 3n;

    while (iterations < maxIterations) {
        if (shouldStop) break;

        // x = (2*x + S/x^2) / 3
        const xSquared = (x * x) / scale;
        const quotient = (S * scale) / xSquared;
        const newX = (two * x + quotient) / three;

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

        // 檢查收斂
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
 * 哈雷法計算立方根（三次收斂）
 * x_{n+1} = x_n * (x_n^3 + 2*S) / (2*x_n^3 + S)
 *
 * @param {string} numStr - 數字字串
 * @param {number} precision - 精度
 * @returns {object} - 結果和迭代次數
 */
function halleyCbrt(numStr, precision) {
    const scale = BigInt(10) ** BigInt(precision + 20);
    const S = stringToBigInt(numStr, precision + 20);

    let x = initialGuess(numStr, precision + 20);

    let iterations = 0;
    const maxIterations = precision + 50;
    let prevX = 0n;

    const two = 2n;

    while (iterations < maxIterations) {
        if (shouldStop) break;

        // x_n^3
        const xCubed = (x * x * x) / (scale * scale);

        // x_{n+1} = x_n * (x_n^3 + 2*S) / (2*x_n^3 + S)
        const numerator = xCubed + two * S;
        const denominator = two * xCubed + S;

        if (denominator === 0n) break;

        const newX = (x * numerator) / denominator;

        iterations++;

        if (newX === prevX || newX === x) {
            break;
        }

        prevX = x;
        x = newX;
    }

    const resultStr = bigIntToString(x, precision + 20);
    return { value: trimPrecision(resultStr, precision), iterations };
}

/**
 * 二分搜尋法計算立方根
 * @param {string} numStr - 數字字串
 * @param {number} precision - 精度
 * @returns {object} - 結果和迭代次數
 */
function binaryCbrt(numStr, precision) {
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
        const midCubed = (mid * mid * mid) / (scale * scale);

        iterations++;

        if (midCubed === S) {
            const resultStr = bigIntToString(mid, precision + 20);
            return { value: trimPrecision(resultStr, precision), iterations };
        } else if (midCubed < S) {
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

    // 對於立方根，需要乘以 scale^3
    decPart = decPart.padEnd(decimalPlaces * 3, '0');

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
    const parts = numStr.split('.');
    const intPart = parts[0];
    const intLength = intPart.length;

    // 立方根初始猜測: 10^(位數/3)
    const guessLength = Math.ceil(intLength / 3);
    let guess = '1' + '0'.repeat(Math.max(0, guessLength - 1));

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
    decPart = decPart.replace(/0+$/, '');

    if (decPart.length === 0) {
        return parts[0];
    }

    return parts[0] + '.' + decPart;
}

/**
 * 計算數字的立方
 * @param {string} numStr - 數字字串
 * @param {number} precision - 精度
 * @returns {string}
 */
function cubeString(numStr, precision) {
    const isNegative = numStr.startsWith('-');
    const absStr = isNegative ? numStr.slice(1) : numStr;

    const scale = BigInt(10) ** BigInt(precision);
    const num = stringToBigIntSimple(absStr, precision);

    // num^3 / scale^2
    const cubed = (num * num * num) / (scale * scale);
    const result = bigIntToString(cubed, precision);

    return isNegative ? '-' + result : result;
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
 * @param {string} numStr - 數字字串
 * @param {number} precision - 精度
 * @returns {boolean}
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
