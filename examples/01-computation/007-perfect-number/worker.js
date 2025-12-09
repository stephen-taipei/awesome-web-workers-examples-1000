/**
 * 完美數檢測器 - Web Worker 腳本
 *
 * 功能：檢測完美數、盈數、虧數，搜尋範圍內的完美數
 * 技術：因數和計算、梅森質數關聯
 */

// ===== 停止旗標 =====

let shouldStop = false;

// ===== 已知的完美數 (用於快速驗證) =====

const KNOWN_PERFECT_NUMBERS = [
    6n, 28n, 496n, 8128n, 33550336n,
    8589869056n, 137438691328n, 2305843008139952128n
];

// ===== 訊息處理 =====

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'CHECK_SINGLE':
            checkSingle(payload);
            break;
        case 'SEARCH_RANGE':
            searchRange(payload);
            break;
        case 'CLASSIFY_RANGE':
            classifyRange(payload);
            break;
        case 'FIND_MERSENNE_PERFECT':
            findMersennePerfect(payload);
            break;
        case 'ANALYZE_NUMBER':
            analyzeNumber(payload);
            break;
        case 'STOP':
            shouldStop = true;
            break;
        default:
            sendError('未知的訊息類型');
    }
};

// ===== 單數檢測 =====

function checkSingle(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { number } = payload;
        const n = BigInt(number);

        if (n < 1n) {
            sendError('請輸入正整數');
            return;
        }

        sendProgress(0, '計算因數和...');

        // 計算真因數和 (不包含自身)
        const { sum: divisorSum, divisors } = calculateDivisorSum(n);

        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        // 分類
        let classification;
        let difference;

        if (divisorSum === n) {
            classification = 'perfect';
            difference = 0n;
        } else if (divisorSum < n) {
            classification = 'deficient';
            difference = n - divisorSum;
        } else {
            classification = 'abundant';
            difference = divisorSum - n;
        }

        // 計算豐度 (abundance ratio)
        const abundanceRatio = Number(divisorSum) / Number(n);

        // 檢查是否為已知完美數
        const isKnownPerfect = KNOWN_PERFECT_NUMBERS.includes(n);

        // 對於完美數，找出對應的梅森質數
        let mersenneInfo = null;
        if (classification === 'perfect' && n % 2n === 0n) {
            mersenneInfo = findMersenneConnection(n);
        }

        sendResult('SINGLE_RESULT', {
            number: number,
            divisorSum: divisorSum.toString(),
            divisors: divisors.slice(0, 100).map(d => d.toString()),
            divisorCount: divisors.length,
            truncated: divisors.length > 100,
            classification,
            difference: difference.toString(),
            abundanceRatio: abundanceRatio.toFixed(6),
            isKnownPerfect,
            mersenneInfo,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`檢測錯誤: ${error.message}`);
    }
}

// ===== 範圍搜尋完美數 =====

function searchRange(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { start, end } = payload;
        let from = BigInt(start);
        let to = BigInt(end);

        if (from > to) [from, to] = [to, from];
        if (from < 1n) from = 1n;

        const range = to - from + 1n;
        if (range > 10000000n) {
            sendError('範圍過大，請限制在 1000 萬以內');
            return;
        }

        const perfectNumbers = [];
        let current = from;
        let checked = 0n;
        const total = Number(range);

        // 優化：先檢查已知完美數
        for (const pn of KNOWN_PERFECT_NUMBERS) {
            if (pn >= from && pn <= to) {
                perfectNumbers.push({
                    number: pn.toString(),
                    divisorSum: pn.toString()
                });
            }
        }

        // 如果範圍較小，逐一檢查
        if (range <= 100000n) {
            while (current <= to) {
                if (shouldStop) {
                    sendProgress(0, '搜尋已取消');
                    return;
                }

                const percent = Math.floor((Number(checked) / total) * 100);
                if (checked % 1000n === 0n) {
                    sendProgress(percent, `搜尋中... ${current}`);
                }

                // 跳過已知完美數（避免重複）
                if (!KNOWN_PERFECT_NUMBERS.includes(current)) {
                    const { sum } = calculateDivisorSum(current);
                    if (sum === current) {
                        perfectNumbers.push({
                            number: current.toString(),
                            divisorSum: sum.toString()
                        });
                    }
                }

                current++;
                checked++;
            }
        }

        // 排序結果
        perfectNumbers.sort((a, b) => {
            const na = BigInt(a.number);
            const nb = BigInt(b.number);
            return na < nb ? -1 : na > nb ? 1 : 0;
        });

        sendResult('SEARCH_RESULT', {
            start: from.toString(),
            end: to.toString(),
            perfectNumbers,
            count: perfectNumbers.length,
            searchedCount: total,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`搜尋錯誤: ${error.message}`);
    }
}

// ===== 範圍分類 =====

function classifyRange(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { start, end } = payload;
        let from = BigInt(start);
        let to = BigInt(end);

        if (from > to) [from, to] = [to, from];
        if (from < 1n) from = 1n;

        const range = to - from + 1n;
        if (range > 100000n) {
            sendError('範圍過大，請限制在 10 萬以內');
            return;
        }

        const results = [];
        const stats = {
            perfect: 0,
            deficient: 0,
            abundant: 0
        };

        let current = from;
        let checked = 0n;
        const total = Number(range);

        while (current <= to) {
            if (shouldStop) {
                sendProgress(0, '分類已取消');
                return;
            }

            const percent = Math.floor((Number(checked) / total) * 100);
            if (checked % 500n === 0n) {
                sendProgress(percent, `分類中... ${current}`);
            }

            const { sum } = calculateDivisorSum(current);
            let classification;

            if (sum === current) {
                classification = 'perfect';
                stats.perfect++;
            } else if (sum < current) {
                classification = 'deficient';
                stats.deficient++;
            } else {
                classification = 'abundant';
                stats.abundant++;
            }

            results.push({
                number: current.toString(),
                divisorSum: sum.toString(),
                classification
            });

            current++;
            checked++;
        }

        sendResult('CLASSIFY_RESULT', {
            start: from.toString(),
            end: to.toString(),
            results: results.slice(0, 500),
            truncated: results.length > 500,
            stats,
            total: total,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`分類錯誤: ${error.message}`);
    }
}

// ===== 尋找梅森完美數 =====

function findMersennePerfect(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { maxExponent } = payload;
        const limit = Math.min(maxExponent || 31, 61); // 限制指數避免過大

        const results = [];

        // 已知的梅森質數指數
        const mersenneExponents = [2, 3, 5, 7, 13, 17, 19, 31, 61];

        for (let i = 0; i < mersenneExponents.length; i++) {
            if (shouldStop) {
                sendProgress(0, '搜尋已取消');
                return;
            }

            const p = mersenneExponents[i];
            if (p > limit) break;

            sendProgress(Math.floor((i / mersenneExponents.length) * 100), `檢查 p = ${p}...`);

            const mersenne = (1n << BigInt(p)) - 1n;

            // 驗證梅森數是否為質數 (對於小指數)
            if (p <= 31 && isPrimeMersenne(mersenne)) {
                const perfectNumber = (1n << BigInt(p - 1)) * mersenne;
                results.push({
                    exponent: p,
                    mersenne: mersenne.toString(),
                    perfectNumber: perfectNumber.toString(),
                    perfectDigits: perfectNumber.toString().length
                });
            } else if (p > 31) {
                // 對於大指數，直接使用已知結果
                const perfectNumber = (1n << BigInt(p - 1)) * mersenne;
                results.push({
                    exponent: p,
                    mersenne: formatLargeNumber(mersenne),
                    perfectNumber: formatLargeNumber(perfectNumber),
                    perfectDigits: perfectNumber.toString().length
                });
            }
        }

        sendResult('MERSENNE_RESULT', {
            maxExponent: limit,
            results,
            count: results.length,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`梅森搜尋錯誤: ${error.message}`);
    }
}

// ===== 數字分析 =====

function analyzeNumber(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { number } = payload;
        const n = BigInt(number);

        if (n < 1n) {
            sendError('請輸入正整數');
            return;
        }

        sendProgress(0, '分析中...');

        // 計算真因數和
        const { sum: divisorSum, divisors } = calculateDivisorSum(n);

        // 計算因數總和 (包含自身)
        const totalSum = divisorSum + n;

        // 分類
        let classification;
        if (divisorSum === n) {
            classification = 'perfect';
        } else if (divisorSum < n) {
            classification = 'deficient';
        } else {
            classification = 'abundant';
        }

        // 計算親和數配對 (如果存在)
        let amicablePair = null;
        if (divisorSum !== n && divisorSum > 1n) {
            const { sum: partnerSum } = calculateDivisorSum(divisorSum);
            if (partnerSum === n && divisorSum !== n) {
                amicablePair = divisorSum.toString();
            }
        }

        // 檢查是否為半完美數 (semiperfect)
        const isSemiperfect = classification === 'abundant' ?
            checkSemiperfect(n, divisors) : (classification === 'perfect');

        // 檢查是否為奇異數 (weird number)
        const isWeird = classification === 'abundant' && !isSemiperfect;

        // 計算豐度指數
        const abundanceIndex = Number(divisorSum) / Number(n);

        // 計算缺損度或豐度
        const deficit = n - divisorSum;
        const abundance = divisorSum - n;

        sendResult('ANALYZE_RESULT', {
            number: number,
            divisorSum: divisorSum.toString(),
            totalSum: totalSum.toString(),
            divisorCount: divisors.length + 1, // 包含自身
            properDivisorCount: divisors.length,
            classification,
            abundanceIndex: abundanceIndex.toFixed(6),
            deficit: deficit > 0n ? deficit.toString() : null,
            abundance: abundance > 0n ? abundance.toString() : null,
            amicablePair,
            isSemiperfect,
            isWeird,
            divisors: divisors.slice(0, 50).map(d => d.toString()),
            divisorsTruncated: divisors.length > 50,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`分析錯誤: ${error.message}`);
    }
}

// ===== 輔助函數 =====

/**
 * 計算真因數和 (不包含自身)
 */
function calculateDivisorSum(n) {
    if (n === 1n) {
        return { sum: 0n, divisors: [] };
    }

    const divisors = [1n];
    let sum = 1n;
    const sqrt = bigIntSqrt(n);

    for (let i = 2n; i <= sqrt; i++) {
        if (n % i === 0n) {
            divisors.push(i);
            sum += i;
            const pair = n / i;
            if (pair !== i) {
                divisors.push(pair);
                sum += pair;
            }
        }
    }

    // 排序因數
    divisors.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

    return { sum, divisors };
}

/**
 * BigInt 平方根
 */
function bigIntSqrt(n) {
    if (n < 0n) throw new Error('負數無法開平方根');
    if (n < 2n) return n;

    let x = n;
    let y = (x + 1n) / 2n;

    while (y < x) {
        x = y;
        y = (x + n / x) / 2n;
    }

    return x;
}

/**
 * 檢查梅森數是否為質數 (簡單試除法)
 */
function isPrimeMersenne(n) {
    if (n < 2n) return false;
    if (n === 2n) return true;
    if (n % 2n === 0n) return false;

    const sqrt = bigIntSqrt(n);
    for (let i = 3n; i <= sqrt; i += 2n) {
        if (n % i === 0n) return false;
    }
    return true;
}

/**
 * 尋找完美數對應的梅森質數
 */
function findMersenneConnection(n) {
    // 偶完美數的形式: 2^(p-1) * (2^p - 1)
    // 其中 2^p - 1 是梅森質數

    for (let p = 2n; p <= 64n; p++) {
        const mersenne = (1n << p) - 1n;
        const perfect = (1n << (p - 1n)) * mersenne;

        if (perfect === n) {
            return {
                exponent: Number(p),
                mersenne: mersenne.toString()
            };
        }

        if (perfect > n) break;
    }

    return null;
}

/**
 * 檢查是否為半完美數 (能用部分真因數相加得到自身)
 */
function checkSemiperfect(n, divisors) {
    // 使用動態規劃檢查子集和
    // 限制因數數量以避免計算時間過長
    if (divisors.length > 30) {
        return null; // 無法確定
    }

    const target = Number(n);
    const nums = divisors.map(d => Number(d));

    // 子集和問題
    const dp = new Set([0]);

    for (const num of nums) {
        const newSums = [];
        for (const sum of dp) {
            const newSum = sum + num;
            if (newSum === target) return true;
            if (newSum < target) newSums.push(newSum);
        }
        for (const s of newSums) {
            dp.add(s);
        }
    }

    return false;
}

/**
 * 格式化大數字
 */
function formatLargeNumber(n) {
    const str = n.toString();
    if (str.length > 20) {
        return str.substring(0, 8) + '...' + str.substring(str.length - 8) + ` (${str.length}位)`;
    }
    return str;
}

// ===== 工具函數 =====

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}

function sendResult(type, payload) {
    self.postMessage({ type, payload });
}

function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
