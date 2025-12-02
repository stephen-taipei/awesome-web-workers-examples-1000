/**
 * 費波那契數列 Web Worker
 *
 * 功能：計算第 N 個費波那契數，支援多種演算法
 * 通訊模式：postMessage
 *
 * @description
 * 此 Worker 接收一個 N 值參數，使用選定的演算法計算費波那契數，
 * 並定期回報進度。支援 BigInt 以處理超大數字。
 *
 * 費波那契數列定義：
 * F(0) = 0
 * F(1) = 1
 * F(n) = F(n-1) + F(n-2), n >= 2
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
            // 開始計算費波那契數
            handleStartCalculation(payload);
            break;

        case 'CALCULATE_SEQUENCE':
            // 計算費波那契數列 (前 N 項)
            handleCalculateSequence(payload);
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
 * 處理計算單一費波那契數的請求
 * @param {Object} payload - 計算參數
 * @param {number} payload.n - 要計算的第 N 個費波那契數
 * @param {string} payload.algorithm - 演算法選擇 ('iterative', 'matrix', 'memoization')
 */
function handleStartCalculation(payload) {
    const { n, algorithm = 'iterative' } = payload;

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
    sendProgress(0, `開始計算 F(${n})...`);

    let result;

    try {
        // 根據選擇的演算法執行計算
        switch (algorithm) {
            case 'matrix':
                result = fibonacciMatrix(n);
                break;
            case 'memoization':
                result = fibonacciMemoization(n);
                break;
            case 'iterative':
            default:
                result = fibonacciIterative(n);
                break;
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

    // 發送結果
    sendResult({
        n: n,
        value: result.toString(),
        digits: result.toString().length,
        algorithm: algorithm,
        duration: duration
    });
}

/**
 * 處理計算費波那契數列的請求
 * @param {Object} payload - 計算參數
 * @param {number} payload.count - 要計算的項數
 */
function handleCalculateSequence(payload) {
    const { count } = payload;

    // 重置停止標記
    shouldStop = false;

    // 參數驗證
    if (!Number.isInteger(count) || count < 1) {
        sendError('項數必須是正整數');
        return;
    }

    if (count > 10000) {
        sendError('項數不能超過 10,000');
        return;
    }

    // 記錄開始時間
    const startTime = performance.now();

    sendProgress(0, `計算前 ${count} 項費波那契數列...`);

    const sequence = [];
    let a = 0n;
    let b = 1n;

    // 進度更新間隔
    const progressInterval = Math.max(1, Math.floor(count / 100));

    for (let i = 0; i < count; i++) {
        // 檢查是否需要中斷
        if (shouldStop) {
            sendProgress(0, '計算已取消');
            return;
        }

        sequence.push(a.toString());

        // 計算下一個數
        const temp = a + b;
        a = b;
        b = temp;

        // 定期回報進度
        if (i % progressInterval === 0) {
            const progress = Math.floor((i / count) * 100);
            sendProgress(progress, `計算中... (${i + 1}/${count})`);
        }
    }

    // 計算耗時
    const endTime = performance.now();
    const duration = endTime - startTime;

    sendProgress(100, '計算完成');

    // 發送數列結果
    self.postMessage({
        type: 'SEQUENCE_RESULT',
        payload: {
            sequence: sequence,
            count: count,
            duration: duration
        }
    });
}

// ===== 費波那契演算法 =====

/**
 * 迭代法計算費波那契數
 *
 * 演算法說明：
 * 使用兩個變數迭代計算，避免遞迴的堆疊溢出問題
 *
 * 時間複雜度：O(n)
 * 空間複雜度：O(1)
 *
 * @param {number} n - 要計算的第 N 個費波那契數
 * @returns {bigint} 第 N 個費波那契數
 */
function fibonacciIterative(n) {
    if (n === 0) return 0n;
    if (n === 1) return 1n;

    let a = 0n;
    let b = 1n;

    // 進度更新間隔
    const progressInterval = Math.max(1, Math.floor(n / 100));

    for (let i = 2; i <= n; i++) {
        // 檢查是否需要中斷
        if (shouldStop) {
            return 0n;
        }

        const temp = a + b;
        a = b;
        b = temp;

        // 定期回報進度
        if (i % progressInterval === 0) {
            const progress = Math.floor((i / n) * 100);
            sendProgress(progress, `迭代計算中... (${i}/${n})`);
        }
    }

    return b;
}

/**
 * 矩陣快速冪法計算費波那契數
 *
 * 演算法說明：
 * 利用矩陣乘法的特性：
 * [F(n+1), F(n)  ]   [1, 1]^n   [1]
 * [F(n),   F(n-1)] = [1, 0]   × [0]
 *
 * 使用快速冪可將時間複雜度降至 O(log n)
 *
 * 時間複雜度：O(log n)
 * 空間複雜度：O(log n)
 *
 * @param {number} n - 要計算的第 N 個費波那契數
 * @returns {bigint} 第 N 個費波那契數
 */
function fibonacciMatrix(n) {
    if (n === 0) return 0n;
    if (n === 1) return 1n;

    sendProgress(10, '使用矩陣快速冪計算...');

    /**
     * 2x2 矩陣乘法
     * @param {bigint[][]} a - 矩陣 A
     * @param {bigint[][]} b - 矩陣 B
     * @returns {bigint[][]} 矩陣乘積
     */
    function multiplyMatrix(a, b) {
        return [
            [
                a[0][0] * b[0][0] + a[0][1] * b[1][0],
                a[0][0] * b[0][1] + a[0][1] * b[1][1]
            ],
            [
                a[1][0] * b[0][0] + a[1][1] * b[1][0],
                a[1][0] * b[0][1] + a[1][1] * b[1][1]
            ]
        ];
    }

    /**
     * 矩陣快速冪
     * @param {bigint[][]} matrix - 基底矩陣
     * @param {number} power - 指數
     * @returns {bigint[][]} 矩陣的 power 次方
     */
    function matrixPower(matrix, power) {
        // 單位矩陣
        let result = [
            [1n, 0n],
            [0n, 1n]
        ];

        let base = matrix;

        // 計算總迭代次數 (用於進度回報)
        const totalIterations = Math.floor(Math.log2(power)) + 1;
        let currentIteration = 0;

        while (power > 0) {
            if (shouldStop) {
                return result;
            }

            if (power % 2 === 1) {
                result = multiplyMatrix(result, base);
            }
            base = multiplyMatrix(base, base);
            power = Math.floor(power / 2);

            // 回報進度
            currentIteration++;
            const progress = 10 + Math.floor((currentIteration / totalIterations) * 80);
            sendProgress(progress, `矩陣冪運算中... (${currentIteration}/${totalIterations})`);
        }

        return result;
    }

    // 基底矩陣 [[1,1],[1,0]]
    const baseMatrix = [
        [1n, 1n],
        [1n, 0n]
    ];

    const resultMatrix = matrixPower(baseMatrix, n - 1);

    sendProgress(100, '計算完成');

    return resultMatrix[0][0];
}

/**
 * 記憶化遞迴法計算費波那契數
 *
 * 演算法說明：
 * 使用 Map 儲存已計算過的值，避免重複計算
 * 注意：此方法在 n 很大時可能會有堆疊溢出的風險
 *
 * 時間複雜度：O(n)
 * 空間複雜度：O(n)
 *
 * @param {number} n - 要計算的第 N 個費波那契數
 * @returns {bigint} 第 N 個費波那契數
 */
function fibonacciMemoization(n) {
    // 使用 Map 作為快取
    const memo = new Map();
    memo.set(0, 0n);
    memo.set(1, 1n);

    // 為避免堆疊溢出，使用迭代式記憶化
    sendProgress(10, '使用記憶化方法計算...');

    const progressInterval = Math.max(1, Math.floor(n / 100));

    for (let i = 2; i <= n; i++) {
        if (shouldStop) {
            return 0n;
        }

        memo.set(i, memo.get(i - 1) + memo.get(i - 2));

        // 回報進度
        if (i % progressInterval === 0) {
            const progress = 10 + Math.floor((i / n) * 85);
            sendProgress(progress, `記憶化計算中... (${i}/${n})`);
        }

        // 清理不需要的快取以節省記憶體
        if (i > 2) {
            memo.delete(i - 2);
        }
    }

    sendProgress(100, '計算完成');

    return memo.get(n);
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
