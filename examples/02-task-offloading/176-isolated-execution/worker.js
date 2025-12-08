/**
 * Worker 隔離執行 - Worker 腳本
 */

// 自定義 console，將輸出傳回主執行緒
const customConsole = {
    log: (...args) => {
        const content = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        self.postMessage({ type: 'log', content });
    },
    error: (...args) => {
        const content = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        self.postMessage({ type: 'error', content });
    },
    warn: (...args) => {
        const content = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        self.postMessage({ type: 'warn', content });
    }
};

// 執行沙箱程式碼
function executeSandbox(code, whitelist) {
    const start = performance.now();

    try {
        // 建立白名單代理 (Proxy)
        // 這裡我們嘗試建立一個受限的 global 對象
        // 注意：這只是一個基本的隔離示範，並非絕對安全
        // 真正的安全隔離需要更複雜的機制 (如 Iframe sandbox, ShadowRealm 等)

        // 準備可用變數
        const allowedGlobals = {
            console: customConsole,
            // 基礎類型建構子通常是安全的
            Object, Array, String, Number, Boolean, Date, Math, JSON, RegExp, Error,
            parseInt, parseFloat, isNaN, isFinite
        };

        // 如果有指定白名單，則只允許這些額外的全局變數
        // 但注意：self, this 在 worker 中還是存在的，要完全隱藏比較困難
        // 下面的 new Function 方式是在函數作用域內執行，相對隔離

        // 構造參數名稱和參數值
        const argNames = Object.keys(allowedGlobals);
        const argValues = Object.values(allowedGlobals);

        // 將用戶代碼包裝在一個函數中，並覆寫全局變數
        // 使用 'use strict' 避免意外的全局變數創建
        const wrappedCode = `
            "use strict";
            // 屏蔽 self, window, globalThis 等全局引用
            const self = undefined;
            const window = undefined;
            const globalThis = undefined;
            const postMessage = undefined; // 禁止直接發送訊息
            const addEventListener = undefined;

            ${code}
        `;

        // 建立函數
        const func = new Function(...argNames, wrappedCode);

        // 執行
        func(...argValues);

        const end = performance.now();
        self.postMessage({ type: 'complete', content: (end - start).toFixed(2) });

    } catch (e) {
        self.postMessage({ type: 'error', content: e.toString() });
    }
}

self.onmessage = function(e) {
    const { type, code, whitelist } = e.data;

    if (type === 'execute') {
        executeSandbox(code, whitelist);
    }
};
