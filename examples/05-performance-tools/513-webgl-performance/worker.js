self.onmessage = function(e) {
    const { canvas, count } = e.data;
    const gl = canvas.getContext('webgl');

    if (!gl) {
        console.error('Unable to initialize WebGL.');
        return;
    }

    // Shaders
    const vsSource = `
        attribute vec4 aVertexPosition;
        attribute vec4 aVertexColor;
        varying lowp vec4 vColor;
        void main(void) {
            gl_Position = aVertexPosition;
            vColor = aVertexColor;
        }
    `;

    const fsSource = `
        varying lowp vec4 vColor;
        void main(void) {
            gl_FragColor = vColor;
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        },
    };

    const buffers = initBuffers(gl, count);

    let lastTime = performance.now();
    let frames = 0;
    let fpsTime = lastTime;

    function render() {
        const now = performance.now();
        frames++;
        if (now - fpsTime >= 1000) {
            const fps = Math.round((frames * 1000) / (now - fpsTime));
            self.postMessage({ type: 'fps', value: fps });
            frames = 0;
            fpsTime = now;
        }

        drawScene(gl, programInfo, buffers, count);
        requestAnimationFrame(render);
    }

    render();
};

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

function initBuffers(gl, count) {
    // Generate random triangles
    const positions = [];
    const colors = [];

    for (let i = 0; i < count; i++) {
        const x = (Math.random() * 2) - 1;
        const y = (Math.random() * 2) - 1;
        const size = 0.05;

        positions.push(x, y + size);
        positions.push(x - size, y - size);
        positions.push(x + size, y - size);

        const r = Math.random();
        const g = Math.random();
        const b = Math.random();
        const a = 1.0;

        for (let j = 0; j < 3; j++) {
            colors.push(r, g, b, a);
        }
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
    };
}

function drawScene(gl, programInfo, buffers, count) {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight); // Important for OffscreenCanvas resizing
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
    gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

    gl.useProgram(programInfo.program);
    gl.drawArrays(gl.TRIANGLES, 0, count * 3);
}
