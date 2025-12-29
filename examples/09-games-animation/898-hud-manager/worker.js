let hp = 100, maxHp = 100, mp = 50, maxMp = 50, xp = 0, level = 1;
onmessage = (e) => {
  if (e.data.type === 'damage') hp = Math.max(0, hp - 20);
  else if (e.data.type === 'heal') hp = Math.min(maxHp, hp + 30);
  else if (e.data.type === 'mana') mp = Math.max(0, mp - 10);
  else if (e.data.type === 'xp') { xp += 25; if (xp >= 100) { xp = 0; level++; maxHp += 10; maxMp += 5; hp = maxHp; mp = maxMp; } }
  postMessage({ hp, maxHp, mp, maxMp, xp, level });
};
