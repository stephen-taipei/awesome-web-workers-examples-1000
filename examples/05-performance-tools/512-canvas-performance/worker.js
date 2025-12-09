self.onmessage = function(e) {
    const { canvas, count, width, height } = e.data;
    const ctx = canvas.getContext('2d');

    const objects = [];
    for (let i = 0; i < count; i++) {
        objects.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        });
    }

    let lastTime = performance.now();
    let frames = 0;
    let fpsTime = lastTime;

    function animate() {
        const now = performance.now();

        frames++;
        if (now - fpsTime >= 1000) {
            const fps = Math.round((frames * 1000) / (now - fpsTime));
            self.postMessage({ type: 'fps', value: fps });
            frames = 0;
            fpsTime = now;
        }

        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < count; i++) {
            const obj = objects[i];
            obj.x += obj.vx;
            obj.y += obj.vy;

            if (obj.x < 0 || obj.x > width) obj.vx *= -1;
            if (obj.y < 0 || obj.y > height) obj.vy *= -1;

            ctx.fillStyle = obj.color;
            ctx.fillRect(obj.x, obj.y, 2, 2);
        }

        requestAnimationFrame(animate);
    }

    animate();
};
