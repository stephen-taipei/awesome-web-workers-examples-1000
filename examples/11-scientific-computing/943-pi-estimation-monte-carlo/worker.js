self.onmessage = async function(e) {
    const { command, batch } = e.data;

    if (command === 'start') {
        let total = 0;
        let inside = 0;
        
        while (true) {
            const points = new Float32Array(batch * 3);
            let batchInside = 0;
            
            for (let i = 0; i < batch; i++) {
                const x = Math.random() * 2 - 1;
                const y = Math.random() * 2 - 1;
                const isInside = (x*x + y*y) <= 1;
                
                if (isInside) batchInside++;
                
                points[i*3] = x;
                points[i*3+1] = y;
                points[i*3+2] = isInside ? 1 : 0;
            }
            
            total += batch;
            inside += batchInside;
            
            const estimate = 4 * (inside / total);
            
            self.postMessage({
                type: 'update',
                data: {
                    total, estimate, points
                }
            }, [points.buffer]);
            
            await new Promise(r => setTimeout(r, 16)); // ~60fps
        }
    }
};
