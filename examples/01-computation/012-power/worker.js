/**
 * #012 冪運算 - Web Worker
 *
 * 使用快速冪算法計算大數冪運算
 * 支援 BigInt 處理超大數字
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
            calculatePower(payload.base, payload.exponent);
            break;

        case 'CALCULATE_BATCH':
            shouldStop = false;
            calculateBatch(payload.calculations);
            break;

        case 'POWER_OF_TWO':
            shouldStop = false;
            calculatePowerOfTwo(payload.exponent, payload.showDigits);
            break;

        case 'COMPARE_METHODS':
            shouldStop = false;
            compareMethods(payload.base, payload.exponent);
            break;

        case 'TOWER':
            shouldStop = false;
            calculateTower(payload.base, payload.height, payload.maxDigits);
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
 * 計算冪運算
 * @param {string} baseStr - 底數
 * @param {string} expStr - 指數
 */
function calculatePower(baseStr, expStr) {
    const startTime = performance.now();

    try {
        const base = BigInt(baseStr);
        const exp = BigInt(expStr);

        if (exp < 0n) {
            // 負指數返回分數形式
            const positiveExp = -exp;
            const result = fastPower(base, positiveExp, (percent, message) => {
                self.postMessage({
                    type: 'PROGRESS',
                    payload: { percent, message }
                });
            });

            const endTime = performance.now();
            const resultStr = result.toString();

            self.postMessage({
                type: 'CALCULATE_RESULT',
                payload: {
                    base: baseStr,
                    exponent: expStr,
                    result: `1/${resultStr}`,
                    resultFull: resultStr,
                    isNegativeExp: true,
                    digitCount: resultStr.length,
                    time: endTime - startTime
                }
            });
            return;
        }

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '開始計算...' }
        });

        const result = fastPower(base, exp, (percent, message) => {
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
        const resultStr = result.toString();

        self.postMessage({
            type: 'CALCULATE_RESULT',
            payload: {
                base: baseStr,
                exponent: expStr,
                result: resultStr,
                digitCount: resultStr.length,
                time: endTime - startTime,
                preview: resultStr.length > 100 ?
                    resultStr.slice(0, 50) + '...' + resultStr.slice(-50) :
                    resultStr
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
 * 批量計算
 * @param {Array} calculations - [{base, exponent}, ...]
 */
function calculateBatch(calculations) {
    const startTime = performance.now();
    const results = [];
    const total = calculations.length;

    for (let i = 0; i < calculations.length; i++) {
        if (shouldStop) {
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent: 0, message: '計算已停止' }
            });
            return;
        }

        const { base, exponent } = calculations[i];

        try {
            const b = BigInt(base);
            const e = BigInt(exponent);
            const result = fastPower(b, e < 0n ? -e : e);
            const resultStr = result.toString();

            results.push({
                base,
                exponent,
                result: e < 0n ? `1/${resultStr}` : resultStr,
                digitCount: resultStr.length
            });
        } catch (error) {
            results.push({
                base,
                exponent,
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
            totalTime: endTime - startTime,
            count: results.length
        }
    });
}

/**
 * 計算 2 的冪次
 * @param {string} expStr - 指數
 * @param {boolean} showDigits - 是否顯示完整數字
 */
function calculatePowerOfTwo(expStr, showDigits) {
    const startTime = performance.now();

    try {
        const exp = BigInt(expStr);

        if (exp < 0n) {
            throw new Error('指數必須是非負整數');
        }

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '計算 2 的冪次...' }
        });

        // 使用位移運算快速計算 2^n
        const result = 1n << exp;
        const resultStr = result.toString();

        const endTime = performance.now();

        // 計算位數：log10(2^n) = n * log10(2) ≈ n * 0.30103
        const estimatedDigits = Math.ceil(Number(exp) * 0.30103);

        // 分析數字特性
        const analysis = analyzePowerOfTwo(exp, result);

        self.postMessage({
            type: 'POWER_OF_TWO_RESULT',
            payload: {
                exponent: expStr,
                result: showDigits ? resultStr : null,
                preview: resultStr.length > 100 ?
                    resultStr.slice(0, 50) + '...' + resultStr.slice(-50) :
                    resultStr,
                digitCount: resultStr.length,
                estimatedDigits,
                time: endTime - startTime,
                analysis
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
 * 分析 2 的冪次特性
 */
function analyzePowerOfTwo(exp, result) {
    const resultStr = result.toString();
    const expNum = Number(exp);

    return {
        // 位元數
        bitLength: expNum + 1,
        // 十六進位位數
        hexDigits: Math.ceil((expNum + 1) / 4),
        // 首位數字
        firstDigits: resultStr.slice(0, 10),
        // 末位數字
        lastDigits: resultStr.slice(-10),
        // 特殊值檢查
        isPowerOfTen: expNum > 0 && resultStr.match(/^1(0+)$/) !== null,
        // 常見用途
        usage: getPowerOfTwoUsage(expNum)
    };
}

/**
 * 獲取 2 的冪次的常見用途
 */
function getPowerOfTwoUsage(exp) {
    const usages = {
        8: '1 Byte (256)',
        10: '1 KB (1024)',
        16: '65536 (16位元最大值+1)',
        20: '1 MB (約100萬)',
        30: '1 GB (約10億)',
        32: '4 GB (32位元定址)',
        40: '1 TB (約1兆)',
        64: '64位元定址上限',
        128: 'GUID 位數',
        256: 'SHA-256 可能值',
        512: 'SHA-512 可能值'
    };

    return usages[exp] || null;
}

/**
 * 比較不同方法的效能
 */
function compareMethods(baseStr, expStr) {
    const results = [];

    try {
        const base = BigInt(baseStr);
        const exp = BigInt(expStr);

        if (exp < 0n) {
            throw new Error('比較方法需要非負指數');
        }

        // 方法 1: 快速冪（二進位指數）
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '測試快速冪算法...' }
        });

        const start1 = performance.now();
        const result1 = fastPower(base, exp);
        const time1 = performance.now() - start1;
        const result1Str = result1.toString();

        results.push({
            method: '快速冪算法（二進位指數）',
            result: result1Str.length > 50 ?
                result1Str.slice(0, 25) + '...' + result1Str.slice(-25) :
                result1Str,
            digitCount: result1Str.length,
            time: time1,
            complexity: 'O(log n)'
        });

        if (shouldStop) return;

        // 方法 2: 樸素迭代法（僅限小指數）
        if (exp <= 10000n) {
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent: 50, message: '測試樸素迭代法...' }
            });

            const start2 = performance.now();
            const result2 = naivePower(base, exp);
            const time2 = performance.now() - start2;
            const result2Str = result2.toString();

            results.push({
                method: '樸素迭代法',
                result: result2Str.length > 50 ?
                    result2Str.slice(0, 25) + '...' + result2Str.slice(-25) :
                    result2Str,
                digitCount: result2Str.length,
                time: time2,
                complexity: 'O(n)'
            });
        } else {
            results.push({
                method: '樸素迭代法',
                result: '（指數過大，跳過）',
                digitCount: 0,
                time: 0,
                complexity: 'O(n)',
                skipped: true
            });
        }

        // 方法 3: 原生 ** 運算符
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 75, message: '測試原生運算符...' }
        });

        const start3 = performance.now();
        const result3 = base ** exp;
        const time3 = performance.now() - start3;
        const result3Str = result3.toString();

        results.push({
            method: '原生 ** 運算符',
            result: result3Str.length > 50 ?
                result3Str.slice(0, 25) + '...' + result3Str.slice(-25) :
                result3Str,
            digitCount: result3Str.length,
            time: time3,
            complexity: '引擎優化'
        });

        self.postMessage({
            type: 'COMPARE_RESULT',
            payload: {
                base: baseStr,
                exponent: expStr,
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
 * 計算冪塔（迭代冪次）
 * a^a^a^...^a (height 層)
 */
function calculateTower(baseStr, height, maxDigits) {
    const startTime = performance.now();

    try {
        const base = BigInt(baseStr);

        if (height < 1) {
            throw new Error('塔高度必須至少為 1');
        }

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '計算冪塔...' }
        });

        let result = base;
        const steps = [{ level: 1, value: base.toString() }];

        for (let i = 2; i <= height; i++) {
            if (shouldStop) {
                self.postMessage({
                    type: 'PROGRESS',
                    payload: { percent: 0, message: '計算已停止' }
                });
                return;
            }

            // 檢查結果是否太大
            const currentDigits = result.toString().length;
            if (currentDigits > maxDigits) {
                self.postMessage({
                    type: 'TOWER_RESULT',
                    payload: {
                        base: baseStr,
                        height,
                        completedLevels: i - 1,
                        steps,
                        overflow: true,
                        message: `計算到第 ${i-1} 層後結果超過 ${maxDigits} 位數`,
                        time: performance.now() - startTime
                    }
                });
                return;
            }

            // 計算下一層
            result = fastPower(base, result);
            const resultStr = result.toString();

            steps.push({
                level: i,
                value: resultStr.length > 50 ?
                    `${resultStr.slice(0, 20)}...（${resultStr.length} 位數）` :
                    resultStr,
                digitCount: resultStr.length
            });

            const percent = Math.floor((i / height) * 100);
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent, message: `計算第 ${i} 層...` }
            });
        }

        const endTime = performance.now();
        const finalStr = result.toString();

        self.postMessage({
            type: 'TOWER_RESULT',
            payload: {
                base: baseStr,
                height,
                completedLevels: height,
                result: finalStr.length > 100 ?
                    finalStr.slice(0, 50) + '...' + finalStr.slice(-50) :
                    finalStr,
                digitCount: finalStr.length,
                steps,
                time: endTime - startTime
            }
        });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: { message: error.message }
        });
    }
}

// ============ 冪運算算法 ============

/**
 * 快速冪算法（二進位指數）
 * 時間複雜度: O(log n)
 */
function fastPower(base, exp, progressCallback = null) {
    if (exp === 0n) return 1n;
    if (exp === 1n) return base;
    if (base === 0n) return 0n;
    if (base === 1n) return 1n;

    let result = 1n;
    let currentBase = base;
    let currentExp = exp;
    let iteration = 0;
    const totalBits = exp.toString(2).length;

    while (currentExp > 0n) {
        if (shouldStop) return result;

        // 如果當前位是 1，乘以當前底數
        if (currentExp & 1n) {
            result = result * currentBase;
        }

        // 底數平方
        currentBase = currentBase * currentBase;
        // 指數右移一位
        currentExp = currentExp >> 1n;

        iteration++;

        if (progressCallback && iteration % 10 === 0) {
            const percent = Math.min(95, Math.floor((iteration / totalBits) * 100));
            progressCallback(percent, `處理中... (${iteration}/${totalBits} 位)`);
        }
    }

    return result;
}

/**
 * 樸素冪運算（迭代）
 * 時間複雜度: O(n)
 */
function naivePower(base, exp) {
    if (exp === 0n) return 1n;
    if (base === 0n) return 0n;

    let result = 1n;
    for (let i = 0n; i < exp; i++) {
        if (shouldStop) return result;
        result = result * base;
    }
    return result;
}

// 報告 Worker 已準備就緒
self.postMessage({
    type: 'READY',
    payload: { message: 'Worker 已準備就緒' }
});
