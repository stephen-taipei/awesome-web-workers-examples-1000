/**
 * 階乘計算器 Web Worker
 *
 * 功能：計算大數階乘 N!，支援多種計算模式
 * 通訊模式：postMessage
 *
 * @description
 * 此 Worker 接收一個 N 值參數，計算 N! (N 階乘)，
 * 使用 BigInt 處理超大數字，並支援批次計算與進度回報。
 *
 * 階乘定義：
 * 0! = 1
 * N! = N × (N-1) × (N-2) × ... × 2 × 1
 */

// ===== 訊息處理 =====

/**
 * 監聽主執行緒傳來的訊息
 * 訊息格式：{ type: string, payload: any }
 */
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            // 計算單一階乘
            handleCalculateFactorial(payload);
            break;

        case 'CALCULATE_RANGE':
            // 計算範圍內的所有階乘
            handleCalculateRange(payload);
            break;

        case 'CALCULATE_DOUBLE':
            // 計算雙階乘
            handleCalculateDoubleFactorial(payload);
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

// 階乘快取 (記憶化)
const factorialCache = new Map();

// ===== 核心計算處理 =====

/**
 * 處理計算單一階乘的請求
 * @param {Object} payload - 計算參數
 * @param {number} payload.n - 要計算的 N!
 * @param {boolean} payload.useCache - 是否使用快取
 */
function handleCalculateFactorial(payload) {
    const { n, useCache = true } = payload;

    // 重置停止標記
    shouldStop = false;

    // 參數驗證
    if (!Number.isInteger(n) || n < 0) {
        sendError('N 必須是非負整數');
        return;
    }

    if (n > 100000) {
        sendError('N 不能超過 100,000 (避免計算時間過長)');
        return;
    }

    // 記錄開始時間
    const startTime = performance.now();

    // 通知開始計算
    sendProgress(0, `開始計算 ${n}!...`);

    let result;

    try {
        if (useCache) {
            result = factorialWithCache(n);
        } else {
            result = factorialIterative(n);
        }
    } catch (error) {
        sendError(`計算錯誤: ${error.message}`);
        return;
    }

    // 如果被中斷，不發送結果
    if (shouldStop) {
        sendProgress(0, '計算已取消');
        return;
    }

    // 計算耗時
    const endTime = performance.now();
    const duration = endTime - startTime;

    // 計算結果的統計資訊
    const resultStr = result.toString();
    const trailingZeros = countTrailingZeros(n);

    // 發送結果
    sendResult({
        n: n,
        value: resultStr,
        digits: resultStr.length,
        trailingZeros: trailingZeros,
        duration: duration,
        cached: useCache
    });
}

/**
 * 處理計算範圍階乘的請求
 * @param {Object} payload - 計算參數
 * @param {number} payload.start - 起始數字
 * @param {number} payload.end - 結束數字
 */
function handleCalculateRange(payload) {
    const { start, end } = payload;

    // 重置停止標記
    shouldStop = false;

    // 參數驗證
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
        sendError('起始值和結束值必須是整數');
        return;
    }

    if (start < 0 || end < 0) {
        sendError('數值不能為負數');
        return;
    }

    if (start > end) {
        sendError('起始值不能大於結束值');
        return;
    }

    if (end > 1000) {
        sendError('範圍結束值不能超過 1,000 (避免結果過大)');
        return;
    }

    // 記錄開始時間
    const startTime = performance.now();

    sendProgress(0, `計算 ${start}! 到 ${end}!...`);

    const results = [];
    const total = end - start + 1;

    // 使用累積計算優化
    let current = 1n;

    // 先計算到 start
    for (let i = 1; i <= start; i++) {
        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }
        current *= BigInt(i);
    }

    // 記錄 start!
    results.push({
        n: start,
        value: current.toString(),
        digits: current.toString().length
    });

    // 繼續計算到 end
    for (let i = start + 1; i <= end; i++) {
        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        current *= BigInt(i);

        results.push({
            n: i,
            value: current.toString(),
            digits: current.toString().length
        });

        // 回報進度
        const progress = Math.floor(((i - start) / total) * 100);
        if (progress % 5 === 0) {
            sendProgress(progress, `計算中... ${i}!`);
        }
    }

    // 計算耗時
    const endTime = performance.now();
    const duration = endTime - startTime;

    sendProgress(100, '計算完成');

    // 發送範圍結果
    self.postMessage({
        type: 'RANGE_RESULT',
        payload: {
            results: results,
            count: results.length,
            duration: duration
        }
    });
}

/**
 * 處理計算雙階乘的請求
 * 雙階乘定義：n!! = n × (n-2) × (n-4) × ... × (2 或 1)
 * @param {Object} payload - 計算參數
 * @param {number} payload.n - 要計算的 N!!
 */
function handleCalculateDoubleFactorial(payload) {
    const { n } = payload;

    // 重置停止標記
    shouldStop = false;

    // 參數驗證
    if (!Number.isInteger(n) || n < 0) {
        sendError('N 必須是非負整數');
        return;
    }

    if (n > 50000) {
        sendError('N 不能超過 50,000');
        return;
    }

    // 記錄開始時間
    const startTime = performance.now();

    sendProgress(0, `開始計算 ${n}!!...`);

    let result = 1n;
    const progressInterval = Math.max(1, Math.floor(n / 100));

    for (let i = n; i > 0; i -= 2) {
        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        result *= BigInt(i);

        // 回報進度
        if ((n - i) % progressInterval === 0) {
            const progress = Math.floor(((n - i) / n) * 100);
            sendProgress(progress, `計算 ${n}!! 中...`);
        }
    }

    // 計算耗時
    const endTime = performance.now();
    const duration = endTime - startTime;

    const resultStr = result.toString();

    sendProgress(100, '計算完成');

    // 發送結果
    self.postMessage({
        type: 'DOUBLE_FACTORIAL_RESULT',
        payload: {
            n: n,
            value: resultStr,
            digits: resultStr.length,
            duration: duration
        }
    });
}

// ===== 階乘演算法 =====

/**
 * 迭代法計算階乘
 *
 * 時間複雜度：O(n)
 * 空間複雜度：O(1)
 *
 * @param {number} n - 要計算的 N!
 * @returns {bigint} N!
 */
function factorialIterative(n) {
    if (n === 0 || n === 1) return 1n;

    let result = 1n;
    const progressInterval = Math.max(1, Math.floor(n / 100));

    for (let i = 2; i <= n; i++) {
        if (shouldStop) {
            return 0n;
        }

        result *= BigInt(i);

        // 回報進度
        if (i % progressInterval === 0) {
            const progress = Math.floor((i / n) * 100);
            sendProgress(progress, `計算中... ${i}/${n}`);
        }
    }

    return result;
}

/**
 * 帶快取的階乘計算
 *
 * 使用記憶化技術，儲存中間結果以加速後續計算
 *
 * @param {number} n - 要計算的 N!
 * @returns {bigint} N!
 */
function factorialWithCache(n) {
    // 檢查快取
    if (factorialCache.has(n)) {
        sendProgress(100, '從快取取得結果');
        return factorialCache.get(n);
    }

    // 找到最接近的已快取值
    let startN = 0;
    let startValue = 1n;

    for (let i = n - 1; i >= 0; i--) {
        if (factorialCache.has(i)) {
            startN = i;
            startValue = factorialCache.get(i);
            break;
        }
    }

    // 從已快取值開始計算
    let result = startValue;
    const progressInterval = Math.max(1, Math.floor((n - startN) / 100));

    for (let i = startN + 1; i <= n; i++) {
        if (shouldStop) {
            return 0n;
        }

        result *= BigInt(i);

        // 每隔一段距離存入快取
        if (i % 100 === 0 || i === n) {
            factorialCache.set(i, result);
        }

        // 回報進度
        if ((i - startN) % progressInterval === 0) {
            const progress = Math.floor(((i - startN) / (n - startN)) * 100);
            sendProgress(progress, `計算中... ${i}/${n}`);
        }
    }

    return result;
}

/**
 * 計算 N! 末尾零的個數
 *
 * 末尾零由因子 10 產生，而 10 = 2 × 5
 * 由於 2 的因子總是比 5 多，所以只需計算 5 的因子數
 *
 * 公式：⌊N/5⌋ + ⌊N/25⌋ + ⌊N/125⌋ + ...
 *
 * @param {number} n - 數字 N
 * @returns {number} 末尾零的個數
 */
function countTrailingZeros(n) {
    let count = 0;
    let powerOf5 = 5;

    while (powerOf5 <= n) {
        count += Math.floor(n / powerOf5);
        powerOf5 *= 5;
    }

    return count;
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
 * 發送計算結果
 * @param {Object} result - 結果物件
 */
function sendResult(result) {
    self.postMessage({
        type: 'RESULT',
        payload: result
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
