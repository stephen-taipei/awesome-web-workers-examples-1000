# 垃圾回收影響測試 (GC Impact)

這個範例展示了記憶體分配壓力如何影響 Web Worker 的執行效能（延遲）。

## 原理

JavaScript 的垃圾回收 (Garbage Collection, GC) 機制會自動回收不再使用的記憶體。當短時間內分配大量物件時，GC 會頻繁觸發。雖然現代瀏覽器的 GC 已經非常優化（如分代回收、增量回收），但在高負載下仍可能造成主執行緒或 Worker 執行緒的短暫停頓 (Stop-the-world)。

此範例通過在 Worker 中週期性地：
1.  分配大量臨時物件。
2.  更新持久化物件參照。
3.  測量 `setInterval` 的實際觸發時間與預期時間的差值 (Latency)。

如果延遲顯著增加，通常意味著 GC 正在進行清理工作。

## 注意事項

*   記憶體資訊 (`performance.memory`) 是非標準 API，主要在 Chrome/Edge 等 Chromium 瀏覽器中可用。
*   如果瀏覽器啟用了精確計時保護，`performance.now()` 的解析度可能會降低。
