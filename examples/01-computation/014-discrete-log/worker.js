/**
 * Web Worker: 離散對數計算
 *
 * 功能：
 * - 暴力搜尋法
 * - Baby-step Giant-step (BSGS) 算法
 * - Pollard's Rho 算法
 * - DH 攻擊演示
 * - 方法效能比較
 *
 * 離散對數問題：給定 g, h, p，找出 x 使得 g^x ≡ h (mod p)
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
        case 'CALCULATE':
            calculateDiscreteLog(payload);
            break;
        case 'BSGS':
            babyStepGiantStep(payload);
            break;
        case 'POLLARD_RHO':
            pollardRhoLog(payload);
            break;
        case 'DH_ATTACK':
            dhAttack(payload);
            break;
        case 'CALCULATE_BATCH':
            calculateBatch(payload);
            break;
        case 'COMPARE_METHODS':
            compareMethods(payload);
            break;
        case 'FIND_ORDER':
            findOrder(payload);
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
 * 模反元素（擴展歐幾里得算法）
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
 * 計算平方根（整數部分）
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
 * 暴力搜尋離散對數
 * 時間複雜度: O(n)
 */
function bruteForceLog(g, h, p, maxIterations = null) {
    const startTime = performance.now();
    let current = 1n;
    const limit = maxIterations ? BigInt(maxIterations) : p - 1n;

    for (let x = 0n; x <= limit; x++) {
        if (shouldStop) {
            return { found: false, reason: 'stopped' };
        }

        if (current === h) {
            return {
                found: true,
                x: x,
                time: performance.now() - startTime,
                iterations: Number(x) + 1
            };
        }

        current = (current * g) % p;

        // 進度報告
        if (x % 10000n === 0n && maxIterations) {
            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    current: Number(x),
                    total: Number(limit),
                    percent: Number((x * 100n) / limit)
                }
            });
        }
    }

    return {
        found: false,
        reason: 'not_found',
        time: performance.now() - startTime,
        iterations: Number(limit) + 1
    };
}

/**
 * Baby-step Giant-step 算法
 * 時間複雜度: O(√n)
 * 空間複雜度: O(√n)
 */
function bsgsAlgorithm(g, h, p, order = null) {
    const startTime = performance.now();

    // 群的階（如果未知，使用 p-1）
    const n = order || (p - 1n);

    // m = ceil(√n)
    const m = isqrt(n) + 1n;

    // Baby step: 建立查找表 g^j mod p for j = 0, 1, ..., m-1
    const table = new Map();
    let gj = 1n;

    self.postMessage({
        type: 'PROGRESS',
        payload: { phase: 'baby-step', percent: 0 }
    });

    for (let j = 0n; j < m; j++) {
        if (shouldStop) {
            return { found: false, reason: 'stopped' };
        }

        // 使用字串作為 Map 鍵
        table.set(gj.toString(), j);
        gj = (gj * g) % p;

        if (j % 1000n === 0n) {
            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    phase: 'baby-step',
                    current: Number(j),
                    total: Number(m),
                    percent: Number((j * 50n) / m)
                }
            });
        }
    }

    // Giant step: 計算 g^(-m) mod p
    const gm = modPow(g, m, p);
    const gmInv = modInverse(gm, p);

    if (gmInv === null) {
        return { found: false, reason: 'no_inverse' };
    }

    // 搜尋 h * (g^(-m))^i
    let gamma = h;

    self.postMessage({
        type: 'PROGRESS',
        payload: { phase: 'giant-step', percent: 50 }
    });

    for (let i = 0n; i < m; i++) {
        if (shouldStop) {
            return { found: false, reason: 'stopped' };
        }

        const gammaStr = gamma.toString();
        if (table.has(gammaStr)) {
            const j = table.get(gammaStr);
            const x = (i * m + j) % n;

            // 驗證
            if (modPow(g, x, p) === h) {
                return {
                    found: true,
                    x: x,
                    time: performance.now() - startTime,
                    tableSize: Number(m),
                    algorithm: 'BSGS'
                };
            }
        }

        gamma = (gamma * gmInv) % p;

        if (i % 1000n === 0n) {
            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    phase: 'giant-step',
                    current: Number(i),
                    total: Number(m),
                    percent: 50 + Number((i * 50n) / m)
                }
            });
        }
    }

    return {
        found: false,
        reason: 'not_found',
        time: performance.now() - startTime
    };
}

/**
 * Pollard's Rho 算法用於離散對數
 * 時間複雜度: O(√n)
 * 空間複雜度: O(1)
 */
function pollardRhoAlgorithm(g, h, p, order = null) {
    const startTime = performance.now();
    const n = order || (p - 1n);

    // 分區函數：將群分成三個部分
    function partition(x) {
        const r = x % 3n;
        if (r === 0n) return 0; // S1: 乘以 h
        if (r === 1n) return 1; // S2: 平方
        return 2;               // S3: 乘以 g
    }

    // 迭代函數 f(x, a, b) -> (x', a', b')
    function iterate(x, a, b) {
        const part = partition(x);

        if (part === 0) {
            // x' = x * h, a' = a, b' = b + 1
            return [(x * h) % p, a, (b + 1n) % n];
        } else if (part === 1) {
            // x' = x^2, a' = 2a, b' = 2b
            return [(x * x) % p, (2n * a) % n, (2n * b) % n];
        } else {
            // x' = x * g, a' = a + 1, b' = b
            return [(x * g) % p, (a + 1n) % n, b];
        }
    }

    // 初始值
    let [x, a, b] = [1n, 0n, 0n];
    let [X, A, B] = [1n, 0n, 0n];

    let iterations = 0;
    const maxIterations = Number(n) > 10000000 ? 10000000 : Number(n);

    while (iterations < maxIterations) {
        if (shouldStop) {
            return { found: false, reason: 'stopped' };
        }

        // 龜：走一步
        [x, a, b] = iterate(x, a, b);

        // 兔：走兩步
        [X, A, B] = iterate(X, A, B);
        [X, A, B] = iterate(X, A, B);

        iterations++;

        if (iterations % 10000 === 0) {
            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    iterations: iterations,
                    percent: Math.min(99, Math.floor(iterations / 1000))
                }
            });
        }

        // 找到碰撞
        if (x === X) {
            // 解方程 a + x*log = A + X*log (mod n)
            // (a - A) = (B - b) * log (mod n)
            const r = ((b - B) % n + n) % n;

            if (r === 0n) {
                // 無法求解，需要重新開始
                [x, a, b] = [BigInt(iterations) + 1n, 0n, 0n];
                [X, A, B] = [BigInt(iterations) + 1n, 0n, 0n];
                continue;
            }

            const rInv = modInverse(r, n);
            if (rInv === null) {
                // r 和 n 不互質，嘗試處理
                [x, a, b] = [BigInt(iterations) + 1n, 0n, 0n];
                [X, A, B] = [BigInt(iterations) + 1n, 0n, 0n];
                continue;
            }

            const log = (((A - a) % n + n) * rInv) % n;

            // 驗證
            if (modPow(g, log, p) === h) {
                return {
                    found: true,
                    x: log,
                    time: performance.now() - startTime,
                    iterations: iterations,
                    algorithm: 'Pollard-Rho'
                };
            }

            // 結果不正確，嘗試其他解
            // 對於非質數階，可能有多個解
            for (let k = 1n; k < 10n; k++) {
                const candidate = (log + k * (n / gcd(r, n))) % n;
                if (modPow(g, candidate, p) === h) {
                    return {
                        found: true,
                        x: candidate,
                        time: performance.now() - startTime,
                        iterations: iterations,
                        algorithm: 'Pollard-Rho'
                    };
                }
            }

            // 重新開始
            [x, a, b] = [BigInt(iterations) + 1n, 0n, 0n];
            [X, A, B] = [BigInt(iterations) + 1n, 0n, 0n];
        }
    }

    return {
        found: false,
        reason: 'max_iterations',
        time: performance.now() - startTime,
        iterations: iterations
    };
}

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
 * 計算離散對數（自動選擇方法）
 */
function calculateDiscreteLog(payload) {
    const { generator, target, modulus, method = 'auto' } = payload;

    try {
        const g = BigInt(generator);
        const h = BigInt(target);
        const p = BigInt(modulus);

        // 驗證輸入
        if (p <= 1n) {
            throw new Error('模數必須大於 1');
        }

        if (g <= 0n || g >= p) {
            throw new Error('生成元必須在 1 到 p-1 之間');
        }

        if (h <= 0n || h >= p) {
            throw new Error('目標值必須在 1 到 p-1 之間');
        }

        // 特殊情況
        if (h === 1n) {
            self.postMessage({
                type: 'CALCULATE_RESULT',
                payload: {
                    generator: g.toString(),
                    target: h.toString(),
                    modulus: p.toString(),
                    result: '0',
                    method: 'trivial',
                    time: 0,
                    verification: `${g}^0 ≡ 1 (mod ${p})`
                }
            });
            return;
        }

        if (h === g) {
            self.postMessage({
                type: 'CALCULATE_RESULT',
                payload: {
                    generator: g.toString(),
                    target: h.toString(),
                    modulus: p.toString(),
                    result: '1',
                    method: 'trivial',
                    time: 0,
                    verification: `${g}^1 ≡ ${g} (mod ${p})`
                }
            });
            return;
        }

        let result;
        const startTime = performance.now();

        if (method === 'brute' || (method === 'auto' && p < 100000n)) {
            result = bruteForceLog(g, h, p);
            result.method = 'brute-force';
        } else if (method === 'bsgs' || (method === 'auto' && p < 10000000000n)) {
            result = bsgsAlgorithm(g, h, p);
            result.method = 'BSGS';
        } else {
            result = pollardRhoAlgorithm(g, h, p);
            result.method = 'Pollard-Rho';
        }

        if (result.found) {
            self.postMessage({
                type: 'CALCULATE_RESULT',
                payload: {
                    generator: g.toString(),
                    target: h.toString(),
                    modulus: p.toString(),
                    result: result.x.toString(),
                    method: result.method,
                    time: result.time,
                    iterations: result.iterations || result.tableSize,
                    verification: `${g}^${result.x} ≡ ${h} (mod ${p})`
                }
            });
        } else {
            self.postMessage({
                type: 'CALCULATE_RESULT',
                payload: {
                    generator: g.toString(),
                    target: h.toString(),
                    modulus: p.toString(),
                    result: null,
                    reason: result.reason,
                    method: result.method,
                    time: result.time
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
 * Baby-step Giant-step 專用計算
 */
function babyStepGiantStep(payload) {
    const { generator, target, modulus, order } = payload;

    try {
        const g = BigInt(generator);
        const h = BigInt(target);
        const p = BigInt(modulus);
        const n = order ? BigInt(order) : null;

        const result = bsgsAlgorithm(g, h, p, n);

        if (result.found) {
            self.postMessage({
                type: 'BSGS_RESULT',
                payload: {
                    generator: g.toString(),
                    target: h.toString(),
                    modulus: p.toString(),
                    result: result.x.toString(),
                    time: result.time,
                    tableSize: result.tableSize,
                    verification: `${g}^${result.x} mod ${p} = ${modPow(g, result.x, p)}`
                }
            });
        } else {
            self.postMessage({
                type: 'BSGS_RESULT',
                payload: {
                    generator: g.toString(),
                    target: h.toString(),
                    modulus: p.toString(),
                    result: null,
                    reason: result.reason,
                    time: result.time
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
 * Pollard's Rho 專用計算
 */
function pollardRhoLog(payload) {
    const { generator, target, modulus, order } = payload;

    try {
        const g = BigInt(generator);
        const h = BigInt(target);
        const p = BigInt(modulus);
        const n = order ? BigInt(order) : null;

        const result = pollardRhoAlgorithm(g, h, p, n);

        if (result.found) {
            self.postMessage({
                type: 'POLLARD_RESULT',
                payload: {
                    generator: g.toString(),
                    target: h.toString(),
                    modulus: p.toString(),
                    result: result.x.toString(),
                    time: result.time,
                    iterations: result.iterations,
                    verification: `${g}^${result.x} mod ${p} = ${modPow(g, result.x, p)}`
                }
            });
        } else {
            self.postMessage({
                type: 'POLLARD_RESULT',
                payload: {
                    generator: g.toString(),
                    target: h.toString(),
                    modulus: p.toString(),
                    result: null,
                    reason: result.reason,
                    time: result.time,
                    iterations: result.iterations
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
 * Diffie-Hellman 攻擊演示
 * 展示如何透過離散對數破解 DH 金鑰交換
 */
function dhAttack(payload) {
    const { prime, generator, alicePublic, bobPublic } = payload;

    try {
        const p = BigInt(prime);
        const g = BigInt(generator);
        const A = BigInt(alicePublic);
        const B = BigInt(bobPublic);

        const startTime = performance.now();

        self.postMessage({
            type: 'PROGRESS',
            payload: { phase: 'attacking-alice', percent: 0 }
        });

        // 嘗試找出 Alice 的私鑰 a，使得 g^a = A (mod p)
        let aliceResult;
        if (p < 100000n) {
            aliceResult = bruteForceLog(g, A, p);
        } else {
            aliceResult = bsgsAlgorithm(g, A, p);
        }

        if (!aliceResult.found) {
            self.postMessage({
                type: 'DH_ATTACK_RESULT',
                payload: {
                    success: false,
                    reason: 'cannot_find_alice_private',
                    time: performance.now() - startTime
                }
            });
            return;
        }

        const alicePrivate = aliceResult.x;

        self.postMessage({
            type: 'PROGRESS',
            payload: { phase: 'attacking-bob', percent: 50 }
        });

        // 嘗試找出 Bob 的私鑰 b，使得 g^b = B (mod p)
        let bobResult;
        if (p < 100000n) {
            bobResult = bruteForceLog(g, B, p);
        } else {
            bobResult = bsgsAlgorithm(g, B, p);
        }

        if (!bobResult.found) {
            self.postMessage({
                type: 'DH_ATTACK_RESULT',
                payload: {
                    success: false,
                    reason: 'cannot_find_bob_private',
                    alicePrivate: alicePrivate.toString(),
                    time: performance.now() - startTime
                }
            });
            return;
        }

        const bobPrivate = bobResult.x;

        // 計算共享密鑰
        const sharedKey1 = modPow(B, alicePrivate, p);
        const sharedKey2 = modPow(A, bobPrivate, p);

        self.postMessage({
            type: 'DH_ATTACK_RESULT',
            payload: {
                success: true,
                prime: p.toString(),
                generator: g.toString(),
                alicePublic: A.toString(),
                bobPublic: B.toString(),
                alicePrivate: alicePrivate.toString(),
                bobPrivate: bobPrivate.toString(),
                sharedKey: sharedKey1.toString(),
                verification: sharedKey1 === sharedKey2,
                time: performance.now() - startTime,
                steps: [
                    `1. 攔截公開參數: p=${p}, g=${g}`,
                    `2. 攔截 Alice 公鑰: A=${A}`,
                    `3. 攔截 Bob 公鑰: B=${B}`,
                    `4. 計算離散對數: log_${g}(${A}) = ${alicePrivate} (mod ${p})`,
                    `5. 計算離散對數: log_${g}(${B}) = ${bobPrivate} (mod ${p})`,
                    `6. 計算共享密鑰: ${B}^${alicePrivate} = ${sharedKey1} (mod ${p})`,
                    `7. 驗證: ${A}^${bobPrivate} = ${sharedKey2} (mod ${p})`
                ]
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
 * 批量計算離散對數
 */
function calculateBatch(payload) {
    const { calculations } = payload;

    try {
        const results = [];
        const total = calculations.length;

        for (let i = 0; i < calculations.length; i++) {
            if (shouldStop) {
                self.postMessage({
                    type: 'BATCH_RESULT',
                    payload: { results, stopped: true }
                });
                return;
            }

            const calc = calculations[i];
            const g = BigInt(calc.generator);
            const h = BigInt(calc.target);
            const p = BigInt(calc.modulus);

            const startTime = performance.now();
            let result;

            if (p < 100000n) {
                result = bruteForceLog(g, h, p);
            } else {
                result = bsgsAlgorithm(g, h, p);
            }

            results.push({
                input: `log_${g}(${h}) mod ${p}`,
                result: result.found ? result.x.toString() : 'not found',
                time: performance.now() - startTime
            });

            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    current: i + 1,
                    total: total,
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
 * 比較不同方法的效能
 */
function compareMethods(payload) {
    const { generator, target, modulus } = payload;

    try {
        const g = BigInt(generator);
        const h = BigInt(target);
        const p = BigInt(modulus);

        const results = [];

        // 暴力法（限制迭代次數）
        self.postMessage({
            type: 'PROGRESS',
            payload: { phase: 'brute-force', percent: 0 }
        });

        const bruteLimit = p < 1000000n ? Number(p) : 100000;
        const bruteStart = performance.now();
        const bruteResult = bruteForceLog(g, h, p, bruteLimit);
        const bruteTime = performance.now() - bruteStart;

        results.push({
            method: '暴力搜尋',
            complexity: 'O(n)',
            time: bruteTime,
            found: bruteResult.found,
            result: bruteResult.found ? bruteResult.x.toString() : null,
            iterations: bruteResult.iterations
        });

        // BSGS
        self.postMessage({
            type: 'PROGRESS',
            payload: { phase: 'BSGS', percent: 33 }
        });

        const bsgsStart = performance.now();
        const bsgsResult = bsgsAlgorithm(g, h, p);
        const bsgsTime = performance.now() - bsgsStart;

        results.push({
            method: 'Baby-step Giant-step',
            complexity: 'O(√n)',
            time: bsgsTime,
            found: bsgsResult.found,
            result: bsgsResult.found ? bsgsResult.x.toString() : null,
            tableSize: bsgsResult.tableSize
        });

        // Pollard's Rho
        self.postMessage({
            type: 'PROGRESS',
            payload: { phase: 'Pollard-Rho', percent: 66 }
        });

        const pollardStart = performance.now();
        const pollardResult = pollardRhoAlgorithm(g, h, p);
        const pollardTime = performance.now() - pollardStart;

        results.push({
            method: "Pollard's Rho",
            complexity: 'O(√n)',
            time: pollardTime,
            found: pollardResult.found,
            result: pollardResult.found ? pollardResult.x.toString() : null,
            iterations: pollardResult.iterations
        });

        self.postMessage({
            type: 'COMPARE_RESULT',
            payload: {
                generator: g.toString(),
                target: h.toString(),
                modulus: p.toString(),
                results: results
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
 * 計算元素的階
 */
function findOrder(payload) {
    const { element, modulus } = payload;

    try {
        const a = BigInt(element);
        const p = BigInt(modulus);

        if (gcd(a, p) !== 1n) {
            throw new Error('元素與模數必須互質');
        }

        const startTime = performance.now();
        let current = a;
        let order = 1n;
        const maxOrder = p - 1n;

        while (current !== 1n && order <= maxOrder) {
            if (shouldStop) {
                self.postMessage({
                    type: 'ORDER_RESULT',
                    payload: { found: false, reason: 'stopped' }
                });
                return;
            }

            current = (current * a) % p;
            order++;

            if (order % 10000n === 0n) {
                self.postMessage({
                    type: 'PROGRESS',
                    payload: {
                        current: Number(order),
                        percent: Number((order * 100n) / maxOrder)
                    }
                });
            }
        }

        const isPrimitiveRoot = order === p - 1n;

        // 產生一些冪次來展示
        const powers = [];
        let pow = 1n;
        const showCount = Math.min(Number(order), 20);
        for (let i = 0; i < showCount; i++) {
            powers.push({ exp: i, value: pow.toString() });
            pow = (pow * a) % p;
        }
        if (Number(order) > 20) {
            powers.push({ exp: '...', value: '...' });
            powers.push({ exp: Number(order), value: '1' });
        }

        self.postMessage({
            type: 'ORDER_RESULT',
            payload: {
                element: a.toString(),
                modulus: p.toString(),
                order: order.toString(),
                isPrimitiveRoot: isPrimitiveRoot,
                phiP: (p - 1n).toString(),
                powers: powers,
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
