/**
 * 最大公因數計算器 Web Worker
 *
 * 功能：使用歐幾里得算法計算最大公因數 (GCD)，支援批量計算
 * 通訊模式：postMessage
 *
 * @description
 * 此 Worker 實作多種 GCD 計算功能：
 * 1. 單對數字的 GCD
 * 2. 批量數對的 GCD
 * 3. 多個數字的 GCD
 * 4. 顯示計算步驟 (輾轉相除過程)
 *
 * GCD 定義：
 * GCD(a, b) 是能同時整除 a 和 b 的最大正整數
 */

// ===== 訊息處理 =====

/**
 * 監聽主執行緒傳來的訊息
 * 訊息格式：{ type: string, payload: any }
 */
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'CALCULATE_SINGLE':
            // 計算單對 GCD
            handleCalculateSingle(payload);
            break;

        case 'CALCULATE_BATCH':
            // 批量計算 GCD
            handleCalculateBatch(payload);
            break;

        case 'CALCULATE_MULTIPLE':
            // 計算多個數字的 GCD
            handleCalculateMultiple(payload);
            break;

        case 'CALCULATE_WITH_STEPS':
            // 計算並顯示步驟
            handleCalculateWithSteps(payload);
            break;

        case 'GENERATE_RANDOM':
            // 生成隨機數對並計算
            handleGenerateRandom(payload);
            break;

        case 'STOP':
            // 終止計算
            shouldStop = true;
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 狀態變數 =====

// 用於控制是否終止計算的標記
let shouldStop = false;

// ===== 核心計算處理 =====

/**
 * 處理計算單對 GCD 的請求
 * @param {Object} payload - 計算參數
 * @param {number|string} payload.a - 第一個數字
 * @param {number|string} payload.b - 第二個數字
 */
function handleCalculateSingle(payload) {
    const { a, b } = payload;

    shouldStop = false;

    // 轉換為 BigInt 支援大數
    let numA, numB;
    try {
        numA = BigInt(a);
        numB = BigInt(b);
    } catch (e) {
        sendError('請輸入有效的整數');
        return;
    }

    // 確保為正數
    numA = numA < 0n ? -numA : numA;
    numB = numB < 0n ? -numB : numB;

    const startTime = performance.now();

    sendProgress(0, '計算 GCD 中...');

    const result = gcdEuclidean(numA, numB);

    const endTime = performance.now();
    const duration = endTime - startTime;

    sendProgress(100, '計算完成');

    // 發送結果
    self.postMessage({
        type: 'SINGLE_RESULT',
        payload: {
            a: numA.toString(),
            b: numB.toString(),
            gcd: result.toString(),
            duration: duration
        }
    });
}

/**
 * 處理批量計算 GCD 的請求
 * @param {Object} payload - 計算參數
 * @param {Array} payload.pairs - 數對陣列 [{a, b}, ...]
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

    sendProgress(0, `批量計算 ${total} 對數字的 GCD...`);

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

            results.push({
                a: numA.toString(),
                b: numB.toString(),
                gcd: gcd.toString()
            });
        } catch (e) {
            results.push({
                a: String(a),
                b: String(b),
                gcd: 'ERROR',
                error: '無效的數字'
            });
        }

        // 回報進度
        if (i % progressInterval === 0) {
            const progress = Math.floor((i / total) * 100);
            sendProgress(progress, `計算中... ${i + 1}/${total}`);
        }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    sendProgress(100, '批量計算完成');

    // 發送結果
    self.postMessage({
        type: 'BATCH_RESULT',
        payload: {
            results: results,
            count: results.length,
            duration: duration,
            avgTime: duration / results.length
        }
    });
}

/**
 * 處理計算多個數字 GCD 的請求
 * @param {Object} payload - 計算參數
 * @param {Array} payload.numbers - 數字陣列
 */
function handleCalculateMultiple(payload) {
    const { numbers } = payload;

    shouldStop = false;

    if (!Array.isArray(numbers) || numbers.length < 2) {
        sendError('請提供至少 2 個數字');
        return;
    }

    const startTime = performance.now();

    sendProgress(0, `計算 ${numbers.length} 個數字的 GCD...`);

    // 轉換所有數字為 BigInt
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

    // 依序計算 GCD
    let result = nums[0];
    const total = nums.length - 1;

    for (let i = 1; i < nums.length; i++) {
        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        result = gcdEuclidean(result, nums[i]);

        // 如果 GCD 已經是 1，可以提前結束
        if (result === 1n) {
            break;
        }

        const progress = Math.floor((i / total) * 100);
        sendProgress(progress, `計算中... GCD(前${i + 1}個數字) = ${result}`);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    sendProgress(100, '計算完成');

    // 發送結果
    self.postMessage({
        type: 'MULTIPLE_RESULT',
        payload: {
            numbers: nums.map(n => n.toString()),
            gcd: result.toString(),
            count: nums.length,
            duration: duration
        }
    });
}

/**
 * 處理計算並顯示步驟的請求
 * @param {Object} payload - 計算參數
 * @param {number|string} payload.a - 第一個數字
 * @param {number|string} payload.b - 第二個數字
 */
function handleCalculateWithSteps(payload) {
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

    // 確保 a >= b
    if (numA < numB) {
        [numA, numB] = [numB, numA];
    }

    const startTime = performance.now();
    const steps = [];

    sendProgress(0, '計算並記錄步驟...');

    let currentA = numA;
    let currentB = numB;
    let stepCount = 0;

    while (currentB !== 0n) {
        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        const quotient = currentA / currentB;
        const remainder = currentA % currentB;

        steps.push({
            step: stepCount + 1,
            a: currentA.toString(),
            b: currentB.toString(),
            quotient: quotient.toString(),
            remainder: remainder.toString(),
            equation: `${currentA} = ${currentB} × ${quotient} + ${remainder}`
        });

        currentA = currentB;
        currentB = remainder;
        stepCount++;

        const progress = Math.min(90, stepCount * 10);
        sendProgress(progress, `步驟 ${stepCount}...`);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    sendProgress(100, '計算完成');

    // 發送結果
    self.postMessage({
        type: 'STEPS_RESULT',
        payload: {
            a: numA.toString(),
            b: numB.toString(),
            gcd: currentA.toString(),
            steps: steps,
            stepCount: stepCount,
            duration: duration
        }
    });
}

/**
 * 處理生成隨機數對並計算的請求
 * @param {Object} payload - 計算參數
 * @param {number} payload.count - 生成數量
 * @param {number} payload.maxValue - 最大值
 */
function handleGenerateRandom(payload) {
    const { count, maxValue } = payload;

    shouldStop = false;

    if (count < 1 || count > 100000) {
        sendError('數量必須在 1 到 100,000 之間');
        return;
    }

    if (maxValue < 1 || maxValue > 1e15) {
        sendError('最大值必須在 1 到 10^15 之間');
        return;
    }

    const startTime = performance.now();
    const results = [];
    const progressInterval = Math.max(1, Math.floor(count / 100));

    sendProgress(0, `生成並計算 ${count} 對隨機數字...`);

    for (let i = 0; i < count; i++) {
        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        const a = BigInt(Math.floor(Math.random() * maxValue) + 1);
        const b = BigInt(Math.floor(Math.random() * maxValue) + 1);
        const gcd = gcdEuclidean(a, b);

        results.push({
            a: a.toString(),
            b: b.toString(),
            gcd: gcd.toString()
        });

        if (i % progressInterval === 0) {
            const progress = Math.floor((i / count) * 100);
            sendProgress(progress, `生成中... ${i + 1}/${count}`);
        }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    // 計算統計資訊
    const gcdValues = results.map(r => BigInt(r.gcd));
    const gcdOne = gcdValues.filter(g => g === 1n).length;
    const coprimeProbability = (gcdOne / count * 100).toFixed(2);

    sendProgress(100, '計算完成');

    // 發送結果
    self.postMessage({
        type: 'RANDOM_RESULT',
        payload: {
            results: results.slice(0, 1000), // 只返回前 1000 個結果
            totalCount: count,
            duration: duration,
            avgTime: duration / count,
            statistics: {
                coprimeCount: gcdOne,
                coprimeProbability: coprimeProbability,
                theoreticalProbability: '60.79' // 6/π² ≈ 60.79%
            }
        }
    });
}

// ===== GCD 演算法 =====

/**
 * 歐幾里得算法 (輾轉相除法)
 *
 * 原理：GCD(a, b) = GCD(b, a mod b)
 * 當 b = 0 時，GCD = a
 *
 * 時間複雜度：O(log(min(a, b)))
 * 空間複雜度：O(1)
 *
 * @param {bigint} a - 第一個數字
 * @param {bigint} b - 第二個數字
 * @returns {bigint} 最大公因數
 */
function gcdEuclidean(a, b) {
    // 處理特殊情況
    if (a === 0n) return b;
    if (b === 0n) return a;

    // 確保 a >= b
    if (a < b) {
        [a, b] = [b, a];
    }

    // 輾轉相除
    while (b !== 0n) {
        const temp = b;
        b = a % b;
        a = temp;
    }

    return a;
}

/**
 * 二進位 GCD 算法 (Stein's Algorithm)
 *
 * 優點：只使用移位和減法，避免除法運算
 * 在某些架構上可能更快
 *
 * @param {bigint} a - 第一個數字
 * @param {bigint} b - 第二個數字
 * @returns {bigint} 最大公因數
 */
function gcdBinary(a, b) {
    if (a === 0n) return b;
    if (b === 0n) return a;

    // 計算共同的 2 因子
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

// ===== 通訊函數 =====

/**
 * 發送進度更新
 * @param {number} percent - 進度百分比 (0-100)
 * @param {string} message - 進度訊息
 */
function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: {
            percent: percent,
            message: message
        }
    });
}

/**
 * 發送錯誤訊息
 * @param {string} message - 錯誤訊息
 */
function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: {
            message: message
        }
    });
}
