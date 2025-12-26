<<<<<<< HEAD
self.onmessage = function(e) {
    const { imageData, radius } = e.data;
    const { width, height, data } = imageData;
    const output = new Uint8ClampedArray(data.length);

    // Create hexagonal kernel for bokeh effect
    const kernel = [];
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist <= radius) {
                kernel.push({ dx, dy, weight: 1 });
=======
/**
 * 鏡頭模糊 Worker
 */

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'GENERATE_KERNEL':
            generateAndSendKernel(payload.radius, payload.shape);
            break;

        case 'APPLY_BLUR':
            applyLensBlur(payload.imageData, payload.radius, payload.brightness, payload.shape);
            break;
    }
};

function generateAndSendKernel(radius, shape) {
    const { kernel, size } = createLensBlurKernel(radius, shape);
    self.postMessage({
        type: 'KERNEL',
        payload: {
            kernel: kernel,
            kernelSize: size
        }
    });
}

function createLensBlurKernel(radius, shape) {
    const size = radius * 2 + 1;
    const center = radius;
    const kernel = new Float32Array(size * size);
    let totalWeight = 0;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x - center;
            const dy = y - center;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            let inShape = false;

            if (shape === 'circle') {
                if (dist <= radius) inShape = true;
            } else if (shape === 'hexagon') {
                // 六邊形
                // 距離公式：max(|x|, |x/2 + y*sqrt(3)/2|, |x/2 - y*sqrt(3)/2|)
                // 這裡使用極座標更簡單
                // r * cos(theta - floor((theta + pi/6) / (pi/3)) * pi/3) <= r_hex * sqrt(3)/2
                const sides = 6;
                // 旋轉一下讓尖端朝上
                const theta = angle + Math.PI / 2;
                const segment = Math.PI * 2 / sides;
                const rPoly = Math.cos(theta - (Math.floor((theta + Math.PI) / segment) * segment)) / Math.cos(segment/2);
                if (dist * rPoly <= radius) inShape = true;

            } else if (shape === 'star') {
                // 簡單的五角星
                const sides = 5;
                const theta = angle + Math.PI / 2;
                const segment = Math.PI * 2 / sides;
                // 凹陷程度
                const indent = 0.5;
                // 判斷星形需要更複雜的邏輯，這裡簡化為兩個半徑交替
                // 或者距離中心更近
                // 使用極座標半徑變化
                // r(theta)
                const a = theta % segment;
                // 這不是完美的星形，但是接近
                const starR = radius * (1 - indent * Math.abs(Math.cos(theta * sides / 2)));

                // 更準確的星形
                // 我們可以檢查點是否在 10 個頂點組成的多邊形內
                // 簡化版：
                const p = 5;
                const r_outer = radius;
                const r_inner = radius * 0.4;

                // 判斷點是否在星形內比較複雜，這裡用簡單的距離場近似
                // 實際上很多散景只是簡單的多邊形
                // 這裡用一個近似函數
                const angleMod = (angle + Math.PI) % (2 * Math.PI / p);
                const rThresh = (angleMod < Math.PI / p) ? r_outer : r_inner;

                // 使用另一個更漂亮的星形近似公式
                const k = 5;
                const m = 0.5; // 銳利度
                const r_star = radius / (Math.cos((Math.asin(m * Math.cos(k * angle)))));
                // 這個公式可能產生無限大，改用簡單的條件

                // 使用簡單幾何：
                // 星形由 5 個三角形組成
                // 這裡我們直接用距離判斷
                const tau = Math.PI * 2;
                const starAngle = (Math.atan2(dx, dy) + tau) % (tau / 5);
                // 簡化星形邏輯有點難寫，這裡用個簡單的 "星芒" 效果
                const starDist = Math.abs(dx * dy) < (radius*radius/10) && dist <= radius;
                if (starDist || dist <= radius * 0.3) inShape = true;

            } else if (shape === 'heart') {
                 // 心形公式
                 // (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
                 // 調整比例以適應 radius
                 const nx = dx / radius * 1.2;
                 const ny = -dy / radius * 1.2; // Y軸翻轉
                 const eq = Math.pow(nx*nx + ny*ny - 1, 3) - nx*nx * Math.pow(ny, 3);
                 if (eq <= 0) inShape = true;
            }

            if (inShape) {
                // 為了產生好的散景，邊緣可以稍微加強一點 (貓眼效果)
                // 或者均勻分佈
                kernel[y * size + x] = 1.0;
                totalWeight += 1.0;
>>>>>>> origin/main
            }
        }
    }

<<<<<<< HEAD
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, total = 0;

            for (const k of kernel) {
                const sx = x + k.dx, sy = y + k.dy;
                if (sx >= 0 && sx < width && sy >= 0 && sy < height) {
                    const idx = (sy * width + sx) * 4;
                    // Emphasize bright pixels for bokeh
                    const lum = (data[idx] + data[idx+1] + data[idx+2]) / 3;
                    const w = 1 + (lum / 255) * 2;
                    r += data[idx] * w;
                    g += data[idx + 1] * w;
                    b += data[idx + 2] * w;
                    total += w;
                }
            }

            const idx = (y * width + x) * 4;
            output[idx] = r / total;
            output[idx + 1] = g / total;
            output[idx + 2] = b / total;
            output[idx + 3] = data[idx + 3];
        }
    }

    self.postMessage({ imageData: new ImageData(output, width, height) });
};
=======
    if (totalWeight > 0) {
        for (let i = 0; i < kernel.length; i++) {
            kernel[i] /= totalWeight;
        }
    } else {
        kernel[Math.floor(size * size / 2)] = 1.0;
    }

    return { kernel, size };
}

function applyLensBlur(imageData, radius, brightness, shape) {
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    const { kernel, size: kernelSize } = createLensBlurKernel(radius, shape);
    const halfSize = Math.floor(kernelSize / 2);

    // 亮度增強係數
    const brightnessFactor = 1 + (brightness / 100);
    // 閾值，用於判定是否為高光部分
    const threshold = 220;

    // 建立臨時緩衝區存儲高光增強後的圖像
    // 為了模擬真實的散景，我們需要對高光部分給予更高的權重
    // 這裡我們建立一個預處理的源數據，對高光進行增強
    const preprocessedData = new Float32Array(width * height * 4);

    for (let i = 0; i < data.length; i+=4) {
        let r = data[i];
        let g = data[i+1];
        let b = data[i+2];

        // 計算亮度
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // 如果亮度高於閾值，進行增強 (模擬光暈擴散源)
        if (lum > threshold && brightness > 0) {
            const boost = 1.0 + (brightness / 20) * ((lum - threshold) / (255 - threshold));
            r *= boost;
            g *= boost;
            b *= boost;
        }

        preprocessedData[i] = r;
        preprocessedData[i+1] = g;
        preprocessedData[i+2] = b;
        preprocessedData[i+3] = data[i+3];
    }

    const outputData = new Uint8ClampedArray(data.length);
    const progressInterval = Math.ceil(height / 20);

    for (let y = 0; y < height; y++) {
        if (y % progressInterval === 0) {
            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    percent: Math.round((y / height) * 100),
                    message: `處理中... 第 ${y} / ${height} 行`
                }
            });
        }

        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0, a = 0;
            // let weightSum = 0; // 已經正規化，不需要

            // 卷積
            for (let ky = 0; ky < kernelSize; ky++) {
                const py = y + ky - halfSize;
                if (py < 0 || py >= height) continue;

                for (let kx = 0; kx < kernelSize; kx++) {
                    const px = x + kx - halfSize;
                    if (px < 0 || px >= width) continue;

                    const weight = kernel[ky * kernelSize + kx];
                    if (weight === 0) continue;

                    const pos = (py * width + px) * 4;
                    r += preprocessedData[pos] * weight;
                    g += preprocessedData[pos + 1] * weight;
                    b += preprocessedData[pos + 2] * weight;
                    a += preprocessedData[pos + 3] * weight;
                }
            }

            const outPos = (y * width + x) * 4;
            outputData[outPos] = r;
            outputData[outPos + 1] = g;
            outputData[outPos + 2] = b;
            outputData[outPos + 3] = a;
        }
    }

    const endTime = performance.now();
    imageData.data.set(outputData);

    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: imageData,
            duration: endTime - startTime,
            radius: radius,
            brightness: brightness,
            shape: shape
        }
    }, [imageData.data.buffer]);
}
>>>>>>> origin/main
