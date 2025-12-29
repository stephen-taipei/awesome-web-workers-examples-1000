/**
 * Dungeon Generator - Web Worker
 * BSP Tree based dungeon generation
 */

let dungeon = [];
let rooms = [];
let corridorCount = 0;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'GENERATE') {
        generateDungeon(payload);
    }
};

function generateDungeon(config) {
    const startTime = performance.now();
    const { width, height, minRoomSize, maxDepth } = config;

    // Initialize dungeon with walls
    dungeon = [];
    rooms = [];
    corridorCount = 0;

    for (let y = 0; y < height; y++) {
        dungeon[y] = [];
        for (let x = 0; x < width; x++) {
            dungeon[y][x] = 0; // Wall
        }
    }

    // Create BSP tree
    const root = {
        x: 0, y: 0,
        width, height,
        left: null, right: null,
        room: null
    };

    splitNode(root, minRoomSize, maxDepth, 0);

    // Create rooms in leaf nodes
    createRooms(root, minRoomSize);

    // Connect rooms
    connectRooms(root);

    const endTime = performance.now();

    self.postMessage({
        type: 'COMPLETE',
        payload: {
            dungeon: dungeon.map(row => [...row]),
            rooms,
            roomCount: rooms.length,
            corridorCount,
            time: endTime - startTime
        }
    });
}

function splitNode(node, minSize, maxDepth, depth) {
    if (depth >= maxDepth) return;

    const minDimension = minSize * 2 + 3;

    // Determine split direction
    let splitH;
    if (node.width > node.height * 1.25) {
        splitH = false;
    } else if (node.height > node.width * 1.25) {
        splitH = true;
    } else {
        splitH = Math.random() > 0.5;
    }

    if (splitH) {
        if (node.height < minDimension) return;

        const split = minSize + 2 + Math.floor(Math.random() * (node.height - minDimension));

        node.left = {
            x: node.x, y: node.y,
            width: node.width, height: split,
            left: null, right: null, room: null
        };
        node.right = {
            x: node.x, y: node.y + split,
            width: node.width, height: node.height - split,
            left: null, right: null, room: null
        };
    } else {
        if (node.width < minDimension) return;

        const split = minSize + 2 + Math.floor(Math.random() * (node.width - minDimension));

        node.left = {
            x: node.x, y: node.y,
            width: split, height: node.height,
            left: null, right: null, room: null
        };
        node.right = {
            x: node.x + split, y: node.y,
            width: node.width - split, height: node.height,
            left: null, right: null, room: null
        };
    }

    splitNode(node.left, minSize, maxDepth, depth + 1);
    splitNode(node.right, minSize, maxDepth, depth + 1);
}

function createRooms(node, minSize) {
    if (node.left || node.right) {
        if (node.left) createRooms(node.left, minSize);
        if (node.right) createRooms(node.right, minSize);
    } else {
        // Leaf node - create room
        const roomWidth = minSize + Math.floor(Math.random() * (node.width - minSize - 2));
        const roomHeight = minSize + Math.floor(Math.random() * (node.height - minSize - 2));
        const roomX = node.x + 1 + Math.floor(Math.random() * (node.width - roomWidth - 2));
        const roomY = node.y + 1 + Math.floor(Math.random() * (node.height - roomHeight - 2));

        node.room = { x: roomX, y: roomY, width: roomWidth, height: roomHeight };
        rooms.push(node.room);

        // Carve room
        for (let y = roomY; y < roomY + roomHeight; y++) {
            for (let x = roomX; x < roomX + roomWidth; x++) {
                if (y >= 0 && y < dungeon.length && x >= 0 && x < dungeon[0].length) {
                    dungeon[y][x] = 1; // Floor
                }
            }
        }
    }
}

function connectRooms(node) {
    if (!node.left || !node.right) return;

    const leftRoom = getRoom(node.left);
    const rightRoom = getRoom(node.right);

    if (leftRoom && rightRoom) {
        const x1 = Math.floor(leftRoom.x + leftRoom.width / 2);
        const y1 = Math.floor(leftRoom.y + leftRoom.height / 2);
        const x2 = Math.floor(rightRoom.x + rightRoom.width / 2);
        const y2 = Math.floor(rightRoom.y + rightRoom.height / 2);

        createCorridor(x1, y1, x2, y2);
        corridorCount++;
    }

    connectRooms(node.left);
    connectRooms(node.right);
}

function getRoom(node) {
    if (node.room) return node.room;
    if (node.left) {
        const room = getRoom(node.left);
        if (room) return room;
    }
    if (node.right) {
        const room = getRoom(node.right);
        if (room) return room;
    }
    return null;
}

function createCorridor(x1, y1, x2, y2) {
    // L-shaped corridor
    let x = x1;
    let y = y1;

    while (x !== x2) {
        if (y >= 0 && y < dungeon.length && x >= 0 && x < dungeon[0].length) {
            if (dungeon[y][x] === 0) dungeon[y][x] = 2;
        }
        x += x < x2 ? 1 : -1;
    }

    while (y !== y2) {
        if (y >= 0 && y < dungeon.length && x >= 0 && x < dungeon[0].length) {
            if (dungeon[y][x] === 0) dungeon[y][x] = 2;
        }
        y += y < y2 ? 1 : -1;
    }
}
