/**
 * 質數產生器 Web Worker
 *
 * 功能：使用埃拉托斯特尼篩法 (Sieve of Eratosthenes) 計算指定範圍內的所有質數
 * 通訊模式：postMessage
 *
 * @description
 * 此 Worker 接收一個範圍參數，使用高效的篩法演算法在背景執行緒中計算質數，
 * 並定期回報進度，避免阻塞主執行緒 UI。
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
            // 開始計算質數
            handleStartCalculation(payload);
            break;

        case 'STOP':
            // 終止計算 (透過標記)
            shouldStop = true;
            break;

        default:
            // 未知訊息類型
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 狀態變數 =====

// 用於控制是否終止計算的標記
let shouldStop = false;

// ===== 核心演算法 =====

/**
 * 處理開始計算的請求
 * @param {Object} payload - 計算參數
 * @param {number} payload.start - 起始數字
 * @param {number} payload.end - 結束數字
 */
function handleStartCalculation(payload) {
    const { start, end } = payload;

    // 重置停止標記
    shouldStop = false;

    // 參數驗證
    if (!Number.isInteger(start) || !Number.isInteger(end)) {
        sendError('起始值和結束值必須是整數');
        return;
    }

    if (start < 0 || end < 0) {
        sendError('範圍值不能為負數');
        return;
    }

    if (start > end) {
        sendError('起始值不能大於結束值');
        return;
    }

    if (end > 100000000) {
        sendError('結束值不能超過 100,000,000 (為避免記憶體不足)');
        return;
    }

    // 記錄開始時間
    const startTime = performance.now();

    // 通知開始計算
    sendProgress(0, '開始計算...');

    // 執行埃拉托斯特尼篩法
    const primes = sieveOfEratosthenes(start, end);

    // 如果被中斷，不發送結果
    if (shouldStop) {
        sendProgress(0, '計算已取消');
        return;
    }

    // 計算耗時
    const endTime = performance.now();
    const duration = endTime - startTime;

    // 發送結果
    sendResult(primes, duration);
}

/**
 * 埃拉托斯特尼篩法
 *
 * 演算法說明：
 * 1. 建立一個布林陣列，索引代表數字，值代表是否為質數
 * 2. 從 2 開始，將每個質數的倍數標記為非質數
 * 3. 最後收集所有仍標記為質數的數字
 *
 * 時間複雜度：O(n log log n)
 * 空間複雜度：O(n)
 *
 * @param {number} start - 起始數字
 * @param {number} end - 結束數字
 * @returns {number[]} 質數陣列
 */
function sieveOfEratosthenes(start, end) {
    // 建立篩選陣列 (true = 可能是質數)
    // 使用 Uint8Array 減少記憶體使用
    const sieve = new Uint8Array(end + 1);
    sieve.fill(1); // 預設所有數字都可能是質數

    // 0 和 1 不是質數
    sieve[0] = 0;
    sieve[1] = 0;

    // 計算需要篩選到的上限 (只需篩選到 √end)
    const sqrtEnd = Math.floor(Math.sqrt(end));

    // 進度追蹤
    let lastProgressUpdate = 0;
    const progressInterval = Math.max(1, Math.floor(sqrtEnd / 100));

    // 篩選過程
    for (let i = 2; i <= sqrtEnd; i++) {
        // 檢查是否需要中斷
        if (shouldStop) {
            return [];
        }

        // 如果 i 是質數，標記其所有倍數為非質數
        if (sieve[i]) {
            // 從 i² 開始標記 (因為更小的倍數已被之前的質數標記過)
            for (let j = i * i; j <= end; j += i) {
                sieve[j] = 0;
            }
        }

        // 定期回報進度
        if (i - lastProgressUpdate >= progressInterval) {
            const progress = Math.floor((i / sqrtEnd) * 50); // 篩選階段佔 50%
            sendProgress(progress, `篩選中... (${i}/${sqrtEnd})`);
            lastProgressUpdate = i;
        }
    }

    // 收集質數
    sendProgress(50, '收集質數中...');

    const primes = [];
    const collectInterval = Math.max(1, Math.floor((end - start + 1) / 50));
    let collectCount = 0;

    for (let i = Math.max(2, start); i <= end; i++) {
        // 檢查是否需要中斷
        if (shouldStop) {
            return [];
        }

        if (sieve[i]) {
            primes.push(i);
        }

        // 定期回報收集進度
        collectCount++;
        if (collectCount >= collectInterval) {
            const progress = 50 + Math.floor(((i - start) / (end - start + 1)) * 50);
            sendProgress(progress, `收集質數中... (${primes.length} 個)`);
            collectCount = 0;
        }
    }

    sendProgress(100, '計算完成');

    return primes;
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
 * @param {number[]} primes - 質數陣列
 * @param {number} duration - 計算耗時 (毫秒)
 */
function sendResult(primes, duration) {
    self.postMessage({
        type: 'RESULT',
        payload: {
            primes: primes,
            count: primes.length,
            duration: duration
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
