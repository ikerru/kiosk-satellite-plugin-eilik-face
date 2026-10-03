// SPDX-License-Identifier: Apache-2.0
package eilik.face;

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
    private ScheduledFuture<?> flushTask, wakeTask, demoTask;

    @Override public synchronized void start(PluginHost host, Map<String, Object> settings) {
        this.host = host;
        alive = true;
        exec = Executors.newSingleThreadScheduledExecutor();
        host.subscribe("wakeword.detected");
        host.subscribe("voice.interaction");
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

    private void request() {
        if (flushTask != null && !flushTask.isDone()) return;
        long wait = Math.max(0, lastPublish + MIN_GAP_MS - System.currentTimeMillis());
        flushTask = schedule(() -> { synchronized (this) { publish(); } }, wait);
    }

    private void publish() {
        String state = resolve();
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
            host.status("Cara: " + state + (usingEntity() ? " (entidad)" : " (eventos)"), false);
        } catch (RuntimeException e) {
            host.log("No se pudo publicar la cara: " + e.getMessage());
        }
    }

    private String str(String k, String d) { Object v = cfg.get(k); return v instanceof String && !((String) v).isEmpty() ? (String) v : d; }
    private double num(String k, double d) { Object v = cfg.get(k); return v instanceof Number ? ((Number) v).doubleValue() : d; }
    private boolean bool(String k, boolean d) { Object v = cfg.get(k); return v instanceof Boolean ? (Boolean) v : d; }
}
