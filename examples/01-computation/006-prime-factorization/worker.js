/**
 * 質因數分解器 - Web Worker 腳本
 *
 * 功能：使用試除法和 Pollard's rho 算法進行質因數分解
 * 技術：BigInt 大數運算、多種分解算法
 */

// ===== 停止旗標 =====

let shouldStop = false;

// ===== 訊息處理 =====

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'FACTORIZE_SINGLE':
            factorizeSingle(payload);
            break;
        case 'FACTORIZE_BATCH':
            factorizeBatch(payload);
            break;
        case 'FACTORIZE_RANGE':
            factorizeRange(payload);
            break;
        case 'FIND_DIVISORS':
            findDivisors(payload);
            break;
        case 'CHECK_PRIME':
            checkPrime(payload);
            break;
        case 'STOP':
            shouldStop = true;
            break;
        default:
            sendError('未知的訊息類型');
    }
};

// ===== 單數分解 =====

function factorizeSingle(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { number } = payload;
        let n = BigInt(number);

        // 輸入驗證
        if (n < 1n) {
            sendError('請輸入正整數');
            return;
        }

        if (n === 1n) {
            sendResult('SINGLE_RESULT', {
                original: number,
                factors: [],
                factorization: '1',
                isPrime: false,
                isOne: true,
                divisorCount: 1,
                divisorSum: '1',
                duration: performance.now() - startTime
            });
            return;
        }

        sendProgress(0, '開始分解...');

        // 執行分解
        const factors = primeFactorize(n);

        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        // 整理結果
        const factorMap = new Map();
        for (const f of factors) {
            const key = f.toString();
            factorMap.set(key, (factorMap.get(key) || 0) + 1);
        }

        const factorList = [];
        for (const [prime, count] of factorMap) {
            factorList.push({ prime, count });
        }
        factorList.sort((a, b) => BigInt(a.prime) < BigInt(b.prime) ? -1 : 1);

        // 生成因數分解式
        const factorization = factorList
            .map(f => f.count === 1 ? f.prime : `${f.prime}^${f.count}`)
            .join(' × ');

        // 計算因數個數和因數和
        let divisorCount = 1n;
        let divisorSum = 1n;
        for (const { prime, count } of factorList) {
            const p = BigInt(prime);
            divisorCount *= BigInt(count + 1);
            // 等比級數求和: (p^(count+1) - 1) / (p - 1)
            divisorSum *= (p ** BigInt(count + 1) - 1n) / (p - 1n);
        }

        const isPrime = factorList.length === 1 && factorList[0].count === 1;

        sendResult('SINGLE_RESULT', {
            original: number,
            factors: factorList,
            factorization: factorization || number,
            isPrime,
            isOne: false,
            divisorCount: divisorCount.toString(),
            divisorSum: divisorSum.toString(),
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`分解錯誤: ${error.message}`);
    }
}

// ===== 批量分解 =====

function factorizeBatch(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { numbers } = payload;
        const results = [];
        const total = numbers.length;

        for (let i = 0; i < total; i++) {
            if (shouldStop) {
                sendProgress(0, '計算已取消');
                return;
            }

            const percent = Math.floor((i / total) * 100);
            sendProgress(percent, `分解中... (${i + 1}/${total})`);

            try {
                const n = BigInt(numbers[i]);
                if (n < 1n) {
                    results.push({
                        original: numbers[i],
                        error: '無效數字'
                    });
                    continue;
                }

                if (n === 1n) {
                    results.push({
                        original: numbers[i],
                        factorization: '1',
                        isPrime: false
                    });
                    continue;
                }

                const factors = primeFactorize(n);
                const factorMap = new Map();
                for (const f of factors) {
                    const key = f.toString();
                    factorMap.set(key, (factorMap.get(key) || 0) + 1);
                }

                const factorList = [];
                for (const [prime, count] of factorMap) {
                    factorList.push({ prime, count });
                }
                factorList.sort((a, b) => BigInt(a.prime) < BigInt(b.prime) ? -1 : 1);

                const factorization = factorList
                    .map(f => f.count === 1 ? f.prime : `${f.prime}^${f.count}`)
                    .join(' × ');

                const isPrime = factorList.length === 1 && factorList[0].count === 1;

                results.push({
                    original: numbers[i],
                    factorization,
                    isPrime,
                    factorCount: factorList.length
                });

            } catch (e) {
                results.push({
                    original: numbers[i],
                    error: e.message
                });
            }
        }

        const primeCount = results.filter(r => r.isPrime).length;
        const duration = performance.now() - startTime;

        sendResult('BATCH_RESULT', {
            results,
            count: total,
            primeCount,
            duration,
            avgTime: duration / total
        });

    } catch (error) {
        sendError(`批量分解錯誤: ${error.message}`);
    }
}

// ===== 範圍分解 =====

function factorizeRange(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { start, end } = payload;
        let from = BigInt(start);
        let to = BigInt(end);

        if (from > to) {
            [from, to] = [to, from];
        }

        if (from < 1n) from = 1n;

        const range = to - from + 1n;
        if (range > 10000n) {
            sendError('範圍過大，請限制在 10000 以內');
            return;
        }

        const results = [];
        let current = from;
        let count = 0;
        const total = Number(range);

        while (current <= to) {
            if (shouldStop) {
                sendProgress(0, '計算已取消');
                return;
            }

            const percent = Math.floor((count / total) * 100);
            if (count % 100 === 0) {
                sendProgress(percent, `分解中... ${current}`);
            }

            const n = current;
            if (n === 1n) {
                results.push({
                    number: '1',
                    factorization: '1',
                    isPrime: false
                });
            } else {
                const factors = primeFactorize(n);
                const factorMap = new Map();
                for (const f of factors) {
                    const key = f.toString();
                    factorMap.set(key, (factorMap.get(key) || 0) + 1);
                }

                const factorList = [];
                for (const [prime, count] of factorMap) {
                    factorList.push({ prime, count });
                }
                factorList.sort((a, b) => BigInt(a.prime) < BigInt(b.prime) ? -1 : 1);

                const factorization = factorList
                    .map(f => f.count === 1 ? f.prime : `${f.prime}^${f.count}`)
                    .join(' × ');

                const isPrime = factorList.length === 1 && factorList[0].count === 1;

                results.push({
                    number: n.toString(),
                    factorization,
                    isPrime
                });
            }

            current++;
            count++;
        }

        const primeCount = results.filter(r => r.isPrime).length;
        const duration = performance.now() - startTime;

        sendResult('RANGE_RESULT', {
            results,
            start: from.toString(),
            end: to.toString(),
            count: total,
            primeCount,
            duration
        });

    } catch (error) {
        sendError(`範圍分解錯誤: ${error.message}`);
    }
}

// ===== 尋找因數 =====

function findDivisors(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { number } = payload;
        const n = BigInt(number);

        if (n < 1n) {
            sendError('請輸入正整數');
            return;
        }

        sendProgress(0, '尋找因數...');

        // 先分解質因數
        const factors = n === 1n ? [] : primeFactorize(n);

        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        // 整理質因數
        const factorMap = new Map();
        for (const f of factors) {
            const key = f.toString();
            factorMap.set(key, (factorMap.get(key) || 0) + 1);
        }

        const primeFactors = [];
        for (const [prime, count] of factorMap) {
            primeFactors.push({ prime: BigInt(prime), count });
        }

        // 生成所有因數
        const divisors = [];

        function generateDivisors(index, current) {
            if (index === primeFactors.length) {
                divisors.push(current);
                return;
            }

            const { prime, count } = primeFactors[index];
            let power = 1n;
            for (let i = 0; i <= count; i++) {
                generateDivisors(index + 1, current * power);
                power *= prime;
            }
        }

        generateDivisors(0, 1n);
        divisors.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

        // 限制顯示數量
        const maxDisplay = 1000;
        const displayDivisors = divisors.slice(0, maxDisplay).map(d => d.toString());

        // 計算因數和
        let sum = 0n;
        for (const d of divisors) {
            sum += d;
        }

        // 判斷完美數
        const isPerfect = sum - n === n;

        sendResult('DIVISORS_RESULT', {
            original: number,
            divisors: displayDivisors,
            count: divisors.length,
            sum: sum.toString(),
            isPerfect,
            truncated: divisors.length > maxDisplay,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`尋找因數錯誤: ${error.message}`);
    }
}

// ===== 質數檢測 =====

function checkPrime(payload) {
    shouldStop = false;
    const startTime = performance.now();

    try {
        const { number } = payload;
        const n = BigInt(number);

        if (n < 2n) {
            sendResult('PRIME_RESULT', {
                number,
                isPrime: false,
                reason: n < 1n ? '無效數字' : (n === 1n ? '1 不是質數' : '小於 2'),
                duration: performance.now() - startTime
            });
            return;
        }

        sendProgress(0, '檢測中...');

        const isPrime = millerRabinTest(n);

        let nearestPrimes = { prev: null, next: null };

        // 找前一個質數
        if (!isPrime) {
            let prev = n - 1n;
            while (prev >= 2n && !millerRabinTest(prev)) {
                prev--;
                if (n - prev > 1000n) break;
            }
            if (prev >= 2n && millerRabinTest(prev)) {
                nearestPrimes.prev = prev.toString();
            }

            // 找下一個質數
            let next = n + 1n;
            while (!millerRabinTest(next)) {
                next++;
                if (next - n > 1000n) break;
            }
            if (next - n <= 1000n) {
                nearestPrimes.next = next.toString();
            }
        }

        sendResult('PRIME_RESULT', {
            number,
            isPrime,
            nearestPrimes: isPrime ? null : nearestPrimes,
            duration: performance.now() - startTime
        });

    } catch (error) {
        sendError(`質數檢測錯誤: ${error.message}`);
    }
}

// ===== 質因數分解算法 =====

/**
 * 主分解函數 - 結合試除法和 Pollard's rho
 */
function primeFactorize(n) {
    const factors = [];

    // 處理 2 的因數
    while (n % 2n === 0n) {
        factors.push(2n);
        n /= 2n;
    }

    // 處理 3 的因數
    while (n % 3n === 0n) {
        factors.push(3n);
        n /= 3n;
    }

    // 試除法處理小因數 (6k±1 優化)
    let i = 5n;
    const trialLimit = 10000n;

    while (i * i <= n && i <= trialLimit) {
        while (n % i === 0n) {
            factors.push(i);
            n /= i;
        }
        while (n % (i + 2n) === 0n) {
            factors.push(i + 2n);
            n /= (i + 2n);
        }
        i += 6n;
    }

    // 如果剩餘數字較大，使用 Pollard's rho
    if (n > 1n) {
        if (n <= trialLimit * trialLimit) {
            // 小數直接試除
            factors.push(...trialDivision(n));
        } else {
            // 大數使用 Pollard's rho
            factors.push(...pollardRhoFactorize(n));
        }
    }

    return factors;
}

/**
 * 試除法 - 適用於較小的數
 */
function trialDivision(n) {
    const factors = [];

    // 已經處理過 2 和 3，從 5 開始
    let i = 5n;
    while (i * i <= n) {
        while (n % i === 0n) {
            factors.push(i);
            n /= i;
        }
        while (n % (i + 2n) === 0n) {
            factors.push(i + 2n);
            n /= (i + 2n);
        }
        i += 6n;
    }

    if (n > 1n) {
        factors.push(n);
    }

    return factors;
}

/**
 * Pollard's rho 分解 - 適用於大數
 */
function pollardRhoFactorize(n) {
    const factors = [];

    while (n > 1n) {
        if (millerRabinTest(n)) {
            factors.push(n);
            break;
        }

        let divisor = pollardRho(n);
        if (divisor === n) {
            // 如果 Pollard's rho 失敗，嘗試試除法
            divisor = trialDivisionFind(n);
        }

        if (divisor === n) {
            // 仍然失敗，假設是質數
            factors.push(n);
            break;
        }

        // 遞迴分解因數
        factors.push(...pollardRhoFactorize(divisor));
        n /= divisor;
    }

    return factors;
}

/**
 * Pollard's rho 算法
 */
function pollardRho(n) {
    if (n % 2n === 0n) return 2n;

    let x = 2n;
    let y = 2n;
    let d = 1n;

    // f(x) = x^2 + c mod n
    const c = 1n;

    const f = (x) => (x * x + c) % n;

    while (d === 1n) {
        x = f(x);
        y = f(f(y));
        d = gcd(abs(x - y), n);

        if (shouldStop) return n;
    }

    return d;
}

/**
 * 試除法找因數
 */
function trialDivisionFind(n) {
    let i = 5n;
    const limit = 1000000n;

    while (i * i <= n && i <= limit) {
        if (n % i === 0n) return i;
        if (n % (i + 2n) === 0n) return i + 2n;
        i += 6n;
    }

    return n;
}

/**
 * Miller-Rabin 質數測試
 */
function millerRabinTest(n) {
    if (n < 2n) return false;
    if (n === 2n || n === 3n) return true;
    if (n % 2n === 0n) return false;

    // 分解 n-1 = 2^r * d
    let r = 0n;
    let d = n - 1n;
    while (d % 2n === 0n) {
        r++;
        d /= 2n;
    }

    // 測試基數
    const witnesses = [2n, 3n, 5n, 7n, 11n, 13n, 17n, 19n, 23n, 29n, 31n, 37n];

    for (const a of witnesses) {
        if (a >= n) continue;

        let x = modPow(a, d, n);

        if (x === 1n || x === n - 1n) continue;

        let continueOuter = false;
        for (let i = 0n; i < r - 1n; i++) {
            x = (x * x) % n;
            if (x === n - 1n) {
                continueOuter = true;
                break;
            }
        }

        if (continueOuter) continue;

        return false;
    }

    return true;
}

/**
 * 模冪運算
 */
function modPow(base, exp, mod) {
    let result = 1n;
    base = base % mod;

    while (exp > 0n) {
        if (exp % 2n === 1n) {
            result = (result * base) % mod;
        }
        exp = exp / 2n;
        base = (base * base) % mod;
    }

    return result;
}

/**
 * 最大公因數
 */
function gcd(a, b) {
    a = abs(a);
    b = abs(b);
    while (b !== 0n) {
        const temp = b;
        b = a % b;
        a = temp;
    }
    return a;
}

/**
 * 絕對值
 */
function abs(n) {
    return n < 0n ? -n : n;
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
