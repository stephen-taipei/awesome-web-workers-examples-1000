/**
 * 批量濾鏡 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理圖片上傳與濾鏡鏈操作
 * 通訊模式：postMessage with Transferable Objects
 *
 * @description
 * 此腳本負責：
 * 1. 建立與管理 Web Worker
 * 2. 處理圖片上傳與顯示
 * 3. 管理濾鏡鏈選擇
 * 4. 傳送處理請求給 Worker
 * 5. 接收並顯示處理結果
 */

// ===== 全域變數 =====

// Web Worker 實例
let worker = null;

// 原始圖片數據
let originalImageData = null;

// 濾鏡鏈
let filterChain = [];

// ===== DOM 元素參考 =====

const elements = {
    // 上傳區域
    uploadArea: null,
    fileInput: null,
    loadDemoBtn: null,

    // 濾鏡選擇
    filterBtns: null,
    filterChainContainer: null,
    clearChainBtn: null,

    // 按鈕
    applyBtn: null,
    resetBtn: null,
    downloadBtn: null,

    // 進度顯示
    progressBar: null,
    progressText: null,

    // 預覽區域
    previewSection: null,
    originalCanvas: null,
    resultCanvas: null,
    resultStats: null
};

// ===== 初始化 =====

/**
 * 頁面載入完成後初始化應用程式
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
});

/**
 * 初始化 DOM 元素參考
 */
function initializeElements() {
    elements.uploadArea = document.getElementById('upload-area');
    elements.fileInput = document.getElementById('file-input');
    elements.loadDemoBtn = document.getElementById('load-demo-btn');
    elements.filterBtns = document.querySelectorAll('.filter-btn');
    elements.filterChainContainer = document.getElementById('filter-chain');
    elements.clearChainBtn = document.getElementById('clear-chain-btn');
    elements.applyBtn = document.getElementById('apply-btn');
    elements.resetBtn = document.getElementById('reset-btn');
    elements.downloadBtn = document.getElementById('download-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.previewSection = document.getElementById('preview-section');
    elements.originalCanvas = document.getElementById('original-canvas');
    elements.resultCanvas = document.getElementById('result-canvas');
    elements.resultStats = document.getElementById('result-stats');
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
    // 上傳區域點擊
    elements.uploadArea.addEventListener('click', () => {
        elements.fileInput.click();
    });

    // 檔案選擇
    elements.fileInput.addEventListener('change', handleFileSelect);

    // 拖放上傳
    elements.uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.uploadArea.classList.add('dragover');
    });

    elements.uploadArea.addEventListener('dragleave', () => {
        elements.uploadArea.classList.remove('dragover');
    });

    elements.uploadArea.addEventListener('drop', handleFileDrop);

    // 載入範例圖片
    elements.loadDemoBtn.addEventListener('click', loadDemoImage);

    // 濾鏡按鈕
    elements.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            addFilterToChain(btn.dataset.filter);
        });
    });

    // 清除濾鏡鏈
    elements.clearChainBtn.addEventListener('click', clearFilterChain);

    // 套用濾鏡
    elements.applyBtn.addEventListener('click', applyFilters);

    // 還原原圖
    elements.resetBtn.addEventListener('click', resetToOriginal);

    // 下載結果
    elements.downloadBtn.addEventListener('click', downloadResult);
}

/**
 * 初始化 Web Worker
 */
function initializeWorker() {
    if (typeof Worker === 'undefined') {
        alert('您的瀏覽器不支援 Web Workers');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

// ===== 檔案處理 =====

/**
 * 處理檔案選擇
 * @param {Event} event - 事件物件
 */
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        loadImage(file);
    }
}

/**
 * 處理拖放上傳
 * @param {DragEvent} event - 拖放事件
 */
function handleFileDrop(event) {
    event.preventDefault();
    elements.uploadArea.classList.remove('dragover');

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        loadImage(file);
    }
}

/**
 * 載入圖片
 * @param {File} file - 圖片檔案
 */
function loadImage(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            displayImage(img);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

/**
 * 載入範例圖片
 */
function loadDemoImage() {
    // 建立一個漸層範例圖片
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    // 繪製彩色漸層
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#ff6b6b');
    gradient.addColorStop(0.25, '#feca57');
    gradient.addColorStop(0.5, '#48dbfb');
    gradient.addColorStop(0.75, '#ff9ff3');
    gradient.addColorStop(1, '#54a0ff');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 添加一些幾何圖形
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(100, 100, 60, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(250, 50, 100, 100);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(200, 250);
    ctx.lineTo(280, 250);
    ctx.lineTo(240, 180);
    ctx.closePath();
    ctx.fill();

    const img = new Image();
    img.onload = function() {
        displayImage(img);
    };
    img.src = canvas.toDataURL();
}

/**
 * 顯示圖片到 Canvas
 * @param {HTMLImageElement} img - 圖片元素
 */
function displayImage(img) {
    const maxWidth = 500;
    const maxHeight = 400;

    let width = img.width;
    let height = img.height;

    // 縮放以適應預覽區域
    if (width > maxWidth) {
        height = height * (maxWidth / width);
        width = maxWidth;
    }
    if (height > maxHeight) {
        width = width * (maxHeight / height);
        height = maxHeight;
    }

    // 設定 Canvas 尺寸
    elements.originalCanvas.width = width;
    elements.originalCanvas.height = height;
    elements.resultCanvas.width = width;
    elements.resultCanvas.height = height;

    // 繪製原圖
    const ctx = elements.originalCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    // 儲存原始數據
    originalImageData = ctx.getImageData(0, 0, width, height);

    // 複製到結果 Canvas
    elements.resultCanvas.getContext('2d').drawImage(elements.originalCanvas, 0, 0);

    // 顯示預覽區域
    elements.previewSection.style.display = 'block';

    // 啟用按鈕
    updateButtonStates();
}

// ===== 濾鏡鏈管理 =====

/**
 * 添加濾鏡到鏈
 * @param {string} filter - 濾鏡名稱
 */
function addFilterToChain(filter) {
    filterChain.push(filter);
    updateFilterChainDisplay();
    updateButtonStates();
}

/**
 * 從鏈中移除濾鏡
 * @param {number} index - 濾鏡索引
 */
function removeFilterFromChain(index) {
    filterChain.splice(index, 1);
    updateFilterChainDisplay();
    updateButtonStates();
}

/**
 * 清除濾鏡鏈
 */
function clearFilterChain() {
    filterChain = [];
    updateFilterChainDisplay();
    updateButtonStates();
}

/**
 * 更新濾鏡鏈顯示
 */
function updateFilterChainDisplay() {
    if (filterChain.length === 0) {
        elements.filterChainContainer.innerHTML = '<p class="empty-hint">點擊左側濾鏡加入處理鏈</p>';
        return;
    }

    const filterNames = {
        'grayscale': '灰階',
        'invert': '反色',
        'brightness': '亮度+20%',
        'brightness-down': '亮度-20%',
        'contrast': '對比度+20%',
        'saturate': '飽和度+50%',
        'sepia': '懷舊',
        'warm': '暖色調',
        'cool': '冷色調',
        'threshold': '二值化',
        'posterize': '色調分離',
        'gamma': 'Gamma校正'
    };

    elements.filterChainContainer.innerHTML = filterChain.map((filter, index) => `
        <div class="chain-item">
            <span class="chain-number">${index + 1}</span>
            <span class="chain-name">${filterNames[filter] || filter}</span>
            <button class="chain-remove" data-index="${index}">&times;</button>
        </div>
    `).join('');

    // 綁定移除按鈕事件
    elements.filterChainContainer.querySelectorAll('.chain-remove').forEach(btn => {
        btn.addEventListener('click', () => {
            removeFilterFromChain(parseInt(btn.dataset.index));
        });
    });
}

/**
 * 更新按鈕狀態
 */
function updateButtonStates() {
    const hasImage = originalImageData !== null;
    const hasFilters = filterChain.length > 0;

    elements.applyBtn.disabled = !hasImage || !hasFilters;
    elements.resetBtn.disabled = !hasImage;
    elements.downloadBtn.disabled = !hasImage;
}

// ===== 濾鏡處理 =====

/**
 * 套用濾鏡鏈
 */
function applyFilters() {
    if (!originalImageData || filterChain.length === 0) return;

    elements.applyBtn.disabled = true;
    updateProgress(0, '準備處理...');

    // 複製原始數據
    const imageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
    );

    // 發送到 Worker
    worker.postMessage({
        type: 'APPLY_FILTERS',
        payload: {
            imageData: imageData,
            filters: filterChain
        }
    }, [imageData.data.buffer]);
}

/**
 * 還原原圖
 */
function resetToOriginal() {
    if (!originalImageData) return;

    const ctx = elements.resultCanvas.getContext('2d');
    ctx.putImageData(originalImageData, 0, 0);

    elements.resultStats.innerHTML = '';
    updateProgress(0, '已還原原圖');
}

/**
 * 下載結果
 */
function downloadResult() {
    const link = document.createElement('a');
    link.download = 'filtered-image.png';
    link.href = elements.resultCanvas.toDataURL('image/png');
    link.click();
}

// ===== Worker 通訊 =====

/**
 * 處理來自 Worker 的訊息
 * @param {MessageEvent} event - 訊息事件
 */
function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            updateProgress(payload.percent, payload.message);
            break;

        case 'RESULT':
            displayResult(payload);
            elements.applyBtn.disabled = false;
            break;

        case 'ERROR':
            alert(payload.message);
            elements.applyBtn.disabled = false;
            break;
    }
}

/**
 * 處理 Worker 錯誤
 * @param {ErrorEvent} error - 錯誤事件
 */
function handleWorkerError(error) {
    console.error('Worker 錯誤:', error);
    alert(`Worker 錯誤: ${error.message}`);
    elements.applyBtn.disabled = false;

    // 重新初始化 Worker
    if (worker) {
        worker.terminate();
    }
    initializeWorker();
}

// ===== UI 更新 =====

/**
 * 更新進度顯示
 * @param {number} percent - 進度百分比
 * @param {string} message - 進度訊息
 */
function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

/**
 * 顯示處理結果
 * @param {Object} result - 結果物件
 */
function displayResult(result) {
    // 繪製結果
    const ctx = elements.resultCanvas.getContext('2d');
    ctx.putImageData(result.imageData, 0, 0);

    // 顯示統計資訊
    const filterNames = {
        'grayscale': '灰階',
        'invert': '反色',
        'brightness': '亮度+20%',
        'brightness-down': '亮度-20%',
        'contrast': '對比度+20%',
        'saturate': '飽和度+50%',
        'sepia': '懷舊',
        'warm': '暖色調',
        'cool': '冷色調',
        'threshold': '二值化',
        'posterize': '色調分離',
        'gamma': 'Gamma校正'
    };

    const filterList = result.filters.map(f => filterNames[f] || f).join(' → ');

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">處理時間：</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">濾鏡數量：</span>
            <span class="stat-value">${result.filters.length} 個</span>
        </div>
        <div class="stat-item full-width">
            <span class="stat-label">濾鏡鏈：</span>
            <span class="stat-value">${filterList}</span>
        </div>
    `;
}
