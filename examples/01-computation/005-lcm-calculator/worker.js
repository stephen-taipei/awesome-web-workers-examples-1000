/**
 * 最小公倍數計算器 Web Worker
 *
 * 功能：使用 GCD 輔助計算最小公倍數 (LCM)，支援批量計算
 * 通訊模式：postMessage
 *
 * @description
 * LCM 公式：LCM(a, b) = |a × b| / GCD(a, b)
 * 此方法避免了直接計算 a × b 可能造成的溢出問題
 */

// ===== 訊息處理 =====

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'CALCULATE_SINGLE':
            handleCalculateSingle(payload);
            break;

        case 'CALCULATE_MULTIPLE':
            handleCalculateMultiple(payload);
            break;

        case 'CALCULATE_BATCH':
            handleCalculateBatch(payload);
            break;

        case 'CALCULATE_GCD_LCM':
            handleCalculateGcdLcm(payload);
            break;

        case 'FIND_COMMON_MULTIPLES':
            handleFindCommonMultiples(payload);
            break;

        case 'STOP':
            shouldStop = true;
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 狀態變數 =====

let shouldStop = false;

// ===== 核心計算處理 =====

/**
 * 計算兩數的 LCM
 */
function handleCalculateSingle(payload) {
    const { a, b } = payload;
    shouldStop = false;

    let numA, numB;
    try {
        numA = BigInt(a);
        numB = BigInt(b);
    } catch (e) {
        sendError('請輸入有效的整數');
        return;
    }

    // 取絕對值
    numA = numA < 0n ? -numA : numA;
    numB = numB < 0n ? -numB : numB;

    // LCM(0, n) = LCM(n, 0) = 0
    if (numA === 0n || numB === 0n) {
        self.postMessage({
            type: 'SINGLE_RESULT',
            payload: {
                a: numA.toString(),
                b: numB.toString(),
                gcd: '0',
                lcm: '0',
                duration: 0
            }
        });
        return;
    }

    const startTime = performance.now();
    sendProgress(0, '計算 LCM 中...');

    const gcd = gcdEuclidean(numA, numB);
    // LCM = (a / gcd) * b  避免溢出
    const lcm = (numA / gcd) * numB;

    const endTime = performance.now();

    sendProgress(100, '計算完成');

    self.postMessage({
        type: 'SINGLE_RESULT',
        payload: {
            a: numA.toString(),
            b: numB.toString(),
            gcd: gcd.toString(),
            lcm: lcm.toString(),
            lcmDigits: lcm.toString().length,
            duration: endTime - startTime
        }
    });
}

/**
 * 計算多個數字的 LCM
 */
function handleCalculateMultiple(payload) {
    const { numbers } = payload;
    shouldStop = false;

    if (!Array.isArray(numbers) || numbers.length < 2) {
        sendError('請提供至少 2 個數字');
        return;
    }

    const startTime = performance.now();
    sendProgress(0, `計算 ${numbers.length} 個數字的 LCM...`);

    let nums;
    try {
        nums = numbers.map(n => {
            let num = BigInt(n);
            return num < 0n ? -num : num;
        });
    } catch (e) {
        sendError('請輸入有效的整數');
        return;
    }

    // 檢查是否有 0
    if (nums.some(n => n === 0n)) {
        self.postMessage({
            type: 'MULTIPLE_RESULT',
            payload: {
                numbers: nums.map(n => n.toString()),
                lcm: '0',
                count: nums.length,
                duration: performance.now() - startTime
            }
        });
        return;
    }

    // 依序計算 LCM
    let result = nums[0];
    const total = nums.length - 1;

    for (let i = 1; i < nums.length; i++) {
        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        result = lcmTwo(result, nums[i]);

        const progress = Math.floor((i / total) * 100);
        sendProgress(progress, `計算中... LCM(前${i + 1}個數字)`);
    }

    const endTime = performance.now();
    sendProgress(100, '計算完成');

    self.postMessage({
        type: 'MULTIPLE_RESULT',
        payload: {
            numbers: nums.map(n => n.toString()),
            lcm: result.toString(),
            lcmDigits: result.toString().length,
            count: nums.length,
            duration: endTime - startTime
        }
    });
}

/**
 * 批量計算數對的 LCM
 */
function handleCalculateBatch(payload) {
    const { pairs } = payload;
    shouldStop = false;

    if (!Array.isArray(pairs) || pairs.length === 0) {
        sendError('請提供有效的數對陣列');
        return;
    }

    if (pairs.length > 100000) {
        sendError('數對數量不能超過 100,000');
        return;
    }

    const startTime = performance.now();
    const results = [];
    const total = pairs.length;
    const progressInterval = Math.max(1, Math.floor(total / 100));

    sendProgress(0, `批量計算 ${total} 對數字的 LCM...`);

    for (let i = 0; i < pairs.length; i++) {
        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        const { a, b } = pairs[i];

        try {
            let numA = BigInt(a);
            let numB = BigInt(b);
            numA = numA < 0n ? -numA : numA;
            numB = numB < 0n ? -numB : numB;

            const gcd = gcdEuclidean(numA, numB);
            const lcm = numA === 0n || numB === 0n ? 0n : (numA / gcd) * numB;

            results.push({
                a: numA.toString(),
                b: numB.toString(),
                gcd: gcd.toString(),
                lcm: lcm.toString()
            });
        } catch (e) {
            results.push({
                a: String(a),
                b: String(b),
                gcd: 'ERROR',
                lcm: 'ERROR',
                error: '無效的數字'
            });
        }

        if (i % progressInterval === 0) {
            const progress = Math.floor((i / total) * 100);
            sendProgress(progress, `計算中... ${i + 1}/${total}`);
        }
    }

    const endTime = performance.now();
    sendProgress(100, '批量計算完成');

    self.postMessage({
        type: 'BATCH_RESULT',
        payload: {
            results: results,
            count: results.length,
            duration: endTime - startTime,
            avgTime: (endTime - startTime) / results.length
        }
    });
}

/**
 * 同時計算 GCD 和 LCM 並展示關係
 */
function handleCalculateGcdLcm(payload) {
    const { a, b } = payload;
    shouldStop = false;

    let numA, numB;
    try {
        numA = BigInt(a);
        numB = BigInt(b);
    } catch (e) {
        sendError('請輸入有效的整數');
        return;
    }

    numA = numA < 0n ? -numA : numA;
    numB = numB < 0n ? -numB : numB;

    const startTime = performance.now();
    sendProgress(0, '計算 GCD 和 LCM...');

    const gcd = gcdEuclidean(numA, numB);
    const lcm = numA === 0n || numB === 0n ? 0n : (numA / gcd) * numB;
    const product = numA * numB;

    // 驗證 GCD × LCM = a × b
    const verification = gcd * lcm === product;

    const endTime = performance.now();
    sendProgress(100, '計算完成');

    self.postMessage({
        type: 'GCD_LCM_RESULT',
        payload: {
            a: numA.toString(),
            b: numB.toString(),
            gcd: gcd.toString(),
            lcm: lcm.toString(),
            product: product.toString(),
            gcdTimesLcm: (gcd * lcm).toString(),
            verification: verification,
            duration: endTime - startTime
        }
    });
}

/**
 * 找出範圍內的公倍數
 */
function handleFindCommonMultiples(payload) {
    const { a, b, limit } = payload;
    shouldStop = false;

    let numA, numB, numLimit;
    try {
        numA = BigInt(a);
        numB = BigInt(b);
        numLimit = BigInt(limit || 1000);
    } catch (e) {
        sendError('請輸入有效的整數');
        return;
    }

    numA = numA < 0n ? -numA : numA;
    numB = numB < 0n ? -numB : numB;

    if (numA === 0n || numB === 0n) {
        sendError('數字不能為 0');
        return;
    }

    const startTime = performance.now();
    sendProgress(0, '尋找公倍數...');

    const lcm = lcmTwo(numA, numB);
    const multiples = [];

    // 找出範圍內的所有公倍數
    let current = lcm;
    while (current <= numLimit && multiples.length < 100) {
        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        multiples.push(current.toString());
        current += lcm;
    }

    const endTime = performance.now();
    sendProgress(100, '計算完成');

    self.postMessage({
        type: 'COMMON_MULTIPLES_RESULT',
        payload: {
            a: numA.toString(),
            b: numB.toString(),
            lcm: lcm.toString(),
            limit: numLimit.toString(),
            multiples: multiples,
            count: multiples.length,
            duration: endTime - startTime
        }
    });
}

// ===== 核心演算法 =====

/**
 * 歐幾里得算法計算 GCD
 */
function gcdEuclidean(a, b) {
    if (a === 0n) return b;
    if (b === 0n) return a;

    if (a < b) [a, b] = [b, a];

    while (b !== 0n) {
        const temp = b;
        b = a % b;
        a = temp;
    }

    return a;
}

/**
 * 計算兩數的 LCM
 * LCM(a, b) = (a / GCD(a, b)) * b
 */
function lcmTwo(a, b) {
    if (a === 0n || b === 0n) return 0n;
    const gcd = gcdEuclidean(a, b);
    return (a / gcd) * b;
}

// ===== 通訊函數 =====

function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}

function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
