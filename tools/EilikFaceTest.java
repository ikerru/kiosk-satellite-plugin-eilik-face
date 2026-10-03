import eilik.face.EilikFacePlugin;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import me.jxl.kiosk.plugins.PluginHost;

public final class EilikFaceTest {
    public static void main(String[] args) throws Exception {
        final List<Object> published = Collections.synchronizedList(new ArrayList<>());
        InvocationHandler h = (proxy, m, a) -> {
            if (m.getName().equals("publishScreensaverAsset")) published.add(a[3]);
            Class<?> r = m.getReturnType();
            if (r == boolean.class) return false;
            if (r == int.class || r == long.class) return 0;
            return null;
        };
        PluginHost host = (PluginHost) Proxy.newProxyInstance(
            EilikFaceTest.class.getClassLoader(), new Class<?>[] {PluginHost.class}, h);

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
        System.out.println("OK");
    }

    private static String state(List<Object> l, int i) {
        return (String) ((Map<?, ?>) l.get(i)).get("state");
    }

    private static void check(boolean ok, String msg) {
        if (!ok) throw new AssertionError(msg);
    }
}
