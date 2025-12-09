// Quaternion Rotation Worker

// Base Cube Vertices (centered at origin)
const baseVertices = [
    {x:-1, y:-1, z:-1}, {x:1, y:-1, z:-1}, {x:1, y:1, z:-1}, {x:-1, y:1, z:-1}, // Back face
    {x:-1, y:-1, z:1},  {x:1, y:-1, z:1},  {x:1, y:1, z:1},  {x:-1, y:1, z:1}   // Front face
];

const faces = [
    [0, 1, 2, 3], // Back
    [4, 5, 6, 7], // Front
    [0, 4, 7, 3], // Left
    [1, 5, 6, 2], // Right
    [0, 1, 5, 4], // Bottom
    [3, 2, 6, 7]  // Top
];

let currentQ = { w: 1, x: 0, y: 0, z: 0 }; // Identity

self.onmessage = async function(e) {
    const { command } = e.data;

    if (command === 'init') {
        sendFrame(currentQ);
    } 
    else if (command === 'animate') {
        const { targetAxis, targetAngleDeg, duration } = e.data;
        
        // Create Target Quaternion from Axis-Angle
        const targetQ = fromAxisAngle(targetAxis, targetAngleDeg);
        const startQ = { ...currentQ };
        
        const startTime = performance.now();
        
        while (true) {
            const now = performance.now();
            let t = (now - startTime) / duration;
            
            if (t >= 1) {
                t = 1;
                currentQ = targetQ;
                sendFrame(currentQ);
                self.postMessage({ type: 'done' });
                break;
            }
            
            // Slerp (Spherical Linear Interpolation)
            currentQ = slerp(startQ, targetQ, t);
            sendFrame(currentQ);
            
            // 60 FPS loop
            await new Promise(r => setTimeout(r, 16));
        }
    }
};

function sendFrame(q) {
    // Rotate all vertices by q
    const rotatedVertices = baseVertices.map(v => rotateVector(v, q));
    self.postMessage({
        type: 'frame',
        data: {
            vertices: rotatedVertices,
            faces: faces,
            q: q
        }
    });
}

// --- Quaternion Math ---

function fromAxisAngle(axis, angleDeg) {
    // Normalize axis
    const len = Math.sqrt(axis.x*axis.x + axis.y*axis.y + axis.z*axis.z);
    const nx = len > 0 ? axis.x/len : 1;
    const ny = len > 0 ? axis.y/len : 0;
    const nz = len > 0 ? axis.z/len : 0;
    
    const rad = angleDeg * Math.PI / 180;
    const s = Math.sin(rad / 2);
    
    return {
        w: Math.cos(rad / 2),
        x: nx * s,
        y: ny * s,
        z: nz * s
    };
}

function rotateVector(v, q) {
    // Rotate vector v by quaternion q
    // p' = q * p * q^-1 (where p is vector as pure quaternion [0, v])
    // Optimized formula:
    // v + 2.0 * cross(q.xyz, cross(q.xyz, v) + q.w * v)
    
    const qx = q.x, qy = q.y, qz = q.z, qw = q.w;
    const vx = v.x, vy = v.y, vz = v.z;
    
    // t = 2 * cross(q.xyz, v)
    const tx = 2 * (qy * vz - qz * vy);
    const ty = 2 * (qz * vx - qx * vz);
    const tz = 2 * (qx * vy - qy * vx);
    
    // v' = v + qw * t + cross(q.xyz, t)
    return {
        x: vx + qw * tx + (qy * tz - qz * ty),
        y: vy + qw * ty + (qz * tx - qx * tz),
        z: vz + qw * tz + (qx * ty - qy * tx)
    };
}

function slerp(qa, qb, t) {
    // Spherical Linear Interpolation
    // cosTheta = dot(qa, qb)
    let cosHalfTheta = qa.w*qb.w + qa.x*qb.x + qa.y*qb.y + qa.z*qb.z;
    
    // If negative dot, flip one quaternion to take shorter path
    let qb_w = qb.w, qb_x = qb.x, qb_y = qb.y, qb_z = qb.z;
    if (cosHalfTheta < 0) {
        qb_w = -qb.w; qb_x = -qb.x; qb_y = -qb.y; qb_z = -qb.z;
        cosHalfTheta = -cosHalfTheta;
    }
    
    // If qa=qb or very close, just linear interp
    if (Math.abs(cosHalfTheta) >= 1.0) {
        return qa;
    }
    
    const halfTheta = Math.acos(cosHalfTheta);
    const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta*cosHalfTheta);
    
    // If theta = 180, result is undefined, fallback
    if (Math.abs(sinHalfTheta) < 0.001) {
        return {
            w: (qa.w * 0.5 + qb_w * 0.5),
            x: (qa.x * 0.5 + qb_x * 0.5),
            y: (qa.y * 0.5 + qb_y * 0.5),
            z: (qa.z * 0.5 + qb_z * 0.5)
        };
    }
    
    const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
    const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
    
    return {
        w: (qa.w * ratioA + qb_w * ratioB),
        x: (qa.x * ratioA + qb_x * ratioB),
        y: (qa.y * ratioA + qb_y * ratioB),
        z: (qa.z * ratioA + qb_z * ratioB)
    };
}
