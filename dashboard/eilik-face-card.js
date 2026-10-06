// SPDX-License-Identifier: Apache-2.0
// Tarjeta Lovelace con la cara de Eilik. A diferencia del protector de pantalla, recibe el estado
// de Home Assistant en vivo, así que cambia de expresión sin recargar nada: las transiciones de
// color y forma se ven enteras.
//
// Instalación: copia este fichero a config/www/ y añádelo como recurso de Lovelace
// (Ajustes > Paneles de control > Recursos, tipo "Módulo JavaScript", URL /local/eilik-face-card.js).

const CSS = `
:host{--eye:#35E0FF;--bg:#000;--s:1;--u:1px;--mh:1.2;display:block}
.stage{position:relative;height:var(--h,300px);background:var(--bg);overflow:hidden;border-radius:var(--ha-card-border-radius,12px);display:grid;place-items:center}
/* Modo superpuesto: la tarjeta no ocupa sitio en la vista y la cara se dibuja sobre el panel,
   solo mientras dura el turno de voz. No intercepta toques en ningún momento. */
:host(.overlay){height:0;overflow:visible}
.stage.over{position:fixed;inset:0;height:auto;border-radius:0;z-index:1000;pointer-events:none;
  opacity:0;visibility:hidden;transition:opacity .35s ease,visibility .35s}
.stage.over.on{opacity:1;visibility:visible}
#face{position:relative;display:flex;gap:calc(14*var(--u)*var(--s));align-items:center;
  transform:translate(var(--lx,0),var(--ly,0));transition:transform .35s cubic-bezier(.3,1.4,.5,1)}

.eye{width:calc(20*var(--u)*var(--s));height:calc(28*var(--u)*var(--s));border-radius:calc(9*var(--u)*var(--s));
  background:var(--eye);filter:drop-shadow(0 0 calc(2*var(--u)) var(--eye));
  transition:transform .12s,height .3s,border-radius .3s,background-color .4s,border-width .3s,filter .4s}
.squint .eye{height:calc(14*var(--u)*var(--s))}
.wide .eye{transform:scale(1.15)}
.wink .eye:nth-child(1),.blink .eye{transform:scaleY(.08)}
.happy .eye{background:transparent;height:calc(13*var(--u)*var(--s));border:calc(3.4*var(--u)*var(--s)) solid var(--eye);
  border-bottom-width:0;border-radius:calc(12*var(--u)*var(--s)) calc(12*var(--u)*var(--s)) 0 0}
.sleep .eye{height:calc(2.6*var(--u)*var(--s));border-radius:calc(2*var(--u))}
.listening .eye{animation:pulse 1.1s ease-in-out infinite}
@keyframes pulse{50%{transform:scale(1.14)}}
.thinking .eye{height:calc(21*var(--u)*var(--s))}
.speaking .eye{animation:talk .42s ease-in-out infinite alternate}
@keyframes talk{to{transform:translateY(calc(-1.6*var(--u))) scaleY(.82)}}

.brow{position:absolute;top:calc(-7*var(--u)*var(--s));width:calc(17*var(--u)*var(--s));height:calc(2.4*var(--u)*var(--s));
  border-radius:calc(2*var(--u));background:var(--eye);opacity:0;transition:transform .3s,opacity .3s}
.brow.l{left:calc(1.5*var(--u)*var(--s))}.brow.r{right:calc(1.5*var(--u)*var(--s))}
.b-up .brow{opacity:1;transform:translateY(calc(-2.5*var(--u)))}
.b-sad .brow{opacity:1}.b-sad .brow.l{transform:rotate(-12deg)}.b-sad .brow.r{transform:rotate(12deg)}
.b-mad .brow{opacity:1}.b-mad .brow.l{transform:rotate(12deg)}.b-mad .brow.r{transform:rotate(-12deg)}
.cheek{position:absolute;top:calc(30*var(--u)*var(--s));width:calc(9*var(--u)*var(--s));height:calc(4.5*var(--u)*var(--s));
  border-radius:50%;background:#ff6fa5;opacity:0;transition:opacity .4s}
.cheek.l{left:calc(5*var(--u)*var(--s))}.cheek.r{right:calc(5*var(--u)*var(--s))}
.blush .cheek{opacity:.55}

.mouth,.dots,.z{display:none;position:absolute;left:50%}
.mouth{top:calc(100% + 7*var(--u));width:calc(10*var(--u)*var(--s));height:calc(var(--mh)*var(--u));
  background:var(--eye);border-radius:calc(2*var(--u));transform:translateX(-50%);transition:width .25s,height .25s,border-radius .25s}
.mouth-on .mouth,.m-o .mouth,.m-yawn .mouth,.m-smile .mouth{display:block}
.m-o .mouth{width:calc(4.5*var(--u)*var(--s));height:calc(4.5*var(--u)*var(--s));border-radius:50%;background:transparent;
  border:calc(1.3*var(--u)) solid var(--eye)}
.m-yawn .mouth{width:calc(9*var(--u)*var(--s));height:calc(12*var(--u)*var(--s));border-radius:50%}
.m-smile .mouth{width:calc(12*var(--u)*var(--s));height:calc(5*var(--u)*var(--s));background:transparent;
  border:calc(1.4*var(--u)) solid var(--eye);border-top:0;border-radius:0 0 calc(12*var(--u)) calc(12*var(--u))}

.dots{top:calc(-9*var(--u));transform:translateX(-50%);gap:calc(2*var(--u))}
.thinking .dots{display:flex}
.dots i{width:calc(2.4*var(--u));height:calc(2.4*var(--u));border-radius:50%;background:var(--eye);animation:dot 1s infinite}
.dots i:nth-child(2){animation-delay:.2s}.dots i:nth-child(3){animation-delay:.4s}
@keyframes dot{50%{transform:translateY(calc(-2*var(--u)));opacity:.4}}
.z{left:auto;right:calc(-8*var(--u));top:calc(-8*var(--u));color:var(--eye);font:700 calc(7*var(--u)) sans-serif;animation:zz 3s ease-in-out infinite}
.sleep .z{display:block}
@keyframes zz{50%{transform:translateY(calc(-3*var(--u)));opacity:.3}}
.fx{position:absolute;left:62%;top:calc(100% + 2*var(--u));pointer-events:none}
.fx span{position:absolute;color:var(--eye);font:700 calc(7*var(--u)) sans-serif;opacity:0;animation:fl 2.4s ease-out forwards}
@keyframes fl{15%{opacity:1}100%{opacity:0;transform:translate(var(--dx),calc(-18*var(--u)))}}
@media (prefers-reduced-motion:reduce){.eye,.dots i,.z,.fx span{animation:none!important}}
`;

const HTML = `<div class="stage"><div id="face">
  <div class="eye"></div><div class="eye"></div>
  <div class="brow l"></div><div class="brow r"></div>
  <div class="cheek l"></div><div class="cheek r"></div>
  <div class="mouth"></div>
  <div class="dots"><i></i><i></i><i></i></div>
  <div class="z">z</div>
  <div class="fx"></div>
</div></div>`;

// Estados de assist_satellite que distingue la cara.
const FACE = {listening: 'listening', processing: 'thinking', responding: 'speaking'};

class EilikFaceCard extends HTMLElement {
    static getStubConfig() { return {entity: ''}; }

    setConfig(config) {
        this._cfg = Object.assign({
            eye_color: '#35E0FF', listen_color: '#7CFF8A',
            think_color: '#FFC857', speak_color: '#FF8AD8',
            size: 100, mouth: false, sleep_minutes: 10, height: 300, overlay: false,
            // Superpuesta se atenúa lo que hay debajo; como tarjeta normal, fondo opaco.
            bg_color: config.overlay ? '#000000b8' : '#000000',
        }, config);
        this._build();
    }

    getCardSize() { return this._cfg.overlay ? 1 : Math.ceil(this._cfg.height / 50); }

    set hass(hass) {
        this._hass = hass;
        const e = this._cfg.entity ? hass.states[this._cfg.entity] : null;
        this._go(e ? (FACE[e.state] || 'idle') : 'idle');
    }

    disconnectedCallback() { this._stop(); if (this._ro) this._ro.disconnect(); }

    // ---- montaje ----

    _build() {
        if (!this.shadowRoot) this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `<style>${CSS}</style>${HTML}`;
        this._face = this.shadowRoot.getElementById('face');
        this._fx = this._face.querySelector('.fx');
        const stage = this.shadowRoot.querySelector('.stage');
        const c = this._cfg;
        this.classList.toggle('overlay', !!c.overlay);
        stage.classList.toggle('over', !!c.overlay);
        this.style.setProperty('--bg', c.bg_color);
        this.style.setProperty('--s', c.size / 100);
        this.style.setProperty('--h', c.height + 'px');
        this._timers = [];
        this._state = null;
        // La unidad base sale del tamaño de la tarjeta, no del viewport, para que la cara encaje
        // igual en una columna estrecha que a pantalla completa.
        this._ro = new ResizeObserver(() => {
            const r = stage.getBoundingClientRect();
            if (r.width && r.height) this.style.setProperty('--u', Math.min(r.width, r.height) / 100 + 'px');
        });
        this._ro.observe(stage);
    }

    // ---- utilidades ----

    _later(fn, ms) { const id = setTimeout(fn, ms); this._timers.push(id); return id; }
    _stop() { (this._timers || []).forEach(clearTimeout); this._timers = []; }
    _look(x, y) {
        this._face.style.setProperty('--lx', x + '%');
        this._face.style.setProperty('--ly', y + '%');
    }
    _blink() { this._face.classList.add('blink'); this._later(() => this._face.classList.remove('blink'), 130); }
    _fxChar(ch, color) {
        const s = document.createElement('span');
        const rnd = (a, b) => a + Math.random() * (b - a);
        s.textContent = ch;
        s.style.left = rnd(0, 8) + '%';
        s.style.setProperty('--dx', rnd(-3, 9) + '%');
        if (color) s.style.color = color;
        this._fx.appendChild(s);
        this._later(() => s.remove(), 2600);
    }
    _color(state) {
        const c = this._cfg;
        return {listening: c.listen_color, thinking: c.think_color, speaking: c.speak_color}[state] || c.eye_color;
    }

    // ---- cambio de estado en vivo ----

    _go(state) {
        if (state === this._state) return;
        this._stop();
        this._state = state;
        if (this._cfg.overlay) {
            this.shadowRoot.querySelector('.stage').classList.toggle('on', state !== 'idle');
        }
        this._face.className = state;           // CSS transiciona color y forma desde lo anterior
        this._face.classList.toggle('mouth-on', !!this._cfg.mouth && state === 'speaking');
        this._fx.innerHTML = '';
        this._look(0, 0);
        this.style.setProperty('--eye', this._color(state));
        (this['_scene_' + state] || this._scene_idle).call(this);
    }

    _scene_listening() {
        this._look(0, -4);
        const loop = () => { this._blink(); this._later(loop, 3000 + Math.random() * 2000); };
        loop();
    }

    _scene_thinking() {
        let side = 1;
        const loop = () => { this._look(7 * side, -5); side = -side; this._later(loop, 900); };
        loop();
    }

    _scene_speaking() {
        if (this._cfg.mouth) {
            const mouth = () => {
                this.style.setProperty('--mh', 1 + Math.random() * 4);
                this._later(mouth, 130);
            };
            mouth();
        }
        const loop = () => {
            this._face.classList.add('happy');
            this._later(() => this._face.classList.remove('happy'), 450);
            this._later(loop, 1500 + Math.random() * 1500);
        };
        loop();
    }

    _scene_idle() {
        const rnd = (a, b) => a + Math.random() * (b - a);
        const t0 = Date.now();
        const reset = () => { this._face.className = 'idle'; this._look(0, 0); };
        const act = (ms, fn) => { fn(); this._later(reset, ms); return ms + 500; };
        const on = (...c) => c.forEach(x => this._face.classList.add(x));
        const pink = '#ff6fa5';
        const A = {
            around: () => act(3600, () => {
                this._look(-7, -1);
                this._later(() => this._look(7, -1), 1100);
                this._later(() => this._look(0, -5), 2300);
            }),
            whistle: () => act(4200, () => {
                on('b-up', 'm-o');
                for (let i = 0; i < 6; i++) {
                    this._later(() => { this._fxChar(i % 2 ? '♫' : '♪'); this._look(i % 2 ? 7 : 4, -3); }, 300 + i * 650);
                }
            }),
            hum: () => act(4000, () => {
                on('happy', 'm-smile');
                for (let i = 0; i < 8; i++) {
                    this._later(() => { this._look(i % 2 ? -3 : 3, 0); if (i % 2) this._fxChar('♪'); }, i * 480);
                }
            }),
            dance: () => act(4000, () => {
                on('happy', 'm-smile');
                for (let i = 0; i < 10; i++) {
                    this._later(() => { this._look(i % 2 ? -4 : 4, i % 2 ? -2 : 1); if (i % 3 === 0) this._fxChar('♫'); }, i * 400);
                }
            }),
            yawn: () => act(2400, () => { on('b-sad', 'squint', 'm-yawn'); this._later(() => this._blink(), 1900); }),
            love: () => act(3200, () => {
                on('happy', 'blush', 'm-smile');
                for (let i = 0; i < 4; i++) this._later(() => this._fxChar('♥', pink), i * 600);
            }),
            wink: () => act(1800, () => { on('wink', 'm-smile', 'b-up'); this._later(() => this._fxChar('✦'), 300); }),
            bored: () => act(4200, () => {
                on('squint', 'b-sad');
                [[-6, -5], [0, -7], [6, -5], [0, 2]].forEach((p, i) => this._later(() => this._look(p[0], p[1]), i * 600));
                this._later(() => this._fxChar('…'), 2600);
            }),
            surprise: () => act(2200, () => { on('wide', 'b-up', 'm-o'); this._look(0, -2); this._fxChar('!'); }),
            curious: () => act(3200, () => {
                on('wide', 'b-up'); this._look(8, -3); this._fxChar('?');
                this._later(() => this._look(-8, -3), 1500);
            }),
        };
        const keys = Object.keys(A);
        let last = '';
        const loop = () => {
            const sleepMin = this._cfg.sleep_minutes;
            if (sleepMin > 0 && Date.now() - t0 > sleepMin * 60000) {
                this._later(() => { reset(); this._face.classList.add('sleep'); this._look(0, 2); }, A.yawn());
                return;
            }
            const r = Math.random();
            let d;
            if (r < .4) {
                this._blink();
                if (Math.random() < .3) this._later(() => this._blink(), 260);
                d = rnd(1500, 3000);
            } else if (r < .55) {
                this._look(rnd(-6, 6), rnd(-3, 3));
                this._later(() => this._look(0, 0), rnd(900, 1600));
                d = rnd(1800, 3000);
            } else {
                let k;
                do { k = keys[Math.floor(Math.random() * keys.length)]; } while (k === last);
                last = k;
                d = A[k]();
            }
            this._later(loop, d);
        };
        loop();
    }
}

customElements.define('eilik-face-card', EilikFaceCard);
window.customCards = window.customCards || [];
window.customCards.push({
    type: 'eilik-face-card',
    name: 'Cara Eilik',
    description: 'Cara de robot que reacciona al asistente de voz en tiempo real.',
});
