(() => {
  // KS entrega las opciones del plugin en el fragmento de la URL.
  const o = Object.assign(
    {state: 'idle', eye: '#35E0FF', bg: '#000000', listen: '#7CFF8A', think: '#FFC857', speak: '#FF8AD8',
     size: 100, mouth: false, sleepMin: 10, prev: ''},
    JSON.parse(decodeURIComponent(location.hash.slice(1) || '%7B%7D')));
  const f = document.getElementById('face'), fxBox = f.querySelector('.fx'), root = document.documentElement.style;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const later = (fn, ms) => setTimeout(fn, ms);
  const cls = (c, on) => f.classList.toggle(c, on);
  const on = (...c) => c.forEach(x => f.classList.add(x));
  const look = (x, y) => { f.style.setProperty('--lx', x + 'vmin'); f.style.setProperty('--ly', y + 'vmin'); };
  const blink = () => { cls('blink', true); later(() => cls('blink', false), 130); };
  const fx = (ch, color) => {
    const s = document.createElement('span');
    s.textContent = ch; s.style.left = rnd(0, 8) + 'vmin'; s.style.setProperty('--dx', rnd(-3, 9) + 'vmin');
    if (color) s.style.color = color;
    fxBox.appendChild(s); later(() => s.remove(), 2600);
  };

  const col = st => ({listening: o.listen, thinking: o.think, speaking: o.speak}[st] || o.eye);
  const prev = o.prev || o.state;
  root.setProperty('--bg', o.bg);
  root.setProperty('--s', o.size / 100);
  root.setProperty('--eye', col(prev));
  f.classList.add(prev);

  // Actividades del reposo. Cada una devuelve cuánto dura, para encadenar la siguiente.
  const reset = () => { f.className = o.state; look(0, 0); };
  const act = (ms, fn) => { fn(); later(reset, ms); return ms + 500; };
  const pink = '#ff6fa5';
  const A = {
    around: () => act(3600, () => {
      look(-7, -1); later(() => look(7, -1), 1100); later(() => look(0, -5), 2300); }),
    whistle: () => act(4200, () => {
      on('b-up', 'm-o');
      for (let i = 0; i < 6; i++) later(() => { fx(i % 2 ? '♫' : '♪'); look(i % 2 ? 7 : 4, -3); }, 300 + i * 650); }),
    hum: () => act(4000, () => {
      on('happy', 'm-smile');
      for (let i = 0; i < 8; i++) later(() => { look(i % 2 ? -3 : 3, 0); if (i % 2) fx('♪'); }, i * 480); }),
    dance: () => act(4000, () => {
      on('happy', 'm-smile');
      for (let i = 0; i < 10; i++) later(() => { look(i % 2 ? -4 : 4, i % 2 ? -2 : 1); if (i % 3 === 0) fx('♫'); }, i * 400); }),
    yawn: () => act(2400, () => { on('b-sad', 'squint', 'm-yawn'); later(blink, 1900); }),
    love: () => act(3200, () => {
      on('happy', 'blush', 'm-smile');
      for (let i = 0; i < 4; i++) later(() => fx('♥', pink), i * 600); }),
    wink: () => act(1800, () => { on('wink', 'm-smile', 'b-up'); later(() => fx('✦'), 300); }),
    bored: () => act(4200, () => {
      on('squint', 'b-sad');
      [[-6, -5], [0, -7], [6, -5], [0, 2]].forEach((p, i) => later(() => look(p[0], p[1]), i * 600));
      later(() => fx('…'), 2600); }),
    surprise: () => act(2200, () => { on('wide', 'b-up', 'm-o'); look(0, -2); fx('!'); }),
    curious: () => act(3200, () => {
      on('wide', 'b-up'); look(8, -3); fx('?'); later(() => look(-8, -3), 1500); })
  };
  const keys = Object.keys(A);

  const scenes = {
    idle() {
      const t0 = Date.now(); let last = '';
      (function loop() {
        if (o.sleepMin > 0 && Date.now() - t0 > o.sleepMin * 60000) {
          later(() => { reset(); cls('sleep', true); look(0, 2); }, A.yawn());
          return;
        }
        const r = Math.random(); let d;
        if (r < .4) { blink(); if (Math.random() < .3) later(blink, 260); d = rnd(1500, 3000); }
        else if (r < .55) { look(rnd(-6, 6), rnd(-3, 3)); later(() => look(0, 0), rnd(900, 1600)); d = rnd(1800, 3000); }
        else {
          let k; do { k = keys[Math.floor(Math.random() * keys.length)]; } while (k === last);
          last = k; d = A[k]();
        }
        later(loop, d);
      })();
    },
    listening() {
      look(0, -4);
      (function loop() { blink(); later(loop, rnd(3000, 5000)); })();
    },
    thinking() {
      let side = 1;
      (function loop() { look(7 * side, -5); side = -side; later(loop, 900); })();
    },
    speaking() {
      if (o.mouth) setInterval(() => root.setProperty('--mh', rnd(1, 5)), 130);
      (function loop() { cls('happy', true); later(() => cls('happy', false), 450); later(loop, rnd(1500, 3000)); })();
    }
  };
  // Dos fotogramas con el aspecto anterior y luego el nuevo, para que las transiciones CSS se vean.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    f.classList.remove(prev); f.classList.add(o.state);
    root.setProperty('--eye', col(o.state));
    document.body.classList.toggle('mouth-on', !!o.mouth && o.state === 'speaking');
    (scenes[o.state] || scenes.idle)();
  }));
})();
