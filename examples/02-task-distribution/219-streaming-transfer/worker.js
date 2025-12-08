/**
 * 流式傳輸 Web Worker
 *
 * 功能：使用 Streams API 進行串流數據傳遞
 * 通訊模式：postMessage + Transferable Streams
 *
 * @description
 * 此 Worker 生成數據串流並透過 ReadableStream
 * 傳輸到主執行緒，展示大數據的高效傳輸方式。
 */

// ===== 狀態變數 =====

let isStreaming = false;
let shouldCancel = false;

// ===== 訊息處理 =====

self.onmessage = async function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START_STREAM':
            await handleStartStream(payload);
            break;

        case 'CANCEL_STREAM':
            handleCancelStream();
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 串流處理 =====

/**
 * 開始串流傳輸
 */
async function handleStartStream(payload) {
    const { dataSize, chunkSize, delay } = payload;

    if (isStreaming) {
        sendError('串流傳輸已在進行中');
        return;
    }

    isStreaming = true;
    shouldCancel = false;

    const totalBytes = dataSize * 1024;
    const chunkBytes = chunkSize * 1024;
    const totalChunks = Math.ceil(totalBytes / chunkBytes);

    sendLog('info', `開始串流傳輸: ${formatBytes(totalBytes)}, ${totalChunks} 個區塊`);
    sendLog('info', `區塊大小: ${formatBytes(chunkBytes)}, 延遲: ${delay}ms`);

    const startTime = performance.now();
    let transferredBytes = 0;
    let chunkIndex = 0;

    try {
        // 創建 ReadableStream
        const stream = new ReadableStream({
            async start(controller) {
                sendLog('info', '串流已建立，開始傳輸數據...');
            },

            async pull(controller) {
                // 檢查是否取消
                if (shouldCancel) {
                    controller.close();
                    return;
                }

                // 計算本次區塊大小
                const remainingBytes = totalBytes - transferredBytes;
                const currentChunkSize = Math.min(chunkBytes, remainingBytes);

                if (currentChunkSize <= 0) {
                    controller.close();
                    return;
                }

                // 生成數據區塊
                const chunk = generateChunk(currentChunkSize, chunkIndex);

                // 模擬延遲
                if (delay > 0) {
                    await sleep(delay);
                }

                // 傳送區塊
                controller.enqueue(chunk);

                transferredBytes += currentChunkSize;
                chunkIndex++;

                // 發送進度更新
                const progress = (transferredBytes / totalBytes) * 100;
                const elapsed = performance.now() - startTime;
                const speed = transferredBytes / (elapsed / 1000);

                sendProgress({
                    transferredBytes,
                    totalBytes,
                    chunkIndex,
                    totalChunks,
                    progress,
                    speed,
                    chunkSize: currentChunkSize
                });

                // 檢查是否完成
                if (transferredBytes >= totalBytes) {
                    controller.close();
                }
            },

            cancel(reason) {
                sendLog('warning', `串流已取消: ${reason || '使用者取消'}`);
            }
        });

        // 使用 Transferable 方式傳輸串流
        // 注意：並非所有瀏覽器都支援 Transferable Streams
        // 這裡使用手動區塊傳輸作為後備方案
        await transferStreamManually(stream, totalBytes, totalChunks, startTime);

    } catch (error) {
        sendError(`串流傳輸失敗: ${error.message}`);
    } finally {
        isStreaming = false;
    }
}

/**
 * 手動傳輸串流 (用於不支援 Transferable Streams 的環境)
 */
async function transferStreamManually(stream, totalBytes, totalChunks, startTime) {
    const reader = stream.getReader();
    let chunkIndex = 0;

    try {
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            if (shouldCancel) {
                reader.cancel('使用者取消');
                sendResult('STREAM_CANCELLED', {});
                return;
            }

            // 發送區塊到主執行緒
            sendChunk(value, chunkIndex);
            chunkIndex++;
        }

        const endTime = performance.now();
        const duration = endTime - startTime;
        const speed = totalBytes / (duration / 1000);

        sendLog('success', `串流傳輸完成！總耗時: ${duration.toFixed(2)}ms`);

        sendResult('STREAM_COMPLETE', {
            totalBytes,
            totalChunks: chunkIndex,
            duration,
            speed
        });

    } catch (error) {
        sendError(`串流讀取失敗: ${error.message}`);
    } finally {
        reader.releaseLock();
    }
}

/**
 * 取消串流傳輸
 */
function handleCancelStream() {
    if (isStreaming) {
        shouldCancel = true;
        sendLog('warning', '正在取消串流傳輸...');
    }
}

// ===== 資料生成 =====

/**
 * 生成數據區塊
 * @param {number} size - 區塊大小（位元組）
 * @param {number} index - 區塊索引
 * @returns {Uint8Array} 數據區塊
 */
function generateChunk(size, index) {
    const chunk = new Uint8Array(size);

    // 填充模式數據（使用區塊索引作為種子）
    for (let i = 0; i < size; i++) {
        // 生成可預測但多樣的數據
        chunk[i] = (index * 17 + i * 13) % 256;
    }

    return chunk;
}

// ===== 工具函數 =====

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ===== 通訊函數 =====

function sendResult(type, payload) {
    self.postMessage({ type, payload });
}

function sendProgress(data) {
    self.postMessage({
        type: 'STREAM_PROGRESS',
        payload: data
    });
}

function sendChunk(data, index) {
    // 使用 Transferable 傳輸以提高效能
    const buffer = data.buffer.slice(0);
    self.postMessage({
        type: 'STREAM_CHUNK',
        payload: {
            data: buffer,
            index,
            size: data.byteLength
        }
    }, [buffer]);
}

function sendLog(level, message) {
    self.postMessage({
        type: 'LOG',
        payload: { level, message, timestamp: new Date().toISOString() }
    });
}

function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
