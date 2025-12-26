// 3-Way Merge Worker
// Implements a simplified text 3-way merge logic

self.onmessage = function(e) {
    const { base, local, remote } = e.data;

    try {
        const startTime = performance.now();

        const result = merge3(base, local, remote);

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                result: result.text,
                conflictCount: result.conflicts
            },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function merge3(base, local, remote) {
    // 1. Compute LCS/Diff for Base->Local and Base->Remote
    const diffLocal = computeDiff(base.split(/\r?\n/), local.split(/\r?\n/));
    const diffRemote = computeDiff(base.split(/\r?\n/), remote.split(/\r?\n/));

    // 2. Align chunks
    // This is complex. A simpler approach for line-based 3-way merge without full Diff3 algorithm:
    // Iterate chunks.
    // If chunk matches in base & local => use remote?
    // If chunk matches in base & remote => use local?
    // If chunk changed in both local & remote => Conflict? (unless changes are identical)

    // Let's implement a simplified "Diff3" logic using line comparison.
    // We treat the file as a sequence of lines.

    // We rely on the Diff algorithm from 424. But we need indices.

    // Strategy:
    // 1. Get diff of Base->Local
    // 2. Get diff of Base->Remote
    // 3. Iterate through Base lines and apply edits.

    // Problem: Insertions happen "between" base lines.

    // A robust way:
    // Compute LCS of (Base, Local) -> alignedLocal
    // Compute LCS of (Base, Remote) -> alignedRemote
    // "Aligned" means inserting gaps (nulls) so indices match Base.
    // Base:   A B C
    // Local:  A X C  -> Match A, Subst B->X, Match C
    // Remote: A B Y  -> Match A, Match B, Subst C->Y

    // Let's go with a simpler chunk-based approach usually found in simple merge tools.
    // 1. Compute Diff(Base, Local) -> Operations
    // 2. Compute Diff(Base, Remote) -> Operations
    // 3. Map operations to Base line numbers.

    const linesBase = base.split(/\r?\n/);
    const linesLocal = local.split(/\r?\n/);
    const linesRemote = remote.split(/\r?\n/);

    // We need indices relative to Base.
    // Diff returns: { type: 'same'|'add'|'del', oldLine, newLine ... }

    // Let's assume we can detect modifications per line of Base.
    // changesLocal[baseLineIndex] = { type: 'mod', content: [...] } or { type: 'del' }
    // insertsLocal[baseLineIndex] = [...] (inserted AFTER base line)

    // This assumes LCS aligned everything perfectly.

    const opsLocal = getChanges(linesBase, linesLocal);
    const opsRemote = getChanges(linesBase, linesRemote);

    // Combine
    let output = [];
    let conflictCount = 0;

    // ops structure:
    // Map<baseIndex, Operation>
    // Operation: { type: 'del' } or { type: 'sub', text: [...] }
    // inserts: Map<baseIndex, [lines]> (Inserts AFTER this line. -1 for start)

    let i = 0;
    while (i < linesBase.length) {
        const opL = opsLocal.mod.get(i);
        const opR = opsRemote.mod.get(i);

        // Handle inserts BEFORE this line (at index i-1, but we handle "at i" as "before i")
        // My getChanges puts inserts relative to "after line X".
        // Inserts at start are "after line -1".

        // Let's handle inserts at "gap i" (before line i)
        const insL = opsLocal.ins.get(i - 1);
        const insR = opsRemote.ins.get(i - 1);

        if (insL || insR) {
            if (insL && !insR) {
                output.push(...insL);
            } else if (!insL && insR) {
                output.push(...insR);
            } else {
                // Both inserted something
                if (arraysEqual(insL, insR)) {
                    output.push(...insL);
                } else {
                    conflictCount++;
                    output.push('<<<<<<< LOCAL');
                    output.push(...insL);
                    output.push('=======');
                    output.push(...insR);
                    output.push('>>>>>>> REMOTE');
                }
            }
        }

        // Handle Line i
        if (!opL && !opR) {
            // Unchanged in both
            output.push(linesBase[i]);
        } else if (opL && !opR) {
            // Changed in Local only
            if (opL.type === 'sub') output.push(...opL.lines);
            // if del, do nothing
        } else if (!opL && opR) {
            // Changed in Remote only
            if (opR.type === 'sub') output.push(...opR.lines);
        } else {
            // Changed in BOTH
            // Check for equality
            const lContent = opL.type === 'sub' ? opL.lines : [];
            const rContent = opR.type === 'sub' ? opR.lines : [];
            const lType = opL.type;
            const rType = opR.type;

            if (lType === rType && arraysEqual(lContent, rContent)) {
                // Same change
                if (lType === 'sub') output.push(...lContent);
            } else {
                // Conflict
                conflictCount++;
                output.push('<<<<<<< LOCAL');
                if (lType === 'sub') output.push(...lContent);
                // (if del, imply empty)
                output.push('=======');
                if (rType === 'sub') output.push(...rContent);
                output.push('>>>>>>> REMOTE');
            }
        }

        i++;
    }

    // Handle trailing inserts (after last line)
    const insL = opsLocal.ins.get(linesBase.length - 1);
    const insR = opsRemote.ins.get(linesBase.length - 1);

    if (insL || insR) {
        if (insL && !insR) {
            output.push(...insL);
        } else if (!insL && insR) {
            output.push(...insR);
        } else {
            if (arraysEqual(insL, insR)) {
                output.push(...insL);
            } else {
                conflictCount++;
                output.push('<<<<<<< LOCAL');
                output.push(...insL);
                output.push('=======');
                output.push(...insR);
                output.push('>>>>>>> REMOTE');
            }
        }
    }

    return { text: output.join('\\n'), conflicts: conflictCount };
}

function getChanges(base, modified) {
    // Re-use LCS logic but organize into mods/inserts per base line
    const diffs = computeDiffResult(base, modified);

    const mod = new Map(); // index -> { type: 'del' | 'sub', lines: [] }
    const ins = new Map(); // index -> [] (inserts after index)

    // We need to group contiguous changes
    // Diffs: { type: 'same'|'add'|'del', oldLine (1-based), newLine }

    let i = 0;
    while(i < diffs.length) {
        const d = diffs[i];

        if (d.type === 'same') {
            i++;
        } else if (d.type === 'add') {
            // Insertion
            // It belongs "after" the previous 'same' line oldIndex.
            // Or "before" the next 'same' line oldIndex.
            // Let's find the base line index it attaches to.

            // Find previous 'same' or 'del' to anchor
            let prevBaseIdx = -1; // -1 means start of file
            // Look backward
            for(let k=i-1; k>=0; k--) {
                if(diffs[k].oldLine !== '') {
                    prevBaseIdx = diffs[k].oldLine - 1; // 0-based
                    break;
                }
            }

            const addedLines = [];
            while(i < diffs.length && diffs[i].type === 'add') {
                addedLines.push(diffs[i].newText);
                i++;
            }

            // Merge with existing inserts if any (though LCS usually groups them)
            if (!ins.has(prevBaseIdx)) ins.set(prevBaseIdx, []);
            ins.get(prevBaseIdx).push(...addedLines);

        } else if (d.type === 'del') {
            // Deletion or Substitution
            const baseIdx = d.oldLine - 1;

            // Check if followed by add (Substitution)
            // But wait, LCS might interleave del/add differently.
            // Simplification: Treat all DELs as mods. If followed by ADD, include in mod.
            // But if just DEL, type='del'.

            // Actually, we want to know if Base Line X is deleted, or substituted.
            // We look ahead to see if there are Adds immediately following.
            // But strictly, Adds are inserts "between" lines.
            // Substitution is conceptual.

            // Let's just say line i is DELETED.
            // If there's an insert at i-1 (effectively "replacing" i), we can consider it substitution?
            // Merge logic handles Mod vs Mod. If Mod is "Del" vs "Subst", it's a conflict.

            // Let's iterate contiguous dels
            // Wait, getChanges map is per-line.

            mod.set(baseIdx, { type: 'del' });
            i++;
        }
    }

    // Post-pass: Convert Del + Insert-at-prev into Subst?
    // If mod[i] is DEL, and ins[i-1] exists.
    // Then mod[i] becomes SUBST with content ins[i-1], and we remove ins[i-1].
    // Note: ins[i-1] might be multiple lines replacing one line.

    for (let idx of mod.keys()) {
        if (mod.get(idx).type === 'del') {
            if (ins.has(idx - 1)) {
                const inserted = ins.get(idx - 1);
                mod.set(idx, { type: 'sub', lines: inserted });
                ins.delete(idx - 1);
            }
        }
    }

    return { mod, ins };
}

function arraysEqual(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

// Copied/Adapted LCS from 424
function computeDiffResult(lines1, lines2) {
    const N = lines1.length;
    const M = lines2.length;
    const dp = new Int32Array((N + 1) * (M + 1));

    for (let i = 1; i <= N; i++) {
        for (let j = 1; j <= M; j++) {
            if (lines1[i-1] === lines2[j-1]) {
                dp[i*(M+1) + j] = dp[(i-1)*(M+1) + (j-1)] + 1;
            } else {
                dp[i*(M+1) + j] = Math.max(dp[(i-1)*(M+1) + j], dp[i*(M+1) + (j-1)]);
            }
        }
    }

    let i = N;
    let j = M;
    const result = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && lines1[i-1] === lines2[j-1]) {
            result.push({ type: 'same', oldText: lines1[i-1], newText: lines2[j-1], oldLine: i, newLine: j });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i*(M+1) + (j-1)] >= dp[(i-1)*(M+1) + j])) {
            result.push({ type: 'add', oldText: '', newText: lines2[j-1], oldLine: '', newLine: j });
            j--;
        } else if (i > 0 && (j === 0 || dp[i*(M+1) + (j-1)] < dp[(i-1)*(M+1) + j])) {
            result.push({ type: 'del', oldText: lines1[i-1], newText: '', oldLine: i, newLine: '' });
            i--;
        }
    }
    return result.reverse();
}
