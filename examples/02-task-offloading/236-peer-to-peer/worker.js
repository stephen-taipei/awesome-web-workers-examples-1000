// Peer-to-Peer Pattern - Worker (Peer Node)

let peerId = -1;
let peerPorts = [];
let peerIds = [];
let totalPeers = 0;
let algorithm = '';
let messageDelay = 50;
let startTime = 0;

let myValue = null;
let myData = null;
let receivedFrom = new Set();
let round = 0;
let isComplete = false;
let isLeader = false;
let highestId = -1;

// Handle messages from main thread
self.onmessage = function(e) {
    const { type } = e.data;

    if (type === 'init') {
        initPeer(e.data, e.ports);
    } else if (type === 'start') {
        startAlgorithm(e.data);
    }
};

function initPeer(data, ports) {
    peerId = data.peerId;
    peerIds = data.peerIds;
    totalPeers = data.totalPeers;
    peerPorts = ports;

    // Set up message handlers for peer-to-peer communication
    peerPorts.forEach((port, idx) => {
        port.onmessage = (e) => handlePeerMessage(peerIds[idx], e.data);
    });

    // Generate initial value
    const initialValue = Math.random() * 100;
    myValue = initialValue;

    self.postMessage({
        type: 'ready',
        peerId,
        initialValue
    });
}

function startAlgorithm(data) {
    algorithm = data.algorithm;
    myData = data.data;
    messageDelay = data.messageDelay;
    startTime = performance.now();
    round = 0;
    receivedFrom = new Set();
    isComplete = false;
    isLeader = false;

    switch (algorithm) {
        case 'gossip':
            runGossipProtocol();
            break;
        case 'consensus':
            myValue = data.data; // Initial value for consensus
            runConsensusProtocol();
            break;
        case 'election':
            highestId = data.data; // My election ID
            myValue = highestId;
            runLeaderElection();
            break;
        case 'aggregate':
            myData = data.data;
            myValue = myData ? myData.reduce((a, b) => a + b, 0) : 0;
            runAggregation();
            break;
    }
}

function handlePeerMessage(fromPeer, msg) {
    switch (algorithm) {
        case 'gossip':
            handleGossipMessage(fromPeer, msg);
            break;
        case 'consensus':
            handleConsensusMessage(fromPeer, msg);
            break;
        case 'election':
            handleElectionMessage(fromPeer, msg);
            break;
        case 'aggregate':
            handleAggregateMessage(fromPeer, msg);
            break;
    }
}

// ============ GOSSIP PROTOCOL ============

function runGossipProtocol() {
    if (myData !== null) {
        // I have the rumor, start spreading it
        reportStateUpdate(myData.length, 'spreading');
        spreadGossip();
    } else {
        // Waiting for rumor
        reportStateUpdate(0, 'waiting');
    }
}

function spreadGossip() {
    if (isComplete) return;

    // Select random peers to gossip with
    const numTargets = Math.min(2, peerIds.length);
    const targets = selectRandomPeers(numTargets);

    targets.forEach(targetIdx => {
        const targetPeerId = peerIds[targetIdx];
        sendToPeer(targetIdx, {
            type: 'gossip',
            data: myData,
            round: round
        });
        reportMessageSent(targetPeerId, 'GOSSIP');
    });

    round++;
    reportRoundComplete();

    // Continue gossiping for a few rounds
    if (round < Math.ceil(Math.log2(totalPeers)) + 2) {
        setTimeout(() => spreadGossip(), messageDelay * 2);
    } else {
        completeAlgorithm();
    }
}

function handleGossipMessage(fromPeer, msg) {
    if (msg.type === 'gossip' && myData === null) {
        // Received the rumor!
        myData = msg.data;
        myValue = myData.length;
        receivedFrom.add(fromPeer);

        reportStateUpdate(myData.length, 'received');

        // Start spreading
        setTimeout(() => spreadGossip(), messageDelay);
    }
}

// ============ CONSENSUS PROTOCOL ============

function runConsensusProtocol() {
    reportStateUpdate(myValue, 'averaging');
    consensusRound();
}

function consensusRound() {
    if (isComplete) return;

    // Send my value to all peers
    peerPorts.forEach((port, idx) => {
        sendToPeer(idx, {
            type: 'consensus_value',
            value: myValue,
            round: round
        });
        reportMessageSent(peerIds[idx], 'VALUE');
    });

    round++;
    reportRoundComplete();

    // Wait for responses and then do next round
    setTimeout(() => {
        if (round < 20) { // Max rounds
            consensusRound();
        } else {
            completeAlgorithm();
        }
    }, messageDelay * 3);
}

function handleConsensusMessage(fromPeer, msg) {
    if (msg.type === 'consensus_value') {
        // Average my value with received value
        const oldValue = myValue;
        myValue = (myValue + msg.value) / 2;

        if (Math.abs(myValue - oldValue) > 0.0001) {
            reportStateUpdate(myValue, 'averaging');
        }
    }
}

// ============ LEADER ELECTION ============

function runLeaderElection() {
    reportStateUpdate(highestId, 'electing');
    electionRound();
}

function electionRound() {
    if (isComplete) return;

    // Broadcast my highest known ID
    peerPorts.forEach((port, idx) => {
        sendToPeer(idx, {
            type: 'election_id',
            candidateId: highestId,
            originalPeer: highestId === myValue ? peerId : -1,
            round: round
        });
        reportMessageSent(peerIds[idx], 'ELECT');
    });

    round++;
    reportRoundComplete();

    // Continue for enough rounds to ensure propagation
    setTimeout(() => {
        if (round < totalPeers + 2) {
            electionRound();
        } else {
            // Check if I'm the leader
            isLeader = (highestId === myValue);
            completeAlgorithm();
        }
    }, messageDelay * 2);
}

function handleElectionMessage(fromPeer, msg) {
    if (msg.type === 'election_id') {
        if (msg.candidateId > highestId) {
            highestId = msg.candidateId;
            reportStateUpdate(highestId, 'updating');
        }
    }
}

// ============ DISTRIBUTED AGGREGATION ============

function runAggregation() {
    reportStateUpdate(myValue, 'aggregating');
    aggregationRound();
}

function aggregationRound() {
    if (isComplete) return;

    // Send partial sum to neighbors
    peerPorts.forEach((port, idx) => {
        sendToPeer(idx, {
            type: 'partial_sum',
            value: myValue,
            contributors: receivedFrom.size + 1,
            round: round
        });
        reportMessageSent(peerIds[idx], 'SUM');
    });

    round++;
    reportRoundComplete();

    setTimeout(() => {
        if (round < Math.ceil(Math.log2(totalPeers)) + 3) {
            aggregationRound();
        } else {
            completeAlgorithm();
        }
    }, messageDelay * 2);
}

function handleAggregateMessage(fromPeer, msg) {
    if (msg.type === 'partial_sum' && !receivedFrom.has(fromPeer)) {
        receivedFrom.add(fromPeer);
        myValue += msg.value;
        reportStateUpdate(myValue, 'combining');
    }
}

// ============ UTILITY FUNCTIONS ============

function sendToPeer(portIndex, message) {
    if (peerPorts[portIndex]) {
        setTimeout(() => {
            peerPorts[portIndex].postMessage(message);
        }, messageDelay);
    }
}

function selectRandomPeers(count) {
    const indices = [];
    const available = [...Array(peerIds.length).keys()];

    for (let i = 0; i < Math.min(count, available.length); i++) {
        const randIdx = Math.floor(Math.random() * available.length);
        indices.push(available[randIdx]);
        available.splice(randIdx, 1);
    }

    return indices;
}

function reportMessageSent(toPeer, msgType) {
    self.postMessage({
        type: 'message_sent',
        from: peerId,
        to: toPeer,
        msgType: msgType,
        time: performance.now() - startTime
    });
}

function reportStateUpdate(value, status) {
    self.postMessage({
        type: 'state_update',
        peerId,
        value,
        status,
        isLeader
    });
}

function reportRoundComplete() {
    self.postMessage({
        type: 'round_complete',
        peerId,
        round
    });
}

function completeAlgorithm() {
    if (isComplete) return;
    isComplete = true;

    let finalValue;
    switch (algorithm) {
        case 'gossip':
            finalValue = myData ? myData.length : 0;
            break;
        case 'consensus':
            finalValue = myValue;
            break;
        case 'election':
            finalValue = highestId;
            break;
        case 'aggregate':
            finalValue = myValue;
            break;
    }

    self.postMessage({
        type: 'complete',
        peerId,
        finalValue,
        isLeader,
        rounds: round,
        messagesReceived: receivedFrom.size
    });
}
