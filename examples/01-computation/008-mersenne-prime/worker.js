/**
 * 梅森質數搜尋器 - Web Worker 腳本
 *
 * 功能：使用 Lucas-Lehmer 測試搜尋梅森質數
 * 技術：BigInt 大數運算、Lucas-Lehmer 演算法
 * 難度：高級
 */

// ===== 停止旗標 =====

let shouldStop = false;

// ===== 已知梅森質數指數 (用於驗證) =====

const KNOWN_MERSENNE_EXPONENTS = [
    2, 3, 5, 7, 13, 17, 19, 31, 61, 89, 107, 127, 521, 607, 1279,
    2203, 2281, 3217, 4253, 4423, 9689, 9941, 11213, 19937, 21701,
    23209, 44497, 86243, 110503, 132049, 216091, 756839, 859433
];

// ===== 訊息處理 =====

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'TEST_SINGLE':
            testSingle(payload);
            break;
        case 'SEARCH_RANGE':
            searchRange(payload);
            break;
        case 'LIST_KNOWN':
            listKnown(payload);
            break;
        case 'VERIFY_MERSENNE':
            verifyMersenne(payload);
            break;
        case 'CALCULATE_MERSENNE':
            calculateMersenne(payload);
            break;
        case 'STOP':
            shouldStop = true;
            break;
        default:
            sendError('未知的訊息類型');
    }
};

// ===== 測試單一指數 =====

function testSingle(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { exponent } = payload;
        const p = parseInt(exponent);

        if (p < 2) {
            sendError('指數必須 ≥ 2');
            return;
        }

        sendProgress(0, `測試 M${p} = 2^${p} - 1...`);

        // 先檢查 p 是否為質數
        if (!isPrime(p)) {
            sendResult('SINGLE_RESULT', {
                exponent: p,
                isPrime: false,
                reason: `指數 ${p} 不是質數，M${p} 必定是合數`,
                mersenne: getMersenneString(p),
                digits: getMersenneDigits(p),
                duration: performance.now() - startTime
            });
            return;
        }

        // 特殊情況：p = 2
        if (p === 2) {
            sendResult('SINGLE_RESULT', {
                exponent: p,
                isPrime: true,
                mersenne: '3',
                digits: 1,
                isKnown: true,
                rank: 1,
                duration: performance.now() - startTime
            });
            return;
        }

        // Lucas-Lehmer 測試
        const result = lucasLehmerTest(p, (progress, message) => {
            sendProgress(progress, message);
        });

        if (shouldStop) {
            sendProgress(0, '測試已取消');
            return;
        }

        const isKnown = KNOWN_MERSENNE_EXPONENTS.includes(p);
        const rank = isKnown ? KNOWN_MERSENNE_EXPONENTS.indexOf(p) + 1 : null;

        sendResult('SINGLE_RESULT', {
            exponent: p,
            isPrime: result,
            mersenne: getMersenneString(p),
            digits: getMersenneDigits(p),
            isKnown,
            rank,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`測試錯誤: ${error.message}`);
    }
}

// ===== 範圍搜尋 =====

function searchRange(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { start, end } = payload;
        let from = parseInt(start);
        let to = parseInt(end);

        if (from > to) [from, to] = [to, from];
        if (from < 2) from = 2;

        // 限制搜尋範圍 (大指數需要很長時間)
        if (to > 10000) {
            sendError('指數上限建議不超過 10000 (大指數測試需要很長時間)');
            return;
        }

        const results = [];
        const testedCount = { total: 0, primes: 0 };

        // 先篩選出質數指數
        const primeExponents = [];
        for (let p = from; p <= to; p++) {
            if (isPrime(p)) {
                primeExponents.push(p);
            }
        }

        const total = primeExponents.length;

        for (let i = 0; i < primeExponents.length; i++) {
            if (shouldStop) {
                sendProgress(0, '搜尋已取消');
                return;
            }

            const p = primeExponents[i];
            const percent = Math.floor((i / total) * 100);
            sendProgress(percent, `測試 M${p}... (${i + 1}/${total})`);

            testedCount.total++;

            let isMersennePrime;
            if (p === 2) {
                isMersennePrime = true;
            } else {
                isMersennePrime = lucasLehmerTest(p);
            }

            if (isMersennePrime) {
                testedCount.primes++;
                const isKnown = KNOWN_MERSENNE_EXPONENTS.includes(p);
                results.push({
                    exponent: p,
                    mersenne: getMersenneString(p),
                    digits: getMersenneDigits(p),
                    isKnown,
                    rank: isKnown ? KNOWN_MERSENNE_EXPONENTS.indexOf(p) + 1 : null
                });
            }
        }

        sendResult('SEARCH_RESULT', {
            start: from,
            end: to,
            results,
            testedCount,
            primeExponentsCount: total,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`搜尋錯誤: ${error.message}`);
    }
}

// ===== 列出已知梅森質數 =====

function listKnown(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { limit } = payload;
        const maxCount = Math.min(limit || 20, KNOWN_MERSENNE_EXPONENTS.length);

        const results = [];

        for (let i = 0; i < maxCount; i++) {
            if (shouldStop) {
                sendProgress(0, '已取消');
                return;
            }

            const p = KNOWN_MERSENNE_EXPONENTS[i];
            sendProgress(Math.floor((i / maxCount) * 100), `計算 M${p}...`);

            results.push({
                rank: i + 1,
                exponent: p,
                mersenne: getMersenneString(p),
                digits: getMersenneDigits(p),
                year: getMersenneDiscoveryYear(p)
            });
        }

        sendResult('KNOWN_RESULT', {
            results,
            totalKnown: KNOWN_MERSENNE_EXPONENTS.length,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`列出錯誤: ${error.message}`);
    }
}

// ===== 驗證梅森數 =====

function verifyMersenne(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { exponent } = payload;
        const p = parseInt(exponent);

        if (p < 2) {
            sendError('指數必須 ≥ 2');
            return;
        }

        sendProgress(0, '計算梅森數...');

        const mersenne = (1n << BigInt(p)) - 1n;
        const mersenneStr = mersenne.toString();
        const digits = mersenneStr.length;

        sendProgress(20, '檢查指數是否為質數...');
        const exponentIsPrime = isPrime(p);

        let factorInfo = null;

        // 對於小的合數梅森數，嘗試找因數
        if (!exponentIsPrime || (p < 100 && !KNOWN_MERSENNE_EXPONENTS.includes(p))) {
            sendProgress(40, '嘗試分解因數...');
            factorInfo = findSmallFactor(p);
        }

        // 計算 2^p mod (一些小質數) 來快速排除
        sendProgress(60, '執行初步測試...');
        const preliminaryTests = performPreliminaryTests(p);

        let lucasLehmerResult = null;
        if (exponentIsPrime && p <= 5000) {
            sendProgress(80, '執行 Lucas-Lehmer 測試...');
            lucasLehmerResult = lucasLehmerTest(p);
        }

        sendResult('VERIFY_RESULT', {
            exponent: p,
            mersenne: digits > 100 ? `${mersenneStr.slice(0, 20)}...${mersenneStr.slice(-20)}` : mersenneStr,
            fullMersenne: digits <= 1000 ? mersenneStr : null,
            digits,
            exponentIsPrime,
            isKnownMersennePrime: KNOWN_MERSENNE_EXPONENTS.includes(p),
            factorInfo,
            preliminaryTests,
            lucasLehmerResult,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`驗證錯誤: ${error.message}`);
    }
}

// ===== 計算梅森數 =====

function calculateMersenne(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { exponent } = payload;
        const p = parseInt(exponent);

        if (p < 1 || p > 100000) {
            sendError('指數必須在 1 到 100000 之間');
            return;
        }

        sendProgress(0, `計算 2^${p} - 1...`);

        const mersenne = (1n << BigInt(p)) - 1n;
        const mersenneStr = mersenne.toString();
        const digits = mersenneStr.length;

        // 二進制表示 (全是 1)
        const binaryLength = p;

        // 十六進制表示
        const hexStr = mersenne.toString(16).toUpperCase();

        sendResult('CALCULATE_RESULT', {
            exponent: p,
            mersenne: digits > 200 ? `${mersenneStr.slice(0, 50)}...${mersenneStr.slice(-50)}` : mersenneStr,
            fullMersenne: digits <= 5000 ? mersenneStr : null,
            digits,
            binaryLength,
            hexLength: hexStr.length,
            hexPreview: hexStr.length > 100 ? `${hexStr.slice(0, 30)}...${hexStr.slice(-30)}` : hexStr,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`計算錯誤: ${error.message}`);
    }
}

// ===== Lucas-Lehmer 測試 =====

/**
 * Lucas-Lehmer 質數測試
 * 對於 p > 2，M_p = 2^p - 1 是質數當且僅當 S_{p-2} ≡ 0 (mod M_p)
 * 其中 S_0 = 4, S_n = (S_{n-1}^2 - 2) mod M_p
 */
function lucasLehmerTest(p, progressCallback = null) {
    if (p === 2) return true;
    if (!isPrime(p)) return false;

    const mp = (1n << BigInt(p)) - 1n; // M_p = 2^p - 1
    let s = 4n;

    const iterations = p - 2;

    for (let i = 0; i < iterations; i++) {
        if (shouldStop) return false;

        // 進度回報 (每 1000 次迭代)
        if (progressCallback && i % 1000 === 0) {
            const percent = Math.floor((i / iterations) * 100);
            progressCallback(percent, `Lucas-Lehmer 迭代 ${i + 1}/${iterations}`);
        }

        // S_n = (S_{n-1}^2 - 2) mod M_p
        s = ((s * s) - 2n) % mp;

        // 確保結果為正
        if (s < 0n) s += mp;
    }

    return s === 0n;
}

// ===== 輔助函數 =====

/**
 * 檢查是否為質數 (試除法，適用於較小的數)
 */
function isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    if (n === 3) return true;
    if (n % 3 === 0) return false;

    const sqrt = Math.floor(Math.sqrt(n));
    for (let i = 5; i <= sqrt; i += 6) {
        if (n % i === 0 || n % (i + 2) === 0) return false;
    }
    return true;
}

/**
 * 獲取梅森數的字串表示
 */
function getMersenneString(p) {
    if (p > 10000) {
        return `2^${p} - 1 (太大無法完整顯示)`;
    }

    const mersenne = (1n << BigInt(p)) - 1n;
    const str = mersenne.toString();

    if (str.length > 50) {
        return `${str.slice(0, 20)}...${str.slice(-20)} (${str.length} 位)`;
    }
    return str;
}

/**
 * 獲取梅森數的位數
 */
function getMersenneDigits(p) {
    // log10(2^p - 1) ≈ p * log10(2) ≈ p * 0.30103
    return Math.floor(p * 0.30103) + 1;
}

/**
 * 嘗試找小因數
 */
function findSmallFactor(p) {
    const mp = (1n << BigInt(p)) - 1n;

    // 梅森數的因數必須是 2kp + 1 的形式，且 ≡ ±1 (mod 8)
    const limit = Math.min(1000000, Number(bigIntSqrt(mp)));

    for (let k = 1; k <= limit / (2 * p); k++) {
        const factor = BigInt(2 * k * p + 1);

        // 檢查 factor ≡ ±1 (mod 8)
        const mod8 = Number(factor % 8n);
        if (mod8 !== 1 && mod8 !== 7) continue;

        if (mp % factor === 0n) {
            return {
                factor: factor.toString(),
                k,
                cofactor: (mp / factor).toString()
            };
        }
    }

    return null;
}

/**
 * BigInt 平方根
 */
function bigIntSqrt(n) {
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
 * 初步測試
 */
function performPreliminaryTests(p) {
    const tests = [];

    // 測試 1: 指數是否為質數
    tests.push({
        name: '指數質數測試',
        passed: isPrime(p),
        description: isPrime(p) ? `${p} 是質數` : `${p} 不是質數`
    });

    // 測試 2: 檢查是否為已知梅森質數
    const isKnown = KNOWN_MERSENNE_EXPONENTS.includes(p);
    tests.push({
        name: '已知梅森質數',
        passed: isKnown,
        description: isKnown ? `M${p} 是第 ${KNOWN_MERSENNE_EXPONENTS.indexOf(p) + 1} 個梅森質數` : `M${p} 不在已知列表中`
    });

    return tests;
}

/**
 * 獲取梅森質數發現年份
 */
function getMersenneDiscoveryYear(p) {
    const years = {
        2: '古代', 3: '古代', 5: '古代', 7: '古代',
        13: '1456', 17: '1588', 19: '1588', 31: '1772',
        61: '1883', 89: '1911', 107: '1914', 127: '1876',
        521: '1952', 607: '1952', 1279: '1952',
        2203: '1952', 2281: '1952', 3217: '1957',
        4253: '1961', 4423: '1961', 9689: '1963',
        9941: '1963', 11213: '1963', 19937: '1971',
        21701: '1978', 23209: '1979', 44497: '1979',
        86243: '1982', 110503: '1988', 132049: '1983',
        216091: '1985', 756839: '1992', 859433: '1994'
    };
    return years[p] || '未知';
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
