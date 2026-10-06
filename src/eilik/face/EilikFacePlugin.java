// SPDX-License-Identifier: Apache-2.0
package eilik.face;

import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import me.jxl.kiosk.plugins.KioskPlugin;
import me.jxl.kiosk.plugins.PluginHost;

/** Protector de pantalla con cara de robot que reacciona al asistente de voz. */
public final class EilikFacePlugin implements KioskPlugin {
    private static final String KEY = "eilik";
    private static final long MIN_GAP_MS = 300; // KS admite 4 publicaciones por segundo

    // Diagnóstico opcional: qué hay realmente en pantalla durante un turno de voz.
    private static final String[] DIAG_EVENTS = {"screensaver.view", "screen.state"};

    private static final String[] DEMO_SEQ = {"listening", "thinking", "speaking"};
    private static final long[] DEMO_MS = {3000, 3000, 5000};

    private PluginHost host;
    private volatile boolean alive;
    private volatile ScheduledExecutorService exec;
    private Map<String, Object> cfg = new HashMap<>();
    private String entityId = "";
    private String entityState;   // último estado válido de assist_satellite
    private boolean wake;         // wake word / interacción de voz reciente
    private String demo;          // estado forzado por la acción "demo"
    private int demoStep;
    private String published = "";
    private String lastState;
    private long lastPublish;
    private int failures;         // publicaciones seguidas rechazadas por KS
    private boolean panelShown;   // el protector lo descartamos nosotros para enseñar el panel
    private boolean diag;         // diagnóstico de pantalla activado en ajustes
    private Boolean saverActive, screenOn;
    private String saverView;
    private ScheduledFuture<?> flushTask, wakeTask, demoTask;

    @Override public synchronized void start(PluginHost host, Map<String, Object> settings) {
        this.host = host;
        alive = true;
        exec = Executors.newSingleThreadScheduledExecutor();
        host.subscribe("wakeword.detected");
        host.subscribe("voice.interaction");
        host.subscribe("screensaver.state"); // hace falta para devolver el protector tras hablar
        apply(settings);
        publish();
    }

    @Override public synchronized void configure(Map<String, Object> settings) {
        if (!alive) return;
        apply(settings);
        request();
    }

    private void apply(Map<String, Object> settings) {
        cfg = new HashMap<>(settings);
        boolean wantDiag = bool("diagnostics", false);
        if (wantDiag != diag) {
            diag = wantDiag;
            for (String e : DIAG_EVENTS) {
                if (diag) host.subscribe(e); else host.unsubscribe(e);
            }
            if (!diag) { saverActive = null; screenOn = null; saverView = null; }
        }
        String next = str("assistEntity", "");
        if (next.equals(entityId)) return;
        if (!entityId.isEmpty()) host.unsubscribe("ha.entity." + entityId);
        entityId = next;
        entityState = null;
        if (!next.isEmpty()) host.subscribe("ha.entity." + next); // entrega el estado inicial
    }

    @Override public synchronized void onEvent(String event, Map<String, Object> payload) {
        if (!alive) return;
        if (!entityId.isEmpty() && event.equals("ks.ha.entity." + entityId)) {
            Object st = payload.get("state");
            entityState = "available".equals(payload.get("status")) && st instanceof String ? (String) st : null;
        } else if (event.equals("ks.wakeword.detected")) {
            setWake(true);
        } else if (event.equals("ks.voice.interaction")) {
            setWake(Boolean.TRUE.equals(payload.get("active")));
        } else if (event.startsWith("ks.screensaver.") || event.equals("ks.screen.state")) {
            observe(event, payload); // solo informa: no cambia la cara ni publica
            return;
        } else {
            return;
        }
        request();
    }

    @Override public synchronized void execute(String command, Map<String, Object> arguments) {
        if (!"demo".equals(command)) throw new IllegalArgumentException("Acción desconocida: " + command);
        if (demoTask != null) demoTask.cancel(false);
        demoStep = 0;
        demoNext();
    }

    @Override public void stop() {
        alive = false; // KS ya revocó el host: no se llama a host.* aquí
        ScheduledExecutorService e = exec;
        if (e == null) return;
        e.shutdownNow();
        try { e.awaitTermination(1, TimeUnit.SECONDS); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); }
    }

    // ---- lógica de estado ----

    private boolean usingEntity() { return !entityId.isEmpty() && entityState != null; }

    private void setWake(boolean on) {
        wake = on;
        if (wakeTask != null) wakeTask.cancel(false);
        if (!on) return;
        // Con entidad, el wake word solo adelanta el "escuchando" unos instantes.
        long ms = usingEntity() ? 2000 : 30000;
        wakeTask = schedule(() -> { synchronized (this) { wake = false; request(); } }, ms);
    }

    private String resolve() {
        if (demo != null) return demo;
        if (usingEntity()) {
            switch (entityState) {
                case "listening": return "listening";
                case "processing": return "thinking";
                case "responding": return "speaking";
                default: return wake ? "listening" : "idle";
            }
        }
        return wake ? "listening" : "idle";
    }

    private synchronized void demoNext() {
        if (!alive) return;
        if (demoStep >= DEMO_SEQ.length) { demo = null; request(); return; }
        demo = DEMO_SEQ[demoStep];
        request();
        demoTask = schedule(this::demoNext, DEMO_MS[demoStep++]);
    }

    // ---- publicación ----

    private ScheduledFuture<?> schedule(Runnable r, long ms) {
        try { return exec.schedule(() -> { if (alive) r.run(); }, ms, TimeUnit.MILLISECONDS); }
        catch (RejectedExecutionException e) { return null; }
    }

    /** Espera entre publicaciones. Crece tras cada rechazo de KS, hasta unos 4,8 s. */
    private long gap() { return MIN_GAP_MS << Math.min(failures, 4); }

    private void request() {
        if (flushTask != null && !flushTask.isDone()) return;
        long wait = Math.max(0, lastPublish + gap() - System.currentTimeMillis());
        // flushTask se limpia antes de publicar para que un reintento pueda encolarse desde publish().
        flushTask = schedule(() -> { synchronized (this) { flushTask = null; publish(); } }, wait);
    }

    /**
     * Entrega la pantalla al panel mientras dura el turno de voz y devuelve el protector al acabar.
     * KS oculta la superficie del protector durante el turno, así que la cara solo puede seguir
     * visible si la dibuja el dashboard. Solo actúa si el protector estaba puesto: si el usuario
     * estaba usando el kiosko, no se le cambia la pantalla bajo los pies.
     */
    private void panel(String state) {
        boolean want = bool("panelOnVoice", false);
        boolean talking = want && !"idle".equals(state);
        if (talking && !panelShown && Boolean.TRUE.equals(saverActive)) {
            panelShown = true;
            control("stopScreensaver");
        } else if (!talking && panelShown) {
            panelShown = false;
            control("startScreensaver");
        }
    }

    private void control(String command) {
        try {
            host.executeCommand(command, Collections.emptyMap(), (ok, data, error) -> {
                if (!ok) host.log("El comando " + command + " falló: " + error);
            });
        } catch (RuntimeException e) {
            host.log("No se pudo ejecutar " + command + ": " + e.getMessage());
        }
    }

    private void publish() {
        String state = resolve();
        panel(state);
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("state", state);
        o.put("eye", str("eyeColor", "#35E0FF"));
        o.put("bg", str("bgColor", "#000000"));
        o.put("listen", str("listenColor", "#7CFF8A"));
        o.put("think", str("thinkColor", "#FFC857"));
        o.put("speak", str("speakColor", "#FF8AD8"));
        o.put("size", num("eyeSize", 100));
        o.put("mouth", bool("showMouth", false));
        o.put("sleepMin", num("sleepMinutes", 10));
        String sig = o.toString();
        if (sig.equals(published)) return;
        o.put("prev", lastState != null ? lastState : state);
        try {
            host.publishScreensaverAsset(KEY, "Cara Eilik", "eilik/index.html", o);
            published = sig;
            lastState = state;
            lastPublish = System.currentTimeMillis();
            failures = 0;
            host.status(describe("Cara: " + state + (usingEntity() ? " (entidad)" : " (eventos)")), false);
        } catch (RuntimeException e) {
            // Una llamada rechazada también cuenta para el límite de KS. Sin anotarla, el siguiente
            // evento publicaría de inmediato y la ráfaga se realimentaría, dejando el protector en
            // negro mientras durase. Se anota, se espera más y se reintenta aunque no lleguen eventos.
            lastPublish = System.currentTimeMillis();
            failures++;
            host.log("No se pudo publicar la cara: " + e.getMessage());
            host.status("No se pudo publicar la cara: " + e.getMessage(), true);
            request();
        }
    }

    // ---- diagnóstico de pantalla ----

    private void observe(String event, Map<String, Object> payload) {
        if (event.equals("ks.screensaver.state")) saverActive = Boolean.TRUE.equals(payload.get("active"));
        else if (event.equals("ks.screensaver.view")) {
            Object v = payload.get("view");
            saverView = v instanceof String ? (String) v : "atenuado"; // null = modo dim, sin overlay
        } else if (event.equals("ks.screen.state")) screenOn = Boolean.TRUE.equals(payload.get("on"));
        String line = describe("Cara: " + resolve());
        host.log(line);
        host.status(line, false);
    }

    /** Añade al mensaje lo observado en pantalla, cuando el diagnóstico está activado. */
    private String describe(String message) {
        if (!diag) return message;
        return message
            + " · protector: " + (saverActive == null ? "?" : saverActive ? "activo" : "inactivo")
            + ", vista: " + (saverView == null ? "?" : saverView)
            + ", pantalla: " + (screenOn == null ? "?" : screenOn ? "encendida" : "apagada");
    }

    private String str(String k, String d) { Object v = cfg.get(k); return v instanceof String && !((String) v).isEmpty() ? (String) v : d; }
    private double num(String k, double d) { Object v = cfg.get(k); return v instanceof Number ? ((Number) v).doubleValue() : d; }
    private boolean bool(String k, boolean d) { Object v = cfg.get(k); return v instanceof Boolean ? (Boolean) v : d; }
}
