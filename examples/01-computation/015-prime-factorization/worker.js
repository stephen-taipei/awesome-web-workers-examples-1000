/**
 * Web Worker: 質因數分解
 *
 * 功能：
 * - 試除法 (Trial Division)
 * - Pollard's Rho 算法
 * - Fermat 分解法
 * - RSA 攻擊演示
 * - 批量分解
 * - 方法效能比較
 *
 * 質因數分解是破解 RSA 的理論基礎
 */

// 停止標記
let shouldStop = false;

// 監聽主執行緒訊息
self.onmessage = function(e) {
    const { type, payload } = e.data;

    // 重置停止標記
    if (type !== 'STOP') {
        shouldStop = false;
    }

    switch (type) {
        case 'FACTORIZE':
            factorize(payload);
            break;
        case 'TRIAL_DIVISION':
            trialDivision(payload);
            break;
        case 'POLLARD_RHO':
            pollardRhoFactorize(payload);
            break;
        case 'FERMAT':
            fermatFactorize(payload);
            break;
        case 'RSA_ATTACK':
            rsaAttack(payload);
            break;
        case 'FACTORIZE_BATCH':
            factorizeBatch(payload);
            break;
        case 'COMPARE_METHODS':
            compareMethods(payload);
            break;
        case 'ANALYZE_NUMBER':
            analyzeNumber(payload);
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
 * 最大公因數
 */
function gcd(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;
    while (b !== 0n) {
        [a, b] = [b, a % b];
    }
    return a;
}

/**
 * 快速模冪運算
 */
function modPow(base, exp, mod) {
    if (mod === 1n) return 0n;
    let result = 1n;
    base = ((base % mod) + mod) % mod;
    while (exp > 0n) {
        if (exp & 1n) {
            result = (result * base) % mod;
        }
        exp = exp >> 1n;
        base = (base * base) % mod;
    }
    return result;
}

/**
 * Miller-Rabin 質數測試
 */
function millerRabin(n, k = 20) {
    if (n < 2n) return false;
    if (n === 2n || n === 3n) return true;
    if (n % 2n === 0n) return false;

    // 將 n-1 寫成 2^r * d 的形式
    let r = 0n;
    let d = n - 1n;
    while (d % 2n === 0n) {
        r++;
        d /= 2n;
    }

    // 測試用的基數
    const witnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];

    for (let i = 0; i < Math.min(k, witnesses.length); i++) {
        const a = witnesses[i];
        if (a >= n) continue;

        let x = modPow(a, d, n);

        if (x === 1n || x === n - 1n) continue;

        let composite = true;
        for (let j = 0n; j < r - 1n; j++) {
            x = (x * x) % n;
            if (x === n - 1n) {
                composite = false;
                break;
            }
        }

        if (composite) return false;
    }

    return true;
}

/**
 * 計算整數平方根
 */
function isqrt(n) {
    if (n < 0n) throw new Error('負數無平方根');
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
 * 檢查是否為完全平方數
 */
function isPerfectSquare(n) {
    const root = isqrt(n);
    return root * root === n;
}

/**
 * 小質數列表（用於試除法）
 */
const smallPrimes = [
    2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n, 41n, 43n, 47n,
    53n, 59n, 61n, 67n, 71n, 73n, 79n, 83n, 89n, 97n, 101n, 103n, 107n, 109n, 113n,
    127n, 131n, 137n, 139n, 149n, 151n, 157n, 163n, 167n, 173n, 179n, 181n, 191n, 193n, 197n,
    199n, 211n, 223n, 227n, 229n, 233n, 239n, 241n, 251n, 257n, 263n, 269n, 271n, 277n, 281n,
    283n, 293n, 307n, 311n, 313n, 317n, 331n, 337n, 347n, 349n, 353n, 359n, 367n, 373n, 379n,
    383n, 389n, 397n, 401n, 409n, 419n, 421n, 431n, 433n, 439n, 443n, 449n, 457n, 461n, 463n,
    467n, 479n, 487n, 491n, 499n, 503n, 509n, 521n, 523n, 541n, 547n, 557n, 563n, 569n, 571n,
    577n, 587n, 593n, 599n, 601n, 607n, 613n, 617n, 619n, 631n, 641n, 643n, 647n, 653n, 659n,
    661n, 673n, 677n, 683n, 691n, 701n, 709n, 719n, 727n, 733n, 739n, 743n, 751n, 757n, 761n,
    769n, 773n, 787n, 797n, 809n, 811n, 821n, 823n, 827n, 829n, 839n, 853n, 857n, 859n, 863n,
    877n, 881n, 883n, 887n, 907n, 911n, 919n, 929n, 937n, 941n, 947n, 953n, 967n, 971n, 977n,
    983n, 991n, 997n
];

/**
 * 試除法分解
 * 時間複雜度: O(√n)
 */
function trialDivisionFactors(n, progressCallback = null) {
    const factors = [];
    let remaining = n;

    // 先用小質數列表
    for (const p of smallPrimes) {
        if (shouldStop) return { factors, remaining, stopped: true };
        if (p * p > remaining) break;

        let count = 0;
        while (remaining % p === 0n) {
            remaining /= p;
            count++;
        }
        if (count > 0) {
            factors.push({ prime: p, power: count });
        }
    }

    // 繼續用 6k±1 形式的數
    if (remaining > 1n && !millerRabin(remaining)) {
        let i = 1001n;
        const sqrtN = isqrt(remaining) + 1n;

        while (i <= sqrtN && remaining > 1n) {
            if (shouldStop) return { factors, remaining, stopped: true };

            // 檢查 6k-1 和 6k+1
            for (const offset of [-1n, 1n]) {
                const p = i + offset;
                if (p * p > remaining) break;

                let count = 0;
                while (remaining % p === 0n) {
                    remaining /= p;
                    count++;
                }
                if (count > 0) {
                    factors.push({ prime: p, power: count });
                }
            }

            i += 6n;

            if (progressCallback && i % 6000n === 0n) {
                progressCallback(Number(i), Number(sqrtN));
            }
        }
    }

    // 剩餘的是質數
    if (remaining > 1n) {
        factors.push({ prime: remaining, power: 1 });
    }

    return { factors, remaining: 1n, stopped: false };
}

/**
 * Pollard's Rho 算法找一個因子
 */
function pollardRhoFindFactor(n, c = 1n) {
    if (n % 2n === 0n) return 2n;
    if (millerRabin(n)) return n;

    let x = 2n;
    let y = 2n;
    let d = 1n;

    const f = (x) => (x * x + c) % n;

    let iterations = 0;
    const maxIterations = 1000000;

    while (d === 1n && iterations < maxIterations) {
        if (shouldStop) return null;

        x = f(x);
        y = f(f(y));
        d = gcd(x > y ? x - y : y - x, n);
        iterations++;

        if (iterations % 10000 === 0) {
            self.postMessage({
                type: 'PROGRESS',
                payload: { iterations, phase: 'pollard-rho' }
            });
        }
    }

    if (d === n) {
        // 嘗試不同的 c 值
        if (c < 20n) {
            return pollardRhoFindFactor(n, c + 1n);
        }
        return null;
    }

    return d === 1n ? null : d;
}

/**
 * Pollard's Rho 完整分解
 */
function pollardRhoFullFactorize(n) {
    const factors = new Map();

    const addFactor = (p) => {
        factors.set(p.toString(), (factors.get(p.toString()) || 0) + 1);
    };

    const factorizeRecursive = (num) => {
        if (shouldStop) return;
        if (num === 1n) return;

        if (millerRabin(num)) {
            addFactor(num);
            return;
        }

        // 嘗試小因子
        for (const p of smallPrimes.slice(0, 50)) {
            while (num % p === 0n) {
                addFactor(p);
                num /= p;
            }
        }

        if (num === 1n) return;
        if (millerRabin(num)) {
            addFactor(num);
            return;
        }

        // 使用 Pollard's Rho
        const factor = pollardRhoFindFactor(num);
        if (factor === null || factor === num) {
            // 無法分解，可能是質數
            addFactor(num);
            return;
        }

        factorizeRecursive(factor);
        factorizeRecursive(num / factor);
    };

    factorizeRecursive(n);

    // 轉換為排序的因子列表
    const result = [];
    for (const [prime, power] of factors) {
        result.push({ prime: BigInt(prime), power });
    }
    result.sort((a, b) => a.prime < b.prime ? -1 : 1);

    return result;
}

/**
 * Fermat 分解法
 * 適用於兩個因子接近的情況（如 RSA 的弱金鑰）
 */
function fermatFactorization(n, maxIterations = 1000000) {
    if (n % 2n === 0n) {
        return { found: true, p: 2n, q: n / 2n };
    }

    // n = a² - b² = (a+b)(a-b)
    let a = isqrt(n);
    if (a * a < n) a++;

    let b2 = a * a - n;

    let iterations = 0;
    while (!isPerfectSquare(b2) && iterations < maxIterations) {
        if (shouldStop) {
            return { found: false, reason: 'stopped' };
        }

        a++;
        b2 = a * a - n;
        iterations++;

        if (iterations % 10000 === 0) {
            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    iterations,
                    percent: Math.min(99, Math.floor(iterations / 10000))
                }
            });
        }
    }

    if (isPerfectSquare(b2)) {
        const b = isqrt(b2);
        const p = a + b;
        const q = a - b;
        if (p !== 1n && q !== 1n && p !== n && q !== n) {
            return { found: true, p, q, iterations };
        }
    }

    return { found: false, reason: 'not_found', iterations };
}

/**
 * 主要分解函數（自動選擇方法）
 */
function factorize(payload) {
    const { number, method = 'auto' } = payload;

    try {
        let n = BigInt(number);

        if (n <= 1n) {
            throw new Error('請輸入大於 1 的整數');
        }

        const startTime = performance.now();
        let factors;
        let usedMethod;

        // 檢查是否為質數
        if (millerRabin(n)) {
            self.postMessage({
                type: 'FACTORIZE_RESULT',
                payload: {
                    number: n.toString(),
                    isPrime: true,
                    factors: [{ prime: n.toString(), power: 1 }],
                    factorization: n.toString(),
                    method: 'Miller-Rabin',
                    time: performance.now() - startTime
                }
            });
            return;
        }

        if (method === 'trial' || (method === 'auto' && n < 10000000000n)) {
            const result = trialDivisionFactors(n, (current, total) => {
                self.postMessage({
                    type: 'PROGRESS',
                    payload: {
                        current,
                        total,
                        percent: Math.floor((current / total) * 100)
                    }
                });
            });
            factors = result.factors;
            usedMethod = '試除法';
        } else if (method === 'pollard' || method === 'auto') {
            factors = pollardRhoFullFactorize(n);
            usedMethod = "Pollard's Rho";
        } else if (method === 'fermat') {
            const result = fermatFactorization(n);
            if (result.found) {
                // 繼續分解 p 和 q
                const pFactors = millerRabin(result.p) ?
                    [{ prime: result.p, power: 1 }] :
                    pollardRhoFullFactorize(result.p);
                const qFactors = millerRabin(result.q) ?
                    [{ prime: result.q, power: 1 }] :
                    pollardRhoFullFactorize(result.q);

                // 合併因子
                const factorMap = new Map();
                for (const f of [...pFactors, ...qFactors]) {
                    const key = f.prime.toString();
                    factorMap.set(key, (factorMap.get(key) || 0) + f.power);
                }
                factors = Array.from(factorMap.entries())
                    .map(([p, pow]) => ({ prime: BigInt(p), power: pow }))
                    .sort((a, b) => a.prime < b.prime ? -1 : 1);
            } else {
                factors = pollardRhoFullFactorize(n);
            }
            usedMethod = 'Fermat 分解法';
        }

        // 格式化因式分解字串
        const factorization = factors.map(f =>
            f.power === 1 ? f.prime.toString() : `${f.prime}^${f.power}`
        ).join(' × ');

        // 驗證
        let product = 1n;
        for (const f of factors) {
            for (let i = 0; i < f.power; i++) {
                product *= f.prime;
            }
        }

        self.postMessage({
            type: 'FACTORIZE_RESULT',
            payload: {
                number: n.toString(),
                isPrime: false,
                factors: factors.map(f => ({
                    prime: f.prime.toString(),
                    power: f.power
                })),
                factorization,
                method: usedMethod,
                time: performance.now() - startTime,
                verified: product === n,
                factorCount: factors.length,
                totalPrimeFactors: factors.reduce((sum, f) => sum + f.power, 0)
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
 * 試除法專用
 */
function trialDivision(payload) {
    const { number } = payload;

    try {
        const n = BigInt(number);
        const startTime = performance.now();

        const result = trialDivisionFactors(n, (current, total) => {
            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    current,
                    total,
                    percent: Math.floor((current / total) * 100),
                    phase: 'trial-division'
                }
            });
        });

        const factorization = result.factors.map(f =>
            f.power === 1 ? f.prime.toString() : `${f.prime}^${f.power}`
        ).join(' × ');

        self.postMessage({
            type: 'TRIAL_RESULT',
            payload: {
                number: n.toString(),
                factors: result.factors.map(f => ({
                    prime: f.prime.toString(),
                    power: f.power
                })),
                factorization,
                time: performance.now() - startTime,
                stopped: result.stopped
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
 * Pollard's Rho 專用
 */
function pollardRhoFactorize(payload) {
    const { number } = payload;

    try {
        const n = BigInt(number);
        const startTime = performance.now();

        const factors = pollardRhoFullFactorize(n);

        const factorization = factors.map(f =>
            f.power === 1 ? f.prime.toString() : `${f.prime}^${f.power}`
        ).join(' × ');

        self.postMessage({
            type: 'POLLARD_RESULT',
            payload: {
                number: n.toString(),
                factors: factors.map(f => ({
                    prime: f.prime.toString(),
                    power: f.power
                })),
                factorization,
                time: performance.now() - startTime
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
 * Fermat 分解專用
 */
function fermatFactorize(payload) {
    const { number, maxIterations = 1000000 } = payload;

    try {
        const n = BigInt(number);
        const startTime = performance.now();

        const result = fermatFactorization(n, maxIterations);

        if (result.found) {
            self.postMessage({
                type: 'FERMAT_RESULT',
                payload: {
                    number: n.toString(),
                    found: true,
                    p: result.p.toString(),
                    q: result.q.toString(),
                    iterations: result.iterations,
                    time: performance.now() - startTime,
                    verification: `${result.p} × ${result.q} = ${(result.p * result.q).toString()}`
                }
            });
        } else {
            self.postMessage({
                type: 'FERMAT_RESULT',
                payload: {
                    number: n.toString(),
                    found: false,
                    reason: result.reason,
                    iterations: result.iterations,
                    time: performance.now() - startTime
                }
            });
        }

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: { message: error.message }
        });
    }
}

/**
 * RSA 攻擊演示
 */
function rsaAttack(payload) {
    const { n, e, ciphertext } = payload;

    try {
        const N = BigInt(n);
        const E = BigInt(e);
        const C = ciphertext ? BigInt(ciphertext) : null;

        const startTime = performance.now();

        self.postMessage({
            type: 'PROGRESS',
            payload: { phase: 'factoring', percent: 0 }
        });

        // 分解 N
        let p, q;

        // 先嘗試 Fermat（對接近的質數有效）
        const fermatResult = fermatFactorization(N, 100000);
        if (fermatResult.found) {
            p = fermatResult.p;
            q = fermatResult.q;
        } else {
            // 使用 Pollard's Rho
            const factor = pollardRhoFindFactor(N);
            if (factor === null || factor === N) {
                self.postMessage({
                    type: 'RSA_ATTACK_RESULT',
                    payload: {
                        success: false,
                        reason: '無法分解 N',
                        time: performance.now() - startTime
                    }
                });
                return;
            }
            p = factor;
            q = N / factor;
        }

        // 確保 p < q
        if (p > q) [p, q] = [q, p];

        self.postMessage({
            type: 'PROGRESS',
            payload: { phase: 'computing-private-key', percent: 50 }
        });

        // 計算 φ(N) = (p-1)(q-1)
        const phi = (p - 1n) * (q - 1n);

        // 計算私鑰 d = e^(-1) mod φ(N)
        const d = modInverse(E, phi);

        if (d === null) {
            self.postMessage({
                type: 'RSA_ATTACK_RESULT',
                payload: {
                    success: false,
                    reason: 'e 與 φ(N) 不互質',
                    p: p.toString(),
                    q: q.toString(),
                    phi: phi.toString(),
                    time: performance.now() - startTime
                }
            });
            return;
        }

        // 如果有密文，解密
        let plaintext = null;
        if (C !== null) {
            plaintext = modPow(C, d, N);
        }

        self.postMessage({
            type: 'RSA_ATTACK_RESULT',
            payload: {
                success: true,
                n: N.toString(),
                e: E.toString(),
                p: p.toString(),
                q: q.toString(),
                phi: phi.toString(),
                d: d.toString(),
                ciphertext: C ? C.toString() : null,
                plaintext: plaintext ? plaintext.toString() : null,
                time: performance.now() - startTime,
                steps: [
                    `1. 目標：分解 N = ${N}`,
                    `2. 找到因子：p = ${p}, q = ${q}`,
                    `3. 計算 φ(N) = (p-1)(q-1) = ${phi}`,
                    `4. 計算私鑰 d = e⁻¹ mod φ(N) = ${d}`,
                    plaintext ? `5. 解密：M = C^d mod N = ${plaintext}` : null
                ].filter(Boolean)
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
 * 模反元素
 */
function modInverse(a, m) {
    let [old_r, r] = [a, m];
    let [old_s, s] = [1n, 0n];

    while (r !== 0n) {
        const quotient = old_r / r;
        [old_r, r] = [r, old_r - quotient * r];
        [old_s, s] = [s, old_s - quotient * s];
    }

    if (old_r !== 1n) return null;
    return ((old_s % m) + m) % m;
}

/**
 * 批量分解
 */
function factorizeBatch(payload) {
    const { numbers } = payload;

    try {
        const results = [];
        const total = numbers.length;

        for (let i = 0; i < numbers.length; i++) {
            if (shouldStop) {
                self.postMessage({
                    type: 'BATCH_RESULT',
                    payload: { results, stopped: true }
                });
                return;
            }

            const n = BigInt(numbers[i]);
            const startTime = performance.now();

            let factors;
            let isPrime = false;

            if (millerRabin(n)) {
                isPrime = true;
                factors = [{ prime: n, power: 1 }];
            } else if (n < 10000000000n) {
                factors = trialDivisionFactors(n).factors;
            } else {
                factors = pollardRhoFullFactorize(n);
            }

            const factorization = factors.map(f =>
                f.power === 1 ? f.prime.toString() : `${f.prime}^${f.power}`
            ).join(' × ');

            results.push({
                number: n.toString(),
                isPrime,
                factorization,
                factorCount: factors.length,
                time: performance.now() - startTime
            });

            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    current: i + 1,
                    total,
                    percent: Math.round(((i + 1) / total) * 100)
                }
            });
        }

        self.postMessage({
            type: 'BATCH_RESULT',
            payload: { results, stopped: false }
        });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: { message: error.message }
        });
    }
}

/**
 * 比較方法
 */
function compareMethods(payload) {
    const { number } = payload;

    try {
        const n = BigInt(number);
        const results = [];

        // 試除法
        self.postMessage({
            type: 'PROGRESS',
            payload: { phase: '試除法', percent: 0 }
        });

        const trialStart = performance.now();
        const trialResult = trialDivisionFactors(n);
        const trialTime = performance.now() - trialStart;

        results.push({
            method: '試除法',
            complexity: 'O(√n)',
            time: trialTime,
            factors: trialResult.factors.length,
            factorization: trialResult.factors.map(f =>
                f.power === 1 ? f.prime.toString() : `${f.prime}^${f.power}`
            ).join(' × ')
        });

        // Pollard's Rho
        self.postMessage({
            type: 'PROGRESS',
            payload: { phase: "Pollard's Rho", percent: 33 }
        });

        const pollardStart = performance.now();
        const pollardFactors = pollardRhoFullFactorize(n);
        const pollardTime = performance.now() - pollardStart;

        results.push({
            method: "Pollard's Rho",
            complexity: 'O(n^(1/4))',
            time: pollardTime,
            factors: pollardFactors.length,
            factorization: pollardFactors.map(f =>
                f.power === 1 ? f.prime.toString() : `${f.prime}^${f.power}`
            ).join(' × ')
        });

        // Fermat（如果是兩個因子的乘積）
        self.postMessage({
            type: 'PROGRESS',
            payload: { phase: 'Fermat', percent: 66 }
        });

        const fermatStart = performance.now();
        const fermatResult = fermatFactorization(n, 100000);
        const fermatTime = performance.now() - fermatStart;

        results.push({
            method: 'Fermat 分解法',
            complexity: 'O(|p-q|)',
            time: fermatTime,
            found: fermatResult.found,
            factors: fermatResult.found ? 2 : null,
            factorization: fermatResult.found ?
                `${fermatResult.p} × ${fermatResult.q}` : '未找到'
        });

        self.postMessage({
            type: 'COMPARE_RESULT',
            payload: {
                number: n.toString(),
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
 * 數字分析
 */
function analyzeNumber(payload) {
    const { number } = payload;

    try {
        const n = BigInt(number);
        const startTime = performance.now();

        // 基本資訊
        const digits = n.toString().length;
        const bits = n.toString(2).length;
        const isPrime = millerRabin(n);

        // 分解
        let factors = [];
        if (!isPrime) {
            if (n < 10000000000n) {
                factors = trialDivisionFactors(n).factors;
            } else {
                factors = pollardRhoFullFactorize(n);
            }
        } else {
            factors = [{ prime: n, power: 1 }];
        }

        // 計算因子數量 (divisor function)
        let divisorCount = 1n;
        for (const f of factors) {
            divisorCount *= BigInt(f.power + 1);
        }

        // 計算因子和
        let divisorSum = 1n;
        for (const f of factors) {
            const p = f.prime;
            const k = BigInt(f.power);
            // (p^(k+1) - 1) / (p - 1)
            divisorSum *= (modPow(p, k + 1n, 10n ** 30n) - 1n) / (p - 1n);
        }

        // 歐拉函數 φ(n)
        let phi = n;
        for (const f of factors) {
            phi = phi / f.prime * (f.prime - 1n);
        }

        // 檢查特殊類型
        const isSquare = isPerfectSquare(n);
        const isPowerOfTwo = (n & (n - 1n)) === 0n && n > 0n;
        const isSemiprime = factors.length === 2 &&
            factors[0].power === 1 && factors[1].power === 1;

        self.postMessage({
            type: 'ANALYZE_RESULT',
            payload: {
                number: n.toString(),
                digits,
                bits,
                isPrime,
                isSquare,
                isPowerOfTwo,
                isSemiprime,
                factors: factors.map(f => ({
                    prime: f.prime.toString(),
                    power: f.power
                })),
                factorization: factors.map(f =>
                    f.power === 1 ? f.prime.toString() : `${f.prime}^${f.power}`
                ).join(' × '),
                divisorCount: divisorCount.toString(),
                phi: phi.toString(),
                time: performance.now() - startTime
            }
        });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: { message: error.message }
        });
    }
}

// 回報 Worker 已就緒
self.postMessage({ type: 'READY' });
