// 模擬不可靠的後端服務

self.onmessage = function(e) {
    const { id, reliability, timeout } = e.data;

    // 模擬網路延遲 (500ms - 1500ms)
    const delay = 500 + Math.random() * 1000;

    // 決定是否成功
    // Math.random() 返回 0-1 之間的數
    // 如果 random < reliability (例如 0.7)，則成功
    const isSuccess = Math.random() < reliability;

    setTimeout(() => {
        if (isSuccess) {
            self.postMessage({
                id: id,
                success: true,
                message: "Server Response OK"
            });
        } else {
            self.postMessage({
                id: id,
                success: false,
                message: "500 Internal Server Error"
            });
        }
    }, delay);
};
