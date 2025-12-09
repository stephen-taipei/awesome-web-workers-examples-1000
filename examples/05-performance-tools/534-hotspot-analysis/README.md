# 熱點分析 (Hotspot Analysis)

這個範例展示了如何找出程式中執行時間最長的部分（熱點）。

## 技術說明

*   **Self Time**: 函數自身的執行時間，不包含它呼叫其他子函數所花費的時間。
*   **Total Time**: 函數從開始到結束的總時間。

通過計算每個函數的 **Self Time**，我們可以精確定位到底是哪個函數本身在消耗 CPU 資源，而不是僅僅因為它呼叫了其他耗時函數。

## 模擬方法

由於瀏覽器沒有開放 Sampling Profiler API 給開發者，我們使用 Instrumentation（插樁）的方式：
1.  維護一個呼叫堆疊 (Call Stack)。
2.  在函數退出時，計算 `Duration = End - Start`。
3.  將 `Duration` 累加到父函數的 `Children Time` 中。
4.  `Self Time = Duration - Children Time`。
