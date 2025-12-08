// Message Tracing - Main Thread Tracer

class DistributedTracer {
    constructor() {
        this.traces = new Map();
        this.spans = new Map();
        this.stats = {
            totalTraces: 0,
            totalSpans: 0,
            completedTraces: 0,
            totalDuration: 0
        };
    }

    startTrace(operationType) {
        const traceId = this.generateTraceId();
        const trace = {
            traceId,
            operationType,
            startTime: Date.now(),
            endTime: null,
            duration: null,
            spans: [],
            status: 'running',
            rootSpanId: null
        };

        this.traces.set(traceId, trace);
        this.stats.totalTraces++;

        return traceId;
    }

    addSpan(spanData) {
        const { traceId, spanId } = spanData;
        const trace = this.traces.get(traceId);

        if (!trace) return;

        // Merge with existing span data if this is an update
        const existingSpan = this.spans.get(spanId);
        const span = existingSpan ? { ...existingSpan, ...spanData } : spanData;

        this.spans.set(spanId, span);

        if (!existingSpan) {
            trace.spans.push(spanId);
            this.stats.totalSpans++;

            // Set root span
            if (!span.parentSpanId || span.parentSpanId === 'root') {
                trace.rootSpanId = spanId;
            }
        }
    }

    completeSpan(spanData) {
        const { traceId, spanId } = spanData;
        const span = this.spans.get(spanId);

        if (span) {
            Object.assign(span, spanData);
            span.completed = true;
        }

        // Check if trace is complete
        this.checkTraceCompletion(traceId);
    }

    checkTraceCompletion(traceId) {
        const trace = this.traces.get(traceId);
        if (!trace || trace.status !== 'running') return;

        const allSpansComplete = trace.spans.every(spanId => {
            const span = this.spans.get(spanId);
            return span && span.completed;
        });

        if (allSpansComplete && trace.spans.length > 0) {
            trace.status = 'completed';
            trace.endTime = Date.now();
            trace.duration = trace.endTime - trace.startTime;
            this.stats.completedTraces++;
            this.stats.totalDuration += trace.duration;
        }
    }

    getTrace(traceId) {
        const trace = this.traces.get(traceId);
        if (!trace) return null;

        return {
            ...trace,
            spans: trace.spans.map(spanId => this.spans.get(spanId))
        };
    }

    getAllTraces() {
        return Array.from(this.traces.values()).map(trace => ({
            ...trace,
            spans: trace.spans.map(spanId => this.spans.get(spanId))
        }));
    }

    getStats() {
        return {
            ...this.stats,
            avgDuration: this.stats.completedTraces > 0
                ? this.stats.totalDuration / this.stats.completedTraces
                : 0
        };
    }

    clear() {
        this.traces.clear();
        this.spans.clear();
        this.stats = {
            totalTraces: 0,
            totalSpans: 0,
            completedTraces: 0,
            totalDuration: 0
        };
    }

    generateTraceId() {
        return 'trace_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
    }
}

// Initialize tracer and workers
const tracer = new DistributedTracer();
const workers = new Map();
const workerConfigs = [
    { id: 'worker-a', name: 'Service A', color: '#3b82f6' },
    { id: 'worker-b', name: 'Service B', color: '#f59e0b' },
    { id: 'worker-c', name: 'Service C', color: '#8b5cf6' }
];

let activeWorkerCount = 0;
let selectedSpan = null;

// DOM Elements
const operationType = document.getElementById('operationType');
const operationDelay = document.getElementById('operationDelay');
const addJitter = document.getElementById('addJitter');
const startTraceBtn = document.getElementById('startTraceBtn');
const clearTracesBtn = document.getElementById('clearTracesBtn');

const tracesContainer = document.getElementById('tracesContainer');
const spanDetailsSection = document.getElementById('spanDetailsSection');
const spanDetails = document.getElementById('spanDetails');
const logsContainer = document.getElementById('logsContainer');

const canvas = document.getElementById('traceCanvas');
const ctx = canvas.getContext('2d');

// Initialize workers
function initWorkers() {
    workerConfigs.forEach(config => {
        const worker = new Worker('worker.js');

        worker.onmessage = function(e) {
            const data = e.data;

            switch (data.type) {
                case 'initialized':
                    activeWorkerCount++;
                    updateActiveWorkers();
                    addLog(`Worker ${data.workerName} initialized`, 'info');
                    break;

                case 'spanStart':
                    tracer.addSpan(data.span);
                    addLog(`[${data.span.traceId.slice(-8)}] Started: ${data.span.operationName}`, 'start');
                    updateDisplay();
                    break;

                case 'spanEnd':
                    tracer.completeSpan(data.span);
                    addLog(`[${data.span.traceId.slice(-8)}] Completed: ${data.span.operationName} (${data.span.duration.toFixed(1)}ms)`, 'end');

                    // Continue trace chain if needed
                    if (data.nextTraceContext && pendingOperations.has(data.span.traceId)) {
                        const pending = pendingOperations.get(data.span.traceId);
                        continueTrace(data.span.traceId, data.nextTraceContext, pending);
                    }

                    updateDisplay();
                    break;
            }
        };

        worker.postMessage({ action: 'init', data: config });
        workers.set(config.id, { worker, config });
    });
}

// Pending operations for trace continuation
const pendingOperations = new Map();

function startNewTrace() {
    const type = operationType.value;
    const delay = parseInt(operationDelay.value);
    const jitter = addJitter.value === 'true';

    const traceId = tracer.startTrace(type);

    addLog(`Started new trace: ${traceId}`, 'trace');

    // Create root span in main thread
    const rootSpanId = 'root_' + Date.now().toString(36);
    tracer.addSpan({
        traceId,
        spanId: rootSpanId,
        parentSpanId: null,
        operationName: 'main:request',
        startTime: Date.now(),
        tags: { 'operation.type': type },
        logs: [{ timestamp: Date.now(), event: 'started', message: 'Request initiated' }]
    });

    const traceContext = { traceId, parentSpanId: rootSpanId };

    switch (type) {
        case 'sequential':
            executeSequential(traceId, traceContext, delay, jitter);
            break;
        case 'parallel':
            executeParallel(traceId, traceContext, delay, jitter);
            break;
        case 'fanout':
            executeFanOut(traceId, traceContext, delay, jitter);
            break;
        case 'complex':
            executeComplex(traceId, traceContext, delay, jitter);
            break;
    }
}

function executeSequential(traceId, traceContext, delay, jitter) {
    // A → B → C
    pendingOperations.set(traceId, {
        type: 'sequential',
        queue: ['worker-b', 'worker-c'],
        delay,
        jitter
    });

    sendToWorker('worker-a', traceId, traceContext, 'process-step-1', delay, jitter);
}

function executeParallel(traceId, traceContext, delay, jitter) {
    // A, B, C in parallel
    sendToWorker('worker-a', traceId, traceContext, 'parallel-task', delay, jitter);
    sendToWorker('worker-b', traceId, traceContext, 'parallel-task', delay, jitter);
    sendToWorker('worker-c', traceId, traceContext, 'parallel-task', delay, jitter);

    // Complete root span after a delay
    setTimeout(() => {
        completeRootSpan(traceId);
    }, delay * 2);
}

function executeFanOut(traceId, traceContext, delay, jitter) {
    // A fans out to B and C, then collects
    pendingOperations.set(traceId, {
        type: 'fanout',
        phase: 'scatter',
        remaining: 2,
        delay,
        jitter
    });

    sendToWorker('worker-a', traceId, traceContext, 'scatter', delay, jitter);
}

function executeComplex(traceId, traceContext, delay, jitter) {
    // A → B, A → C, B → C
    pendingOperations.set(traceId, {
        type: 'complex',
        phase: 1,
        delay,
        jitter
    });

    sendToWorker('worker-a', traceId, traceContext, 'init-complex', delay, jitter);
}

function continueTrace(traceId, traceContext, pending) {
    const { delay, jitter } = pending;

    if (pending.type === 'sequential' && pending.queue.length > 0) {
        const nextWorker = pending.queue.shift();
        const stepNum = 3 - pending.queue.length;
        sendToWorker(nextWorker, traceId, traceContext, `process-step-${stepNum}`, delay, jitter);

        if (pending.queue.length === 0) {
            pendingOperations.delete(traceId);
            setTimeout(() => completeRootSpan(traceId), delay);
        }
    } else if (pending.type === 'fanout') {
        if (pending.phase === 'scatter') {
            // After A, fan out to B and C
            pending.phase = 'gather';
            sendToWorker('worker-b', traceId, traceContext, 'process-branch-1', delay, jitter);
            sendToWorker('worker-c', traceId, traceContext, 'process-branch-2', delay, jitter);
        } else {
            pending.remaining--;
            if (pending.remaining === 0) {
                pendingOperations.delete(traceId);
                setTimeout(() => completeRootSpan(traceId), 100);
            }
        }
    } else if (pending.type === 'complex') {
        if (pending.phase === 1) {
            pending.phase = 2;
            sendToWorker('worker-b', traceId, traceContext, 'complex-b', delay, jitter);
            sendToWorker('worker-c', traceId, traceContext, 'complex-c1', delay, jitter);
        } else if (pending.phase === 2) {
            pending.remaining = (pending.remaining || 2) - 1;
            if (pending.remaining === 0) {
                pending.phase = 3;
                sendToWorker('worker-c', traceId, traceContext, 'complex-final', delay, jitter);
            }
        } else {
            pendingOperations.delete(traceId);
            setTimeout(() => completeRootSpan(traceId), 100);
        }
    }
}

function sendToWorker(workerId, traceId, traceContext, operation, delay, jitter) {
    const workerEntry = workers.get(workerId);
    if (!workerEntry) return;

    workerEntry.worker.postMessage({
        action: 'process',
        data: {
            operation,
            payload: { timestamp: Date.now(), operation },
            delay,
            jitter
        },
        traceContext
    });
}

function completeRootSpan(traceId) {
    const trace = tracer.getTrace(traceId);
    if (trace && trace.rootSpanId) {
        tracer.completeSpan({
            traceId,
            spanId: trace.rootSpanId,
            endTime: Date.now(),
            duration: Date.now() - trace.startTime,
            status: 'OK',
            completed: true
        });
        updateDisplay();
    }
}

function updateDisplay() {
    updateTracesList();
    updateStats();
    drawVisualization();
}

function updateTracesList() {
    const traces = tracer.getAllTraces();

    if (traces.length === 0) {
        tracesContainer.innerHTML = '<p class="empty-message">No traces yet. Start a new trace to begin.</p>';
        return;
    }

    tracesContainer.innerHTML = traces.reverse().slice(0, 10).map(trace => {
        const statusClass = trace.status === 'completed' ? 'completed' : 'running';
        const duration = trace.duration ? `${trace.duration}ms` : 'In progress...';

        return `
            <div class="trace-item ${statusClass}" onclick="selectTrace('${trace.traceId}')">
                <div class="trace-header">
                    <span class="trace-id">${trace.traceId.slice(-12)}</span>
                    <span class="trace-type">${trace.operationType}</span>
                    <span class="trace-status ${statusClass}">${trace.status}</span>
                </div>
                <div class="trace-info">
                    <span>Spans: ${trace.spans.length}</span>
                    <span>Duration: ${duration}</span>
                </div>
            </div>
        `;
    }).join('');
}

window.selectTrace = function(traceId) {
    const trace = tracer.getTrace(traceId);
    if (trace) {
        drawTraceTimeline(trace);
    }
};

function updateStats() {
    const stats = tracer.getStats();
    document.getElementById('totalTraces').textContent = stats.totalTraces;
    document.getElementById('totalSpans').textContent = stats.totalSpans;
    document.getElementById('avgDuration').textContent = stats.avgDuration > 0 ? stats.avgDuration.toFixed(1) : '-';
    document.getElementById('activeWorkers').textContent = activeWorkerCount;
}

function updateActiveWorkers() {
    document.getElementById('activeWorkers').textContent = activeWorkerCount;
}

function addLog(message, type) {
    const timestamp = new Date().toLocaleTimeString();
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="log-time">[${timestamp}]</span> ${message}`;
    logsContainer.insertBefore(entry, logsContainer.firstChild);

    while (logsContainer.children.length > 50) {
        logsContainer.removeChild(logsContainer.lastChild);
    }
}

function drawVisualization() {
    const traces = tracer.getAllTraces();
    const latestTrace = traces[traces.length - 1];

    if (latestTrace) {
        drawTraceTimeline(latestTrace);
    } else {
        drawEmptyCanvas();
    }
}

function drawEmptyCanvas() {
    const w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#4a7a5a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Start a trace to see the timeline visualization', w / 2, h / 2);
}

function drawTraceTimeline(trace) {
    const w = canvas.width, h = canvas.height;
    const padding = { top: 60, right: 30, bottom: 40, left: 120 };
    const plotW = w - padding.left - padding.right;
    const plotH = h - padding.top - padding.bottom;

    // Clear
    ctx.fillStyle = '#0a0f0a';
    ctx.fillRect(0, 0, w, h);

    // Title
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Trace: ${trace.traceId.slice(-12)} (${trace.operationType})`, padding.left, 25);

    const spans = trace.spans.filter(s => s && s.startTime);
    if (spans.length === 0) {
        ctx.fillStyle = '#4a7a5a';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Waiting for spans...', w / 2, h / 2);
        return;
    }

    // Calculate time range
    const minTime = Math.min(...spans.map(s => s.startTime));
    const maxTime = Math.max(...spans.map(s => s.endTime || Date.now()));
    const timeRange = maxTime - minTime || 1;

    // Draw time axis
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    // Time labels
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const x = padding.left + (i / 5) * plotW;
        const time = (timeRange * i / 5).toFixed(0);
        ctx.fillText(`${time}ms`, x, h - padding.bottom + 20);
    }

    // Group spans by worker
    const workerSpans = new Map();
    spans.forEach(span => {
        const workerId = span.workerId || 'main';
        if (!workerSpans.has(workerId)) {
            workerSpans.set(workerId, []);
        }
        workerSpans.get(workerId).push(span);
    });

    // Draw spans
    const workerIds = Array.from(workerSpans.keys());
    const rowHeight = Math.min(50, plotH / workerIds.length);

    workerIds.forEach((workerId, idx) => {
        const y = padding.top + idx * rowHeight;
        const workerConfig = workerConfigs.find(c => c.id === workerId) || { name: 'Main', color: '#10b981' };

        // Worker label
        ctx.fillStyle = workerConfig.color;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(workerConfig.name, padding.left - 10, y + rowHeight / 2 + 4);

        // Draw spans for this worker
        workerSpans.get(workerId).forEach(span => {
            const startX = padding.left + ((span.startTime - minTime) / timeRange) * plotW;
            const endX = span.endTime
                ? padding.left + ((span.endTime - minTime) / timeRange) * plotW
                : startX + 20;
            const barWidth = Math.max(endX - startX, 4);

            // Span bar
            ctx.fillStyle = workerConfig.color;
            ctx.fillRect(startX, y + 10, barWidth, rowHeight - 20);

            // Span border
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(startX, y + 10, barWidth, rowHeight - 20);

            // Operation name (if space)
            if (barWidth > 50) {
                ctx.fillStyle = '#fff';
                ctx.font = '9px sans-serif';
                ctx.textAlign = 'left';
                const opName = span.operationName.split(':')[1] || span.operationName;
                ctx.fillText(opName, startX + 4, y + rowHeight / 2 + 3);
            }

            // Duration label
            if (span.duration && barWidth > 30) {
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                ctx.font = '8px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(`${span.duration.toFixed(0)}ms`, startX + barWidth - 4, y + rowHeight - 14);
            }
        });
    });

    // Draw dependency lines
    ctx.strokeStyle = 'rgba(16,185,129,0.4)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;

    spans.forEach(span => {
        if (span.parentSpanId) {
            const parentSpan = spans.find(s => s.spanId === span.parentSpanId);
            if (parentSpan) {
                const parentWorkerIdx = workerIds.indexOf(parentSpan.workerId || 'main');
                const spanWorkerIdx = workerIds.indexOf(span.workerId || 'main');

                const parentX = padding.left + ((parentSpan.endTime || parentSpan.startTime + 100 - minTime) / timeRange) * plotW;
                const parentY = padding.top + parentWorkerIdx * rowHeight + rowHeight / 2;

                const spanX = padding.left + ((span.startTime - minTime) / timeRange) * plotW;
                const spanY = padding.top + spanWorkerIdx * rowHeight + rowHeight / 2;

                ctx.beginPath();
                ctx.moveTo(parentX, parentY);
                ctx.lineTo(spanX, spanY);
                ctx.stroke();
            }
        }
    });
    ctx.setLineDash([]);

    // Legend
    ctx.font = '10px sans-serif';
    let legendX = padding.left;
    ctx.fillStyle = '#34d399';
    ctx.textAlign = 'left';
    ctx.fillText('Workers:', legendX, h - 10);
    legendX += 55;

    workerConfigs.forEach(config => {
        ctx.fillStyle = config.color;
        ctx.fillRect(legendX, h - 18, 12, 12);
        ctx.fillStyle = '#a7f3d0';
        ctx.fillText(config.name, legendX + 16, h - 8);
        legendX += 80;
    });
}

function clearTraces() {
    tracer.clear();
    pendingOperations.clear();
    logsContainer.innerHTML = '';
    updateDisplay();
    drawEmptyCanvas();
    addLog('All traces cleared', 'info');
}

// Event listeners
startTraceBtn.addEventListener('click', startNewTrace);
clearTracesBtn.addEventListener('click', clearTraces);

// Initialize
initWorkers();
drawEmptyCanvas();
