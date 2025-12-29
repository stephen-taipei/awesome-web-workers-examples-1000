/**
 * Sprite Animator - Web Worker
 */
const animations = {
    idle: { frames: 4, loop: true },
    walk: { frames: 8, loop: true },
    run: { frames: 6, loop: true },
    jump: { frames: 5, loop: false }
};

let currentAnimation = 'idle';
let frameIndex = 0;
let fps = 10;
let interval = null;

self.onmessage = function(e) {
    const { type, payload } = e.data;
    switch (type) {
        case 'START':
            currentAnimation = payload.animation;
            fps = payload.fps;
            frameIndex = 0;
            startAnimation();
            break;
        case 'ANIMATION':
            currentAnimation = payload;
            frameIndex = 0;
            break;
        case 'SPEED':
            fps = payload;
            if (interval) { clearInterval(interval); startAnimation(); }
            break;
    }
};

function startAnimation() {
    if (interval) clearInterval(interval);
    interval = setInterval(updateFrame, 1000 / fps);
}

function updateFrame() {
    const anim = animations[currentAnimation];
    frameIndex = (frameIndex + 1) % anim.frames;

    const t = frameIndex / anim.frames;
    let offsetY = 0, limbs = [];

    if (currentAnimation === 'idle') {
        offsetY = Math.sin(t * Math.PI * 2) * 5;
        limbs = [
            { x: -20, y: 80, w: 15, h: 30 },
            { x: 105, y: 80, w: 15, h: 30 }
        ];
    } else if (currentAnimation === 'walk') {
        offsetY = Math.abs(Math.sin(t * Math.PI * 2)) * 10;
        const legOffset = Math.sin(t * Math.PI * 2) * 20;
        limbs = [
            { x: -20, y: 80 + legOffset, w: 15, h: 30 },
            { x: 105, y: 80 - legOffset, w: 15, h: 30 }
        ];
    } else if (currentAnimation === 'run') {
        offsetY = Math.abs(Math.sin(t * Math.PI * 2)) * 20;
        const legOffset = Math.sin(t * Math.PI * 2) * 30;
        limbs = [
            { x: -25, y: 80 + legOffset, w: 15, h: 35 },
            { x: 110, y: 80 - legOffset, w: 15, h: 35 }
        ];
    } else if (currentAnimation === 'jump') {
        offsetY = -Math.sin(t * Math.PI) * 50;
        limbs = [
            { x: -10, y: 90, w: 15, h: 25 },
            { x: 95, y: 90, w: 15, h: 25 }
        ];
    }

    self.postMessage({
        type: 'FRAME',
        payload: {
            index: frameIndex,
            data: {
                color: '#4a9eff',
                offsetX: 0,
                offsetY,
                limbs
            }
        }
    });
}
