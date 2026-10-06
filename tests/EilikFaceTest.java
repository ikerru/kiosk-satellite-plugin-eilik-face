import eilik.face.EilikFacePlugin;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import me.jxl.kiosk.plugins.PluginHost;

public final class EilikFaceTest {
    static final List<Object> published = Collections.synchronizedList(new ArrayList<>());
    static final List<String> subscribed = Collections.synchronizedList(new ArrayList<>());
    static final AtomicInteger attempts = new AtomicInteger();
    static final AtomicBoolean reject = new AtomicBoolean();
    static final List<String> commands = Collections.synchronizedList(new ArrayList<>());

    public static void main(String[] args) throws Exception {
        PluginHost host = host();

        EilikFacePlugin plugin = new EilikFacePlugin();
        plugin.start(host, new HashMap<String, Object>());
        check(published.size() == 1, "debe publicar al arrancar");
        check("idle".equals(state(published, 0)), "estado inicial idle");

        plugin.onEvent("ks.wakeword.detected", new HashMap<String, Object>());
        Thread.sleep(800);
        check(published.size() == 2, "debe publicar al detectar la wake word");
        check("listening".equals(state(published, 1)), "estado listening");

        try {
            plugin.execute("desconocida", new HashMap<String, Object>());
            check(false, "una acción desconocida debe fallar");
        } catch (IllegalArgumentException expected) { }

        plugin.stop();
        rejectedPublicationsBackOffAndRecover();
        diagnosticsObserveWithoutPublishing();
        panelHandoverOnlyFromAnActiveScreensaver();
        System.out.println("OK");
    }

    /**
     * Una publicación rechazada por el límite de KS no debe disparar una cascada de reintentos
     * inmediatos, y la cara debe volver sola en cuanto KS vuelva a aceptar, sin nuevos eventos.
     */
    private static void rejectedPublicationsBackOffAndRecover() throws Exception {
        reset();
        reject.set(true);
        EilikFacePlugin plugin = new EilikFacePlugin();
        plugin.start(host(), new HashMap<String, Object>());
        try {
        Thread.sleep(1000);
        int tries = attempts.get();
        check(tries >= 2, "debe reintentar una publicación rechazada, hubo " + tries);
        check(tries <= 6, "debe espaciar los reintentos, hubo " + tries + " en 1 s");
        check(published.isEmpty(), "nada se publica mientras KS rechaza");

        reject.set(false); // sin ningún evento nuevo: el reintento pendiente debe bastar
        for (int i = 0; i < 60 && published.isEmpty(); i++) Thread.sleep(100);
        check(published.size() == 1, "la cara debe volver sola cuando KS acepta de nuevo");
        check("idle".equals(state(published, 0)), "se republica el estado actual");
        } finally { plugin.stop(); }
    }

    /** El diagnóstico observa la pantalla, pero no debe recrear el documento del protector. */
    private static void diagnosticsObserveWithoutPublishing() throws Exception {
        reset();
        Map<String, Object> settings = new HashMap<>();
        settings.put("diagnostics", Boolean.TRUE);
        EilikFacePlugin plugin = new EilikFacePlugin();
        plugin.start(host(), settings);
        try {
        check(subscribed.contains("screensaver.state"), "debe observar el estado del protector");
        check(subscribed.contains("screensaver.view"), "debe observar la vista del protector");
        check(subscribed.contains("screen.state"), "debe observar el estado de la pantalla");

        int before = published.size();
        Map<String, Object> payload = new HashMap<>();
        payload.put("active", Boolean.TRUE);
        plugin.onEvent("ks.screensaver.state", payload);
        plugin.onEvent("ks.screensaver.view", new HashMap<String, Object>());
        Thread.sleep(600);
        check(published.size() == before, "un evento de diagnóstico no debe publicar");
        } finally { plugin.stop(); }
    }

    /**
     * Con el panel activado, un turno de voz debe descartar el protector y devolverlo al acabar,
     * pero solo si el protector estaba puesto: si el usuario está usando el kiosko no se le toca.
     */
    private static void panelHandoverOnlyFromAnActiveScreensaver() throws Exception {
        reset();
        Map<String, Object> settings = new HashMap<>();
        settings.put("panelOnVoice", Boolean.TRUE);
        EilikFacePlugin plugin = new EilikFacePlugin();
        plugin.start(host(), settings);
        try {
            plugin.onEvent("ks.wakeword.detected", new HashMap<String, Object>());
            Thread.sleep(600);
            check(commands.isEmpty(), "sin protector activo no se toca la pantalla, hubo " + commands);

            Map<String, Object> active = new HashMap<>();
            active.put("active", Boolean.TRUE);
            plugin.onEvent("ks.screensaver.state", active);
            plugin.onEvent("ks.wakeword.detected", new HashMap<String, Object>());
            Thread.sleep(600);
            check(commands.contains("stopScreensaver"), "debe dar paso al panel, hubo " + commands);

            Map<String, Object> idle = new HashMap<>();
            idle.put("active", Boolean.FALSE);
            plugin.onEvent("ks.voice.interaction", idle); // active=false termina el turno
            Thread.sleep(600);
            check(commands.contains("startScreensaver"), "debe devolver el protector, hubo " + commands);
        } finally { plugin.stop(); }
    }

    private static void reset() {
        published.clear();
        subscribed.clear();
        commands.clear();
        attempts.set(0);
    }

    private static PluginHost host() {
        InvocationHandler h = (proxy, m, a) -> {
            if (m.getName().equals("publishScreensaverAsset")) {
                attempts.incrementAndGet();
                if (reject.get()) throw new IllegalStateException("límite de publicaciones superado");
                published.add(a[3]);
            } else if (m.getName().equals("subscribe")) {
                subscribed.add((String) a[0]);
            } else if (m.getName().equals("executeCommand")) {
                commands.add((String) a[0]);
            }
            Class<?> r = m.getReturnType();
            if (r == boolean.class) return false;
            if (r == int.class || r == long.class) return 0;
            return null;
        };
        return (PluginHost) Proxy.newProxyInstance(
            EilikFaceTest.class.getClassLoader(), new Class<?>[] {PluginHost.class}, h);
    }

    private static String state(List<Object> l, int i) {
        return (String) ((Map<?, ?>) l.get(i)).get("state");
    }

    private static void check(boolean ok, String msg) {
        if (!ok) throw new AssertionError(msg);
    }
}
