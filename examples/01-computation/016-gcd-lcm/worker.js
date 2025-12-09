/**
 * Web Worker: 最大公因數與最小公倍數計算
 *
 * 功能：
 * - 歐幾里得算法 (Euclidean Algorithm)
 * - 擴展歐幾里得算法 (Extended Euclidean Algorithm)
 * - 二進位 GCD (Stein's Algorithm)
 * - 多數 GCD/LCM
 * - Bézout 係數計算
 * - 互質判定
 * - 計算步驟視覺化
 *
 * GCD 是數論與密碼學的基礎運算
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
        case 'CALCULATE_GCD':
            calculateGCD(payload);
            break;
        case 'CALCULATE_LCM':
            calculateLCM(payload);
            break;
        case 'EXTENDED_GCD':
            extendedGCD(payload);
            break;
        case 'BINARY_GCD':
            binaryGCD(payload);
            break;
        case 'MULTIPLE_GCD':
            multipleGCD(payload);
            break;
        case 'MULTIPLE_LCM':
            multipleLCM(payload);
            break;
        case 'CHECK_COPRIME':
            checkCoprime(payload);
            break;
        case 'COMPARE_METHODS':
            compareMethods(payload);
            break;
        case 'VISUALIZE_STEPS':
            visualizeSteps(payload);
            break;
        case 'BATCH_CALCULATE':
            batchCalculate(payload);
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
 * 歐幾里得算法計算 GCD
 * 時間複雜度: O(log(min(a,b)))
 */
function euclideanGCD(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;

    while (b !== 0n) {
        [a, b] = [b, a % b];
    }

    return a;
}

/**
 * 歐幾里得算法（帶步驟記錄）
 */
function euclideanGCDWithSteps(a, b) {
    const steps = [];
    let originalA = a;
    let originalB = b;

    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;

    // 確保 a >= b
    if (a < b) [a, b] = [b, a];

    while (b !== 0n) {
        const quotient = a / b;
        const remainder = a % b;

        steps.push({
            a: a.toString(),
            b: b.toString(),
            quotient: quotient.toString(),
            remainder: remainder.toString(),
            equation: `${a} = ${quotient} × ${b} + ${remainder}`
        });

        [a, b] = [b, remainder];
    }

    return { gcd: a, steps };
}

/**
 * 擴展歐幾里得算法
 * 計算 gcd(a, b) 和 Bézout 係數 x, y 使得 ax + by = gcd(a,b)
 */
function extendedEuclidean(a, b) {
    const steps = [];
    const originalA = a;
    const originalB = b;

    // 處理負數
    const signA = a < 0n ? -1n : 1n;
    const signB = b < 0n ? -1n : 1n;
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;

    let [old_r, r] = [a, b];
    let [old_s, s] = [1n, 0n];
    let [old_t, t] = [0n, 1n];

    while (r !== 0n) {
        const quotient = old_r / r;

        steps.push({
            r: old_r.toString(),
            s: old_s.toString(),
            t: old_t.toString(),
            quotient: quotient.toString(),
            equation: `${old_r} = ${quotient} × ${r} + ${old_r % r}`
        });

        [old_r, r] = [r, old_r - quotient * r];
        [old_s, s] = [s, old_s - quotient * s];
        [old_t, t] = [t, old_t - quotient * t];
    }

    // 調整符號
    const x = old_s * signA;
    const y = old_t * signB;

    return {
        gcd: old_r,
        x,
        y,
        steps,
        verification: `(${originalA}) × (${x}) + (${originalB}) × (${y}) = ${originalA * x + originalB * y}`
    };
}

/**
 * 二進位 GCD (Stein's Algorithm)
 * 只使用減法和位移運算，對某些架構更高效
 */
function steinGCD(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;

    if (a === 0n) return b;
    if (b === 0n) return a;

    // 找出共同的 2 因子
    let shift = 0n;
    while (((a | b) & 1n) === 0n) {
        a >>= 1n;
        b >>= 1n;
        shift++;
    }

    // 移除 a 的 2 因子
    while ((a & 1n) === 0n) {
        a >>= 1n;
    }

    while (b !== 0n) {
        // 移除 b 的 2 因子
        while ((b & 1n) === 0n) {
            b >>= 1n;
        }

        // 確保 a <= b
        if (a > b) {
            [a, b] = [b, a];
        }

        b = b - a;
    }

    return a << shift;
}

/**
 * 二進位 GCD（帶步驟記錄）
 */
function steinGCDWithSteps(a, b) {
    const steps = [];

    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;

    if (a === 0n) return { gcd: b, steps: [{ action: 'a=0', result: b.toString() }] };
    if (b === 0n) return { gcd: a, steps: [{ action: 'b=0', result: a.toString() }] };

    let shift = 0n;

    // 找出共同的 2 因子
    while (((a | b) & 1n) === 0n) {
        steps.push({
            action: '共同除以 2',
            a: a.toString(),
            b: b.toString(),
            shift: (shift + 1n).toString()
        });
        a >>= 1n;
        b >>= 1n;
        shift++;
    }

    // 移除 a 的 2 因子
    while ((a & 1n) === 0n) {
        steps.push({
            action: 'a 除以 2',
            a: (a >> 1n).toString(),
            b: b.toString()
        });
        a >>= 1n;
    }

    while (b !== 0n) {
        while ((b & 1n) === 0n) {
            b >>= 1n;
        }

        if (a > b) {
            [a, b] = [b, a];
        }

        steps.push({
            action: 'b = b - a',
            a: a.toString(),
            b: b.toString(),
            newB: (b - a).toString()
        });

        b = b - a;
    }

    const result = a << shift;
    steps.push({
        action: '還原 2 因子',
        base: a.toString(),
        shift: shift.toString(),
        result: result.toString()
    });

    return { gcd: result, steps };
}

/**
 * 計算 LCM
 * lcm(a, b) = |a × b| / gcd(a, b)
 */
function calculateLCMValue(a, b) {
    a = a < 0n ? -a : a;
    b = b < 0n ? -b : b;

    if (a === 0n || b === 0n) return 0n;

    return (a / euclideanGCD(a, b)) * b;
}

/**
 * 計算 GCD
 */
function calculateGCD(payload) {
    const { a, b, showSteps = false } = payload;

    try {
        const numA = BigInt(a);
        const numB = BigInt(b);
        const startTime = performance.now();

        if (showSteps) {
            const result = euclideanGCDWithSteps(numA, numB);
            self.postMessage({
                type: 'GCD_RESULT',
                payload: {
                    a: numA.toString(),
                    b: numB.toString(),
                    gcd: result.gcd.toString(),
                    steps: result.steps,
                    time: performance.now() - startTime,
                    method: '歐幾里得算法'
                }
            });
        } else {
            const gcd = euclideanGCD(numA, numB);
            self.postMessage({
                type: 'GCD_RESULT',
                payload: {
                    a: numA.toString(),
                    b: numB.toString(),
                    gcd: gcd.toString(),
                    time: performance.now() - startTime,
                    method: '歐幾里得算法'
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
 * 計算 LCM
 */
function calculateLCM(payload) {
    const { a, b } = payload;

    try {
        const numA = BigInt(a);
        const numB = BigInt(b);
        const startTime = performance.now();

        const gcd = euclideanGCD(numA, numB);
        const lcm = calculateLCMValue(numA, numB);

        self.postMessage({
            type: 'LCM_RESULT',
            payload: {
                a: numA.toString(),
                b: numB.toString(),
                gcd: gcd.toString(),
                lcm: lcm.toString(),
                time: performance.now() - startTime,
                formula: `lcm(${numA}, ${numB}) = |${numA} × ${numB}| / gcd = ${(numA < 0n ? -numA : numA) * (numB < 0n ? -numB : numB)} / ${gcd} = ${lcm}`
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
 * 擴展歐幾里得算法
 */
function extendedGCD(payload) {
    const { a, b } = payload;

    try {
        const numA = BigInt(a);
        const numB = BigInt(b);
        const startTime = performance.now();

        const result = extendedEuclidean(numA, numB);

        self.postMessage({
            type: 'EXTENDED_GCD_RESULT',
            payload: {
                a: numA.toString(),
                b: numB.toString(),
                gcd: result.gcd.toString(),
                x: result.x.toString(),
                y: result.y.toString(),
                steps: result.steps,
                verification: result.verification,
                bezoutIdentity: `${numA} × (${result.x}) + ${numB} × (${result.y}) = ${result.gcd}`,
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
 * 二進位 GCD
 */
function binaryGCD(payload) {
    const { a, b, showSteps = false } = payload;

    try {
        const numA = BigInt(a);
        const numB = BigInt(b);
        const startTime = performance.now();

        if (showSteps) {
            const result = steinGCDWithSteps(numA, numB);
            self.postMessage({
                type: 'BINARY_GCD_RESULT',
                payload: {
                    a: numA.toString(),
                    b: numB.toString(),
                    gcd: result.gcd.toString(),
                    steps: result.steps,
                    time: performance.now() - startTime,
                    method: "Stein's Algorithm (二進位 GCD)"
                }
            });
        } else {
            const gcd = steinGCD(numA, numB);
            self.postMessage({
                type: 'BINARY_GCD_RESULT',
                payload: {
                    a: numA.toString(),
                    b: numB.toString(),
                    gcd: gcd.toString(),
                    time: performance.now() - startTime,
                    method: "Stein's Algorithm (二進位 GCD)"
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
 * 多數 GCD
 */
function multipleGCD(payload) {
    const { numbers } = payload;

    try {
        const nums = numbers.map(n => BigInt(n));
        const startTime = performance.now();

        if (nums.length === 0) {
            throw new Error('請至少輸入一個數字');
        }

        if (nums.length === 1) {
            const result = nums[0] < 0n ? -nums[0] : nums[0];
            self.postMessage({
                type: 'MULTIPLE_GCD_RESULT',
                payload: {
                    numbers: nums.map(n => n.toString()),
                    gcd: result.toString(),
                    time: performance.now() - startTime
                }
            });
            return;
        }

        let result = nums[0];
        const steps = [];

        for (let i = 1; i < nums.length; i++) {
            if (shouldStop) {
                self.postMessage({
                    type: 'MULTIPLE_GCD_RESULT',
                    payload: { stopped: true }
                });
                return;
            }

            const prevGcd = result;
            result = euclideanGCD(result, nums[i]);
            steps.push({
                step: i,
                pair: `gcd(${prevGcd}, ${nums[i]})`,
                result: result.toString()
            });

            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    current: i,
                    total: nums.length - 1,
                    percent: Math.round((i / (nums.length - 1)) * 100)
                }
            });
        }

        self.postMessage({
            type: 'MULTIPLE_GCD_RESULT',
            payload: {
                numbers: nums.map(n => n.toString()),
                gcd: result.toString(),
                steps,
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
 * 多數 LCM
 */
function multipleLCM(payload) {
    const { numbers } = payload;

    try {
        const nums = numbers.map(n => BigInt(n));
        const startTime = performance.now();

        if (nums.length === 0) {
            throw new Error('請至少輸入一個數字');
        }

        if (nums.some(n => n === 0n)) {
            self.postMessage({
                type: 'MULTIPLE_LCM_RESULT',
                payload: {
                    numbers: nums.map(n => n.toString()),
                    lcm: '0',
                    note: 'LCM 包含 0 時結果為 0',
                    time: performance.now() - startTime
                }
            });
            return;
        }

        if (nums.length === 1) {
            const result = nums[0] < 0n ? -nums[0] : nums[0];
            self.postMessage({
                type: 'MULTIPLE_LCM_RESULT',
                payload: {
                    numbers: nums.map(n => n.toString()),
                    lcm: result.toString(),
                    time: performance.now() - startTime
                }
            });
            return;
        }

        let result = nums[0] < 0n ? -nums[0] : nums[0];
        const steps = [];

        for (let i = 1; i < nums.length; i++) {
            if (shouldStop) {
                self.postMessage({
                    type: 'MULTIPLE_LCM_RESULT',
                    payload: { stopped: true }
                });
                return;
            }

            const prevLcm = result;
            result = calculateLCMValue(result, nums[i]);
            steps.push({
                step: i,
                pair: `lcm(${prevLcm}, ${nums[i]})`,
                result: result.toString()
            });

            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    current: i,
                    total: nums.length - 1,
                    percent: Math.round((i / (nums.length - 1)) * 100)
                }
            });
        }

        self.postMessage({
            type: 'MULTIPLE_LCM_RESULT',
            payload: {
                numbers: nums.map(n => n.toString()),
                lcm: result.toString(),
                steps,
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
 * 互質判定
 */
function checkCoprime(payload) {
    const { numbers } = payload;

    try {
        const nums = numbers.map(n => BigInt(n));
        const startTime = performance.now();

        if (nums.length < 2) {
            throw new Error('請至少輸入兩個數字');
        }

        const results = [];
        let allCoprime = true;

        // 兩兩檢查
        for (let i = 0; i < nums.length; i++) {
            for (let j = i + 1; j < nums.length; j++) {
                const gcd = euclideanGCD(nums[i], nums[j]);
                const isCoprime = gcd === 1n;
                if (!isCoprime) allCoprime = false;

                results.push({
                    pair: `(${nums[i]}, ${nums[j]})`,
                    gcd: gcd.toString(),
                    coprime: isCoprime
                });
            }
        }

        self.postMessage({
            type: 'COPRIME_RESULT',
            payload: {
                numbers: nums.map(n => n.toString()),
                allCoprime,
                pairResults: results,
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
 * 比較方法
 */
function compareMethods(payload) {
    const { a, b, iterations = 1000 } = payload;

    try {
        const numA = BigInt(a);
        const numB = BigInt(b);
        const results = [];

        // 歐幾里得算法
        let startTime = performance.now();
        let result;
        for (let i = 0; i < iterations; i++) {
            result = euclideanGCD(numA, numB);
        }
        results.push({
            method: '歐幾里得算法',
            time: (performance.now() - startTime) / iterations,
            result: result.toString(),
            description: '使用除法和取餘'
        });

        // 二進位 GCD
        startTime = performance.now();
        for (let i = 0; i < iterations; i++) {
            result = steinGCD(numA, numB);
        }
        results.push({
            method: "Stein's Algorithm",
            time: (performance.now() - startTime) / iterations,
            result: result.toString(),
            description: '只使用減法和位移'
        });

        self.postMessage({
            type: 'COMPARE_RESULT',
            payload: {
                a: numA.toString(),
                b: numB.toString(),
                iterations,
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
 * 視覺化步驟
 */
function visualizeSteps(payload) {
    const { a, b, method = 'euclidean' } = payload;

    try {
        const numA = BigInt(a);
        const numB = BigInt(b);

        let result;
        if (method === 'binary') {
            result = steinGCDWithSteps(numA, numB);
            result.method = "Stein's Algorithm";
        } else {
            result = euclideanGCDWithSteps(numA, numB);
            result.method = '歐幾里得算法';
        }

        self.postMessage({
            type: 'VISUALIZE_RESULT',
            payload: {
                a: numA.toString(),
                b: numB.toString(),
                gcd: result.gcd.toString(),
                method: result.method,
                steps: result.steps,
                stepCount: result.steps.length
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
function batchCalculate(payload) {
    const { pairs, type = 'gcd' } = payload;

    try {
        const results = [];
        const startTime = performance.now();

        for (let i = 0; i < pairs.length; i++) {
            if (shouldStop) {
                self.postMessage({
                    type: 'BATCH_RESULT',
                    payload: { results, stopped: true }
                });
                return;
            }

            const { a, b } = pairs[i];
            const numA = BigInt(a);
            const numB = BigInt(b);

            if (type === 'gcd') {
                results.push({
                    a: numA.toString(),
                    b: numB.toString(),
                    result: euclideanGCD(numA, numB).toString()
                });
            } else {
                results.push({
                    a: numA.toString(),
                    b: numB.toString(),
                    result: calculateLCMValue(numA, numB).toString()
                });
            }

            if (i % 10 === 0) {
                self.postMessage({
                    type: 'PROGRESS',
                    payload: {
                        current: i + 1,
                        total: pairs.length,
                        percent: Math.round(((i + 1) / pairs.length) * 100)
                    }
                });
            }
        }

        self.postMessage({
            type: 'BATCH_RESULT',
            payload: {
                type,
                results,
                time: performance.now() - startTime,
                stopped: false
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
