// CSP Model - Worker (Process)

let processId = '';
let processType = '';
let channels = [];
let messageCount = 0;
let pattern = '';
let config = {};
let msgCounter = 0;
let pendingOps = {};

self.onmessage = function(e) {
    const { type } = e.data;

    switch (type) {
        case 'init':
            initProcess(e.data);
            break;
        case 'start':
            startProcess(e.data.config);
            break;
        case 'send_result':
            handleSendResult(e.data);
            break;
        case 'recv_result':
            handleRecvResult(e.data);
            break;
    }
};

function initProcess(data) {
    processId = data.processId;
    processType = data.processType;
    channels = data.channels;
    messageCount = data.messageCount;
    pattern = data.pattern;
    msgCounter = 0;
    pendingOps = {};

    self.postMessage({ type: 'ready', processId });
}

function startProcess(cfg) {
    config = cfg;

    switch (pattern) {
        case 'pipeline':
            runPipeline();
            break;
        case 'fanout':
            runFanout();
            break;
        case 'fanin':
            runFanin();
            break;
        case 'pingpong':
            runPingPong();
            break;
    }
}

// ============ PIPELINE PATTERN ============

function runPipeline() {
    if (config.sendChannel && config.count) {
        // Producer
        for (let i = 0; i < config.count; i++) {
            setTimeout(() => {
                send(config.sendChannel, { id: i, value: Math.random() * 100, stage: 0 });
            }, i * 30);
        }
    } else if (config.recvChannel && config.sendChannel) {
        // Transformer stage
        receiveLoop(config.recvChannel, (value) => {
            // Transform the value
            const transformed = {
                ...value,
                value: value.value * 2,
                stage: value.stage + 1,
                transformedBy: processId
            };
            send(config.sendChannel, transformed);
        });
    } else if (config.recvChannel && config.count) {
        // Consumer
        let received = 0;
        receiveLoop(config.recvChannel, (value) => {
            received++;
            if (received >= config.count) {
                complete();
            }
        });
    }
}

// ============ FAN-OUT PATTERN ============

function runFanout() {
    if (config.sendChannels && config.count) {
        // Producer - distribute to workers
        for (let i = 0; i < config.count; i++) {
            setTimeout(() => {
                const channel = config.sendChannels[i % config.sendChannels.length];
                send(channel, { id: i, value: Math.random() * 100 });
            }, i * 30);
        }
    } else if (config.recvChannel) {
        // Worker - receive and process
        receiveLoop(config.recvChannel, (value) => {
            // Simulate processing
            const processed = { ...value, processedBy: processId };
        });
    }
}

// ============ FAN-IN PATTERN ============

function runFanin() {
    if (config.sendChannel && config.count) {
        // Producer
        for (let i = 0; i < config.count; i++) {
            setTimeout(() => {
                send(config.sendChannel, { id: i, source: processId, value: Math.random() * 100 });
            }, i * 50);
        }
        setTimeout(() => complete(), config.count * 50 + 100);
    } else if (config.recvChannels && config.count) {
        // Collector - receive from any channel
        let received = 0;
        const targetCount = config.count;

        config.recvChannels.forEach(ch => {
            receiveLoop(ch, (value) => {
                received++;
                if (received >= targetCount) {
                    complete();
                }
            });
        });
    }
}

// ============ PING-PONG PATTERN ============

function runPingPong() {
    let count = 0;
    const maxCount = config.count || messageCount;

    if (config.starter) {
        // Start the ping-pong
        send(config.sendChannel, { count: 0, starter: processId });

        // Wait for pong
        receiveLoop(config.recvChannel, (value) => {
            count = value.count + 1;
            if (count < maxCount) {
                setTimeout(() => {
                    send(config.sendChannel, { count, from: processId });
                }, 20);
            } else {
                complete();
            }
        });
    } else {
        // Responder
        receiveLoop(config.recvChannel, (value) => {
            count = value.count;
            setTimeout(() => {
                send(config.sendChannel, { count, from: processId });
            }, 20);
        });
    }
}

// ============ CHANNEL OPERATIONS ============

function send(channel, value) {
    const msgId = `${processId}_send_${msgCounter++}`;
    pendingOps[msgId] = { type: 'send', channel, value, time: performance.now() };

    self.postMessage({
        type: 'send',
        msgId,
        channel,
        value
    });
}

function recv(channel, callback) {
    const msgId = `${processId}_recv_${msgCounter++}`;
    pendingOps[msgId] = { type: 'recv', channel, callback, time: performance.now() };

    self.postMessage({
        type: 'recv',
        msgId,
        channel
    });
}

function handleSendResult(data) {
    const op = pendingOps[data.msgId];
    if (op) {
        delete pendingOps[data.msgId];
        // Send completed
    }
}

function handleRecvResult(data) {
    const op = pendingOps[data.msgId];
    if (op && op.callback) {
        delete pendingOps[data.msgId];
        if (data.success) {
            op.callback(data.value);
        }
    }
}

function receiveLoop(channel, handler) {
    const doRecv = () => {
        recv(channel, (value) => {
            handler(value);
            // Continue receiving
            setTimeout(doRecv, 10);
        });
    };
    doRecv();
}

function complete() {
    self.postMessage({ type: 'complete', processId });
}
