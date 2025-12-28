self.onmessage = function(e) {
    const { player, enemy } = e.data;
    const log = [];
    let pHp = player.hp, eHp = enemy.hp;
    let turn = 1;

    while (pHp > 0 && eHp > 0) {
        // Player attacks
        const pDmg = Math.max(1, player.atk - enemy.def + Math.floor(Math.random() * 10) - 5);
        eHp -= pDmg;
        log.push(`Turn ${turn}: Player deals ${pDmg} damage (Enemy HP: ${Math.max(0, eHp)})`);

        if (eHp <= 0) break;

        // Enemy attacks
        const eDmg = Math.max(1, enemy.atk - player.def + Math.floor(Math.random() * 10) - 5);
        pHp -= eDmg;
        log.push(`Turn ${turn}: Enemy deals ${eDmg} damage (Player HP: ${Math.max(0, pHp)})`);

        turn++;
        if (turn > 100) { log.push('Battle timeout!'); break; }
    }

    self.postMessage({ log, winner: pHp > 0 ? 'Player' : 'Enemy' });
};
