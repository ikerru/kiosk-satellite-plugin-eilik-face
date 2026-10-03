(() => {
  // KS entrega las opciones del plugin en el fragmento de la URL.
  const o = Object.assign(
    {state: 'idle', eye: '#35E0FF', bg: '#000000', listen: '#7CFF8A', think: '#FFC857', speak: '#FF8AD8',
     size: 100, mouth: false, sleepMin: 10, prev: ''},
    JSON.parse(decodeURIComponent(location.hash.slice(1) || '%7B%7D')));
  const f = document.getElementById('face'), root = document.documentElement.style;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const later = (fn, ms) => setTimeout(fn, ms);
  const cls = (c, on) => f.classList.toggle(c, on);
  const look = (x, y) => { f.style.setProperty('--lx', x + 'vmin'); f.style.setProperty('--ly', y + 'vmin'); };
  const blink = () => { cls('blink', true); later(() => cls('blink', false), 130); };

  const col = st => ({listening: o.listen, thinking: o.think, speaking: o.speak}[st] || o.eye);
  const prev = o.prev || o.state;
  root.setProperty('--bg', o.bg);
  root.setProperty('--s', o.size / 100);
  root.setProperty('--eye', col(prev));
  f.classList.add(prev);

  const scenes = {
    idle() {
      const t0 = Date.now();
      (function loop() {
        if (o.sleepMin > 0 && Date.now() - t0 > o.sleepMin * 60000) { cls('sleep', true); look(0, 2); return; }
        const a = Math.random();
        if (a < .45) { blink(); if (Math.random() < .25) later(blink, 260); }
        else if (a < .8) { look(rnd(-6, 6), rnd(-3, 3)); later(() => look(0, 0), rnd(900, 1800)); }
        else { cls('happy', true); later(() => cls('happy', false), 1800); }
        later(loop, rnd(1800, 4200));
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
