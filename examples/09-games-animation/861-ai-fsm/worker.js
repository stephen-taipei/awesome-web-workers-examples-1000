/**
 * AI FSM - Web Worker
 */
const states = { IDLE: 'IDLE', PATROL: 'PATROL', CHASE: 'CHASE', FLEE: 'FLEE' };
let currentState = states.IDLE;
let ai = { x: 400, y: 250, angle: 0, speed: 2 };
let patrolPoints = [];
let currentPatrolIndex = 0;
let stateTimer = 0;
let width = 800, height = 500;
let interval = null;

self.onmessage = function(e) {
    if (e.data.type === 'START') {
        width = e.data.payload.width;
        height = e.data.payload.height;
        patrolPoints = [
            { x: 100, y: 100 }, { x: 700, y: 100 },
            { x: 700, y: 400 }, { x: 100, y: 400 }
        ];
        ai = { x: patrolPoints[0].x, y: patrolPoints[0].y, angle: 0, speed: 2 };
        currentState = states.PATROL;
        stateTimer = 0;
        if (interval) clearInterval(interval);
        interval = setInterval(update, 1000 / 60);
    }
};

function update() {
    stateTimer++;

    switch (currentState) {
        case states.IDLE:
            if (stateTimer > 120) {
                currentState = states.PATROL;
                stateTimer = 0;
            }
            break;

        case states.PATROL:
            const target = patrolPoints[currentPatrolIndex];
            const dx = target.x - ai.x;
            const dy = target.y - ai.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 10) {
                currentPatrolIndex = (currentPatrolIndex + 1) % patrolPoints.length;
                if (Math.random() < 0.3) {
                    currentState = states.IDLE;
                    stateTimer = 0;
                }
            } else {
                ai.angle = Math.atan2(dy, dx);
                ai.x += Math.cos(ai.angle) * ai.speed;
                ai.y += Math.sin(ai.angle) * ai.speed;
            }

            if (Math.random() < 0.002) {
                currentState = states.CHASE;
                stateTimer = 0;
            }
            break;

        case states.CHASE:
            ai.speed = 4;
            ai.angle += 0.1;
            ai.x += Math.cos(ai.angle) * ai.speed;
            ai.y += Math.sin(ai.angle) * ai.speed;

            ai.x = Math.max(20, Math.min(width - 20, ai.x));
            ai.y = Math.max(20, Math.min(height - 20, ai.y));

            if (stateTimer > 180) {
                currentState = states.FLEE;
                ai.speed = 3;
                stateTimer = 0;
            }
            break;

        case states.FLEE:
            ai.x += Math.cos(ai.angle) * ai.speed;
            ai.y += Math.sin(ai.angle) * ai.speed;

            if (ai.x < 20 || ai.x > width - 20 || ai.y < 20 || ai.y > height - 20) {
                ai.angle += Math.PI;
            }
            ai.x = Math.max(20, Math.min(width - 20, ai.x));
            ai.y = Math.max(20, Math.min(height - 20, ai.y));

            if (stateTimer > 120) {
                currentState = states.PATROL;
                ai.speed = 2;
                stateTimer = 0;
            }
            break;
    }

    self.postMessage({
        type: 'STATE',
        payload: { ...ai, currentState, patrolPoints }
    });
}
