/**
 * Skeletal Animation - Web Worker
 */
let time = 0;
let interval = null;

// Simple skeleton structure
const skeleton = {
    spine: { length: 80 },
    head: { length: 30 },
    leftArm: { upper: 40, lower: 35 },
    rightArm: { upper: 40, lower: 35 },
    leftLeg: { upper: 50, lower: 45 },
    rightLeg: { upper: 50, lower: 45 }
};

self.onmessage = function(e) {
    if (e.data.type === 'START') {
        time = 0;
        interval = setInterval(update, 1000 / 60);
    }
};

function update() {
    time += 0.05;
    const bones = [];

    // Spine
    const spineAngle = Math.sin(time * 2) * 0.1;
    const hipY = 50;
    const shoulderY = hipY - skeleton.spine.length;

    bones.push({ x1: 0, y1: hipY, x2: 0, y2: shoulderY });

    // Head
    bones.push({ x1: 0, y1: shoulderY, x2: Math.sin(time) * 5, y2: shoulderY - skeleton.head.length });

    // Arms
    const armSwing = Math.sin(time * 3) * 0.5;
    const leftElbowX = -skeleton.leftArm.upper * Math.sin(armSwing + 0.5);
    const leftElbowY = shoulderY + skeleton.leftArm.upper * Math.cos(armSwing + 0.5);
    bones.push({ x1: 0, y1: shoulderY, x2: leftElbowX, y2: leftElbowY });
    bones.push({ x1: leftElbowX, y1: leftElbowY, x2: leftElbowX - skeleton.leftArm.lower * 0.7, y2: leftElbowY + skeleton.leftArm.lower * 0.7 });

    const rightElbowX = skeleton.rightArm.upper * Math.sin(-armSwing + 0.5);
    const rightElbowY = shoulderY + skeleton.rightArm.upper * Math.cos(-armSwing + 0.5);
    bones.push({ x1: 0, y1: shoulderY, x2: rightElbowX, y2: rightElbowY });
    bones.push({ x1: rightElbowX, y1: rightElbowY, x2: rightElbowX + skeleton.rightArm.lower * 0.7, y2: rightElbowY + skeleton.rightArm.lower * 0.7 });

    // Legs
    const legSwing = Math.sin(time * 3) * 0.4;
    const leftKneeX = -skeleton.leftLeg.upper * Math.sin(legSwing) * 0.5;
    const leftKneeY = hipY + skeleton.leftLeg.upper * Math.cos(legSwing * 0.5);
    bones.push({ x1: -15, y1: hipY, x2: leftKneeX - 15, y2: leftKneeY });
    bones.push({ x1: leftKneeX - 15, y1: leftKneeY, x2: leftKneeX - 15, y2: leftKneeY + skeleton.leftLeg.lower });

    const rightKneeX = skeleton.rightLeg.upper * Math.sin(-legSwing) * 0.5;
    const rightKneeY = hipY + skeleton.rightLeg.upper * Math.cos(-legSwing * 0.5);
    bones.push({ x1: 15, y1: hipY, x2: rightKneeX + 15, y2: rightKneeY });
    bones.push({ x1: rightKneeX + 15, y1: rightKneeY, x2: rightKneeX + 15, y2: rightKneeY + skeleton.rightLeg.lower });

    self.postMessage({ type: 'BONES', payload: bones });
}
