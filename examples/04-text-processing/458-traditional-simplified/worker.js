// Demo dictionary strings
const simplified = "万与丑专业丛东丝丢两严丧个丬丰临为丽举么义乌乐乔乘九习乡书买乱争于亏云亘亚产亩亲亵亸亿什仁仅仆仇今介仍从仑仓仔仕他付仙仪仔件价任份仿企伊伍伎伏伐休众优伙会伞伟传伤伦伪伫体余佣佥侠侣侥侦侧侨侩侪侬俣俦俨俩俪俭债倾偬娄娇";
const traditional = "萬與醜專業叢東絲丟兩嚴喪個爿豐臨為麗舉麼義烏樂喬乘九習鄉書買亂爭於虧雲亙亞產畝親褻嚲億什仁僅僕仇今介仍從侖倉仔仕他付仙儀仔件價任份仿企伊伍伎伏伐休眾優夥會傘偉傳傷倫偽佇體餘傭僉俠侶僥偵側僑儈儕儂俁儔儼倆儷儉債傾傯婁嬌";

// Map construction
const s2tMap = new Map();
const t2sMap = new Map();

for (let i = 0; i < simplified.length; i++) {
    const s = simplified[i];
    const t = traditional[i] || s; // Fallback if lengths mismatch, though they shouldn't
    s2tMap.set(s, t);
    t2sMap.set(t, s);
}

// Add a few common phrases or special cases manually if needed for demo
s2tMap.set('忧', '憂'); t2sMap.set('憂', '忧');
s2tMap.set('郁', '鬱'); t2sMap.set('鬱', '郁');
s2tMap.set('台', '臺'); t2sMap.set('臺', '台'); // or 台->台 depending on context, using classic
s2tMap.set('湾', '灣'); t2sMap.set('灣', '湾');
s2tMap.set('龟', '龜'); t2sMap.set('龜', '龟');

self.onmessage = function(e) {
    const { text, mode } = e.data;
    const startTime = performance.now();

    let convertedText = '';
    let count = 0;

    const map = mode === 's2t' ? s2tMap : t2sMap;

    for (const char of text) {
        if (map.has(char)) {
            convertedText += map.get(char);
            count++;
        } else {
            convertedText += char;
        }
    }

    const endTime = performance.now();

    self.postMessage({
        type: 'result',
        convertedText: convertedText,
        count: count,
        time: endTime - startTime
    });
};
