/**
 * #013 模冪運算 - Web Worker
 *
 * 計算 a^b mod m（模幂運算）
 * 廣泛應用於密碼學（RSA、Diffie-Hellman 等）
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
            calculateModPower(payload.base, payload.exponent, payload.modulus);
            break;

        case 'CALCULATE_BATCH':
            shouldStop = false;
            calculateBatch(payload.calculations);
            break;

        case 'RSA_DEMO':
            shouldStop = false;
            rsaDemo(payload.message, payload.bitLength);
            break;

        case 'DIFFIE_HELLMAN':
            shouldStop = false;
            diffieHellmanDemo(payload.prime, payload.generator);
            break;

        case 'COMPARE_METHODS':
            shouldStop = false;
            compareMethods(payload.base, payload.exponent, payload.modulus);
            break;

        case 'FERMAT_TEST':
            shouldStop = false;
            fermatPrimalityTest(payload.number, payload.iterations);
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
 * 計算模冪運算 a^b mod m
 */
function calculateModPower(baseStr, expStr, modStr) {
    const startTime = performance.now();

    try {
        const base = BigInt(baseStr);
        const exp = BigInt(expStr);
        const mod = BigInt(modStr);

        if (mod <= 0n) {
            throw new Error('模數必須是正整數');
        }

        if (exp < 0n) {
            throw new Error('指數必須是非負整數（負指數需要模逆元）');
        }

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '開始計算模冪...' }
        });

        const result = modPow(base, exp, mod, (percent, message) => {
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

        // 計算一些相關資訊
        const baseDigits = baseStr.replace('-', '').length;
        const expDigits = expStr.length;
        const modDigits = modStr.length;

        self.postMessage({
            type: 'CALCULATE_RESULT',
            payload: {
                base: baseStr,
                exponent: expStr,
                modulus: modStr,
                result: result.toString(),
                time: endTime - startTime,
                stats: {
                    baseDigits,
                    expDigits,
                    modDigits,
                    resultDigits: result.toString().length
                }
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

        const { base, exponent, modulus } = calculations[i];

        try {
            const b = BigInt(base);
            const e = BigInt(exponent);
            const m = BigInt(modulus);

            if (m <= 0n) throw new Error('模數必須為正');
            if (e < 0n) throw new Error('指數必須非負');

            const result = modPow(b, e, m);

            results.push({
                base,
                exponent,
                modulus,
                result: result.toString()
            });
        } catch (error) {
            results.push({
                base,
                exponent,
                modulus,
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
 * RSA 加密演示
 */
function rsaDemo(messageStr, bitLength) {
    const startTime = performance.now();

    try {
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '生成 RSA 金鑰...' }
        });

        // 生成兩個質數（為了演示使用小質數）
        const { p, q } = generateRSAPrimes(bitLength);

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 20, message: '計算 n 和 φ(n)...' }
        });

        const n = p * q;
        const phi = (p - 1n) * (q - 1n);

        // 選擇公鑰指數 e（通常是 65537）
        let e = 65537n;
        if (e >= phi) {
            e = 3n;
        }
        while (gcd(e, phi) !== 1n) {
            e += 2n;
        }

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 40, message: '計算私鑰 d...' }
        });

        // 計算私鑰 d（e 的模逆元）
        const d = modInverse(e, phi);

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 60, message: '加密訊息...' }
        });

        // 加密：c = m^e mod n
        const message = BigInt(messageStr);
        if (message >= n) {
            throw new Error('訊息必須小於 n');
        }
        const ciphertext = modPow(message, e, n);

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 80, message: '解密訊息...' }
        });

        // 解密：m = c^d mod n
        const decrypted = modPow(ciphertext, d, n);

        const endTime = performance.now();

        self.postMessage({
            type: 'RSA_RESULT',
            payload: {
                // 金鑰
                p: p.toString(),
                q: q.toString(),
                n: n.toString(),
                phi: phi.toString(),
                e: e.toString(),
                d: d.toString(),
                // 加解密
                message: messageStr,
                ciphertext: ciphertext.toString(),
                decrypted: decrypted.toString(),
                // 驗證
                success: message === decrypted,
                time: endTime - startTime,
                bitLength
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
 * Diffie-Hellman 金鑰交換演示
 */
function diffieHellmanDemo(primeStr, generatorStr) {
    const startTime = performance.now();

    try {
        const p = BigInt(primeStr);
        const g = BigInt(generatorStr);

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '生成私鑰...' }
        });

        // 生成 Alice 和 Bob 的私鑰
        const aPrivate = randomBigInt(2n, p - 2n);
        const bPrivate = randomBigInt(2n, p - 2n);

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 25, message: '計算公鑰...' }
        });

        // 計算公鑰
        const aPublic = modPow(g, aPrivate, p);
        const bPublic = modPow(g, bPrivate, p);

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 50, message: '計算共享密鑰...' }
        });

        // 計算共享密鑰
        const aShared = modPow(bPublic, aPrivate, p);
        const bShared = modPow(aPublic, bPrivate, p);

        const endTime = performance.now();

        self.postMessage({
            type: 'DH_RESULT',
            payload: {
                // 公開參數
                prime: primeStr,
                generator: generatorStr,
                // Alice
                alicePrivate: aPrivate.toString(),
                alicePublic: aPublic.toString(),
                // Bob
                bobPrivate: bPrivate.toString(),
                bobPublic: bPublic.toString(),
                // 共享密鑰
                aliceShared: aShared.toString(),
                bobShared: bShared.toString(),
                // 驗證
                keysMatch: aShared === bShared,
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

/**
 * 比較不同方法的效能
 */
function compareMethods(baseStr, expStr, modStr) {
    const results = [];

    try {
        const base = BigInt(baseStr);
        const exp = BigInt(expStr);
        const mod = BigInt(modStr);

        if (mod <= 0n) throw new Error('模數必須為正');
        if (exp < 0n) throw new Error('指數必須非負');

        // 方法 1: 快速模冪（右到左二進位）
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '測試快速模冪（右到左）...' }
        });

        const start1 = performance.now();
        const result1 = modPow(base, exp, mod);
        const time1 = performance.now() - start1;

        results.push({
            method: '快速模冪（右到左二進位）',
            result: result1.toString(),
            time: time1,
            complexity: 'O(log n)'
        });

        if (shouldStop) return;

        // 方法 2: 快速模冪（左到右二進位）
        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 33, message: '測試快速模冪（左到右）...' }
        });

        const start2 = performance.now();
        const result2 = modPowLeftToRight(base, exp, mod);
        const time2 = performance.now() - start2;

        results.push({
            method: '快速模冪（左到右二進位）',
            result: result2.toString(),
            time: time2,
            complexity: 'O(log n)'
        });

        if (shouldStop) return;

        // 方法 3: 樸素方法（僅限小指數）
        if (exp <= 100000n) {
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent: 66, message: '測試樸素方法...' }
            });

            const start3 = performance.now();
            const result3 = modPowNaive(base, exp, mod);
            const time3 = performance.now() - start3;

            results.push({
                method: '樸素迭代法',
                result: result3.toString(),
                time: time3,
                complexity: 'O(n)'
            });
        } else {
            results.push({
                method: '樸素迭代法',
                result: '（指數過大，跳過）',
                time: 0,
                complexity: 'O(n)',
                skipped: true
            });
        }

        self.postMessage({
            type: 'COMPARE_RESULT',
            payload: {
                base: baseStr,
                exponent: expStr,
                modulus: modStr,
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
 * 費馬質數測試
 */
function fermatPrimalityTest(numberStr, iterations) {
    const startTime = performance.now();

    try {
        const n = BigInt(numberStr);

        if (n < 2n) {
            throw new Error('數字必須大於等於 2');
        }

        self.postMessage({
            type: 'PROGRESS',
            payload: { percent: 0, message: '進行費馬測試...' }
        });

        // 小質數直接判斷
        const smallPrimes = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n];
        if (smallPrimes.includes(n)) {
            self.postMessage({
                type: 'FERMAT_RESULT',
                payload: {
                    number: numberStr,
                    isProbablePrime: true,
                    confidence: 100,
                    iterations: 0,
                    witnesses: [],
                    time: performance.now() - startTime,
                    note: '小質數，直接確認'
                }
            });
            return;
        }

        // 檢查是否為小質數的倍數
        for (const p of smallPrimes) {
            if (n % p === 0n) {
                self.postMessage({
                    type: 'FERMAT_RESULT',
                    payload: {
                        number: numberStr,
                        isProbablePrime: false,
                        confidence: 100,
                        iterations: 0,
                        witnesses: [p.toString()],
                        time: performance.now() - startTime,
                        note: `被 ${p} 整除`
                    }
                });
                return;
            }
        }

        const witnesses = [];
        let passed = true;

        for (let i = 0; i < iterations; i++) {
            if (shouldStop) {
                self.postMessage({
                    type: 'PROGRESS',
                    payload: { percent: 0, message: '測試已停止' }
                });
                return;
            }

            // 隨機選擇 a，2 <= a <= n-2
            const a = randomBigInt(2n, n - 2n);

            // 費馬小定理：如果 n 是質數，則 a^(n-1) ≡ 1 (mod n)
            const result = modPow(a, n - 1n, n);

            if (result !== 1n) {
                // 找到證人，n 是合成數
                passed = false;
                witnesses.push(a.toString());
                break;
            }

            const percent = Math.floor(((i + 1) / iterations) * 100);
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent, message: `測試 ${i + 1}/${iterations}` }
            });
        }

        const endTime = performance.now();

        // 計算信心水準：每次測試通過，錯誤機率減半
        const confidence = passed ? (1 - Math.pow(0.5, iterations)) * 100 : 0;

        self.postMessage({
            type: 'FERMAT_RESULT',
            payload: {
                number: numberStr,
                isProbablePrime: passed,
                confidence: confidence.toFixed(6),
                iterations,
                witnesses,
                time: endTime - startTime,
                note: passed ? '可能是質數' : '確定是合成數'
            }
        });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: { message: error.message }
        });
    }
}

// ============ 核心算法 ============

/**
 * 快速模冪運算（右到左二進位方法）
 * 計算 base^exp mod mod
 */
function modPow(base, exp, mod, progressCallback = null) {
    if (mod === 1n) return 0n;

    let result = 1n;
    base = ((base % mod) + mod) % mod; // 處理負數

    let iteration = 0;
    const totalBits = exp.toString(2).length;

    while (exp > 0n) {
        if (shouldStop) return result;

        // 如果當前位是 1
        if (exp & 1n) {
            result = (result * base) % mod;
        }

        // 指數右移，底數平方
        exp = exp >> 1n;
        base = (base * base) % mod;

        iteration++;
        if (progressCallback && iteration % 100 === 0) {
            const percent = Math.min(95, Math.floor((iteration / totalBits) * 100));
            progressCallback(percent, `處理中... (${iteration}/${totalBits} 位)`);
        }
    }

    return result;
}

/**
 * 快速模冪運算（左到右二進位方法）
 */
function modPowLeftToRight(base, exp, mod) {
    if (mod === 1n) return 0n;

    const bits = exp.toString(2);
    let result = 1n;
    base = ((base % mod) + mod) % mod;

    for (const bit of bits) {
        result = (result * result) % mod;
        if (bit === '1') {
            result = (result * base) % mod;
        }
    }

    return result;
}

/**
 * 樸素模冪運算（僅用於比較）
 */
function modPowNaive(base, exp, mod) {
    if (mod === 1n) return 0n;

    let result = 1n;
    base = ((base % mod) + mod) % mod;

    for (let i = 0n; i < exp; i++) {
        if (shouldStop) return result;
        result = (result * base) % mod;
    }

    return result;
}

/**
 * 計算最大公因數
 */
function gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
        const t = b;
        b = a % b;
        a = t;
    }
    return a;
}

/**
 * 計算模逆元（擴展歐幾里得算法）
 */
function modInverse(a, m) {
    let [old_r, r] = [a, m];
    let [old_s, s] = [1n, 0n];

    while (r !== 0n) {
        const q = old_r / r;
        [old_r, r] = [r, old_r - q * r];
        [old_s, s] = [s, old_s - q * s];
    }

    if (old_r !== 1n) {
        throw new Error('模逆元不存在');
    }

    return ((old_s % m) + m) % m;
}

/**
 * 生成 RSA 用的質數對
 */
function generateRSAPrimes(bitLength) {
    // 為了演示，使用預定義的質數或生成小質數
    const primesList = [
        // 小質數用於演示
        { p: 61n, q: 53n },
        { p: 101n, q: 103n },
        { p: 1009n, q: 1013n },
        { p: 10007n, q: 10009n },
        { p: 100003n, q: 100019n },
        { p: 1000003n, q: 1000033n }
    ];

    // 根據位數選擇適當的質數對
    const index = Math.min(Math.floor(bitLength / 10), primesList.length - 1);
    return primesList[index];
}

/**
 * 生成指定範圍內的隨機 BigInt
 */
function randomBigInt(min, max) {
    const range = max - min + 1n;
    const bits = range.toString(2).length;
    const bytes = Math.ceil(bits / 8);

    // 使用簡單的隨機數生成
    let result = 0n;
    for (let i = 0; i < bytes; i++) {
        result = (result << 8n) | BigInt(Math.floor(Math.random() * 256));
    }

    return min + (result % range);
}

// 報告 Worker 已準備就緒
self.postMessage({
    type: 'READY',
    payload: { message: 'Worker 已準備就緒' }
});
