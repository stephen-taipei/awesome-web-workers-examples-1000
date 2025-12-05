const plotBtn = document.getElementById('plotBtn');
const eqZInput = document.getElementById('eqZ');
const rangeInput = document.getElementById('range');
const resInput = document.getElementById('resolution');
const resDisplay = document.getElementById('resDisplay');
const rotXInput = document.getElementById('rotX');
const rotYInput = document.getElementById('rotY');

const vertexCountEl = document.getElementById('vertexCount');
const calcTimeEl = document.getElementById('calcTime');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('surfaceCanvas');
const ctx = canvas.getContext('2d');

let worker;
let currentMesh = null;

resInput.addEventListener('input', () => resDisplay.textContent = resInput.value);
rotXInput.addEventListener('input', drawCachedMesh);
rotYInput.addEventListener('input', drawCachedMesh);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            calcTimeEl.textContent = `${data.duration}ms`;
            vertexCountEl.textContent = data.vertices.length;
            currentMesh = data;
            drawCachedMesh();
            plotBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            statusText.style.color = '#d32f2f';
            plotBtn.disabled = false;
        }
    };
}

plotBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const eqZ = eqZInput.value;
    const range = parseFloat(rangeInput.value);
    const res = parseInt(resInput.value);

    plotBtn.disabled = true;
    statusText.textContent = 'Calculating...';
    statusText.style.color = '#1a237e';
    calcTimeEl.textContent = '-';
    vertexCountEl.textContent = '-';

    worker.postMessage({
        command: 'compute',
        eqZ, range, resolution: res
    });
});

function drawCachedMesh() {
    if (!currentMesh) return;
    
    const rotX = parseInt(rotXInput.value) * Math.PI / 180;
    const rotY = parseInt(rotYInput.value) * Math.PI / 180;
    
    drawSurface(currentMesh.vertices, currentMesh.faces, rotX, rotY);
}

function drawSurface(vertices, faces, rotX, rotY) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    const cx = w / 2;
    const cy = h / 2;
    const scale = 20; // Zoom

    // 1. Rotate and Project Vertices
    const projected = [];
    
    // Rotation Matrices simplified
    const cxR = Math.cos(rotX), sxR = Math.sin(rotX);
    const cyR = Math.cos(rotY), syR = Math.sin(rotY);

    for (let i = 0; i < vertices.length; i++) {
        let x = vertices[i].x;
        let y = vertices[i].y;
        let z = vertices[i].z;

        // Rotate Y (around Y axis) -> affects X, Z
        let tx = x * cyR - z * syR;
        let tz = x * syR + z * cyR;
        let ty = y;

        // Rotate X (around X axis) -> affects Y, Z
        let yFinal = ty * cxR - tz * sxR;
        let zFinal = ty * sxR + tz * cxR;
        let xFinal = tx;

        // Simple Weak Perspective Projection
        // Just map x, y directly after rotation
        
        // Z-sort needs zFinal.
        projected.push({
            x: cx + xFinal * scale,
            y: cy - yFinal * scale, // Flip Y for canvas
            z: zFinal,
            origZ: z // for color mapping
        });
    }

    // 2. Sort Faces by depth (Painter's Algorithm)
    // Calculate average Z of face
    const sortedFaces = faces.map(face => {
        const p1 = projected[face[0]];
        const p2 = projected[face[1]];
        const p3 = projected[face[2]];
        const p4 = projected[face[3]];
        const avgZ = (p1.z + p2.z + p3.z + p4.z) / 4;
        return { indices: face, z: avgZ };
    }).sort((a, b) => b.z - a.z); // Draw furthest first (Painter's)

    // 3. Draw Faces
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = '#3949ab'; // Grid color

    sortedFaces.forEach(f => {
        const idx = f.indices;
        const p1 = projected[idx[0]];
        const p2 = projected[idx[1]];
        const p3 = projected[idx[2]];
        const p4 = projected[idx[3]];

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();

        // Color based on height (original Z)
        const avgOrigZ = (p1.origZ + p2.origZ + p3.origZ + p4.origZ) / 4;
        // Map Z to color (e.g. -5 to 5 range assumed roughly)
        // Blue low, Red high
        const intensity = Math.max(0, Math.min(1, (avgOrigZ + 5) / 10));
        
        // Simple interpolation
        const r = Math.floor(255 * intensity);
        const b = Math.floor(255 * (1 - intensity));
        
        ctx.fillStyle = `rgba(${r}, 50, ${b}, 0.8)`;
        ctx.fill();
        ctx.stroke();
    });
}

initWorker();
// Initial
plotBtn.click();
