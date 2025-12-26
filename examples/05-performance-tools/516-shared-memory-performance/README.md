# 共享記憶體效能測試 (Shared Memory Performance)

本範例展示 `SharedArrayBuffer` 與 `Atomics` 在 Web Workers 中的應用，並與傳統 `postMessage` 進行概念對比。

## 功能簡介

- **原子操作 (Atomics)**：在高併發情境下，多個執行緒同時讀寫同一記憶體位置時，使用 Atomics 保證數據的一致性。
- **效能測試**：
    -   **postMessage**：模擬傳統方式，Worker 獨立計算。若需實時同步狀態，每次更新都需發送訊息（開銷巨大）。在此測試中，我們僅計算純運算時間作為基準（無同步）。
    -   **SharedArrayBuffer**：使用 `Atomics.add` 進行線程安全的累加。雖然比純局部變量慢，但它實現了真正的跨線程共享狀態，且比訊息傳遞快得多。

## 技術重點

- **SharedArrayBuffer**：允許主執行緒與 Worker 共享同一塊內存，無需複製數據。
- **Atomics.add(typedArray, index, value)**：將指定位置的值加上一個數，並返回舊值。此操作是原子的，不會被其他線程中斷。

## 使用方式

1.  選擇「操作次數」。
2.  點擊「測試 postMessage」：執行純局部變量累加（基準）。
3.  點擊「測試 SharedArrayBuffer」：執行原子操作累加（跨線程共享）。

> **注意**：使用 `SharedArrayBuffer` 通常需要伺服器配置特定的響應頭 (`Cross-Origin-Opener-Policy: same-origin` 和 `Cross-Origin-Embedder-Policy: require-corp`)。在某些開發環境中可能無法使用。
