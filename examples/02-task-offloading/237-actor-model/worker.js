// Actor Model - Worker (Individual Actor)

let actorId = '';
let actorType = '';
let state = {};
let processingTime = 20;
let mailbox = [];
let isProcessing = false;

self.onmessage = function(e) {
    const { type } = e.data;

    if (type === 'init') {
        initActor(e.data);
    } else if (type === 'message') {
        receiveMessage(e.data);
    }
};

function initActor(data) {
    actorId = data.actorId;
    actorType = data.actorType;
    state = data.initialState || {};
    processingTime = data.processingTime || 20;
    mailbox = [];
    isProcessing = false;

    self.postMessage({
        type: 'ready',
        actorId,
        state
    });
}

function receiveMessage(message) {
    mailbox.push(message);

    self.postMessage({
        type: 'processing',
        actorId,
        mailboxSize: mailbox.length
    });

    if (!isProcessing) {
        processNextMessage();
    }
}

function processNextMessage() {
    if (mailbox.length === 0) {
        isProcessing = false;
        return;
    }

    isProcessing = true;
    const message = mailbox.shift();

    // Simulate processing time
    setTimeout(() => {
        try {
            processMessage(message);
        } catch (error) {
            self.postMessage({
                type: 'error',
                actorId,
                error: error.message,
                messageId: message.messageId
            });
        }

        self.postMessage({
            type: 'processed',
            actorId,
            state,
            mailboxSize: mailbox.length,
            messageId: message.messageId,
            replyTo: message.expectReply ? message.from : null
        });

        // Process next message
        processNextMessage();
    }, processingTime + Math.random() * 10);
}

function processMessage(message) {
    const { from, payload, messageId } = message;

    switch (actorType) {
        case 'bank':
            processBankMessage(from, payload, messageId);
            break;
        case 'counter':
            processCounterMessage(from, payload, messageId);
            break;
        case 'pipeline':
            processPipelineMessage(from, payload, messageId);
            break;
        case 'supervisor':
            processSupervisorMessage(from, payload, messageId);
            break;
        case 'worker':
            processWorkerMessage(from, payload, messageId);
            break;
    }
}

// ============ BANK ACCOUNT ACTOR ============

function processBankMessage(from, payload, messageId) {
    const { action, amount, replyTo } = payload;

    switch (action) {
        case 'credit':
            state.balance += amount;
            break;

        case 'debit':
            if (state.balance >= amount) {
                state.balance -= amount;
            }
            break;

        case 'transfer':
            // Received transfer request - debit from this account
            if (state.balance >= amount) {
                state.balance -= amount;
                // Send credit to target
                sendMessage(from, {
                    action: 'credit',
                    amount
                });
            }
            break;

        case 'get_balance':
            sendMessage(from, {
                action: 'balance_response',
                balance: state.balance
            });
            break;
    }
}

// ============ COUNTER ACTOR ============

function processCounterMessage(from, payload, messageId) {
    const { action, value } = payload;

    switch (action) {
        case 'increment':
            state.count = (state.count || 0) + 1;
            break;

        case 'decrement':
            state.count = (state.count || 0) - 1;
            break;

        case 'set':
            state.count = value;
            break;

        case 'get':
            sendMessage(from, {
                action: 'count_response',
                count: state.count
            });
            break;
    }
}

// ============ PIPELINE ACTOR ============

function processPipelineMessage(from, payload, messageId) {
    const { action, data } = payload;

    if (action === 'process') {
        // Process data based on stage
        let processedData = { ...data };

        switch (state.stageName) {
            case 'parse':
                processedData.parsed = true;
                processedData.value = parseFloat(data.value.toFixed(2));
                break;

            case 'validate':
                processedData.validated = processedData.value > 0 && processedData.value < 100;
                break;

            case 'transform':
                processedData.transformed = true;
                processedData.value = processedData.value * 2;
                break;

            case 'store':
                processedData.stored = true;
                processedData.storedAt = Date.now();
                break;
        }

        state.processed = (state.processed || 0) + 1;

        // Pass to next stage if exists
        if (state.nextStage) {
            sendMessage(state.nextStage, {
                action: 'process',
                data: processedData
            });
        }
    }
}

// ============ SUPERVISOR ACTOR ============

function processSupervisorMessage(from, payload, messageId) {
    const { action, workerId, task } = payload;

    switch (action) {
        case 'worker_failed':
            // Restart the failed worker
            state.restarts = (state.restarts || 0) + 1;

            // Send restart signal (in real system, would recreate the worker)
            sendMessage(workerId, {
                action: 'restart',
                initialState: { tasksCompleted: 0 }
            });
            break;

        case 'assign_work':
            // Distribute work to workers
            sendMessage(workerId, {
                action: 'work',
                task
            });
            break;
    }
}

// ============ WORKER ACTOR ============

function processWorkerMessage(from, payload, messageId) {
    const { action, task, shouldFail, initialState } = payload;

    switch (action) {
        case 'work':
            // Simulate work that might fail
            if (shouldFail) {
                throw new Error('Simulated worker failure');
            }

            // Do the work
            state.tasksCompleted = (state.tasksCompleted || 0) + 1;
            state.lastTask = task;

            // Report completion to supervisor
            sendMessage('supervisor', {
                action: 'work_complete',
                taskId: task.id,
                result: task.data * 2
            });
            break;

        case 'restart':
            // Reset state
            state = initialState || { tasksCompleted: 0 };
            self.postMessage({
                type: 'restarted',
                actorId,
                state
            });
            break;
    }
}

// ============ UTILITY FUNCTIONS ============

function sendMessage(to, payload, expectReply = false) {
    self.postMessage({
        type: 'send_message',
        from: actorId,
        to,
        payload,
        expectReply
    });
}
