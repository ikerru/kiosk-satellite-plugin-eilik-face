# Cara Eilik para Kiosk Satellite

Protector de pantalla con una cara de robot (ojos redondeados sobre fondo negro, al estilo Eilik, dibujada desde cero) que reacciona al asistente de voz:

| Situación | Cara |
|---|---|
| Reposo | Parpadea, mira alrededor, sonríe de vez en cuando y se duerme tras unos minutos |
| Te escucha | Ojos que laten, mirando arriba, color verde |
| Piensa | Ojos entornados que miran de lado a lado, tres puntos, color ámbar |
| Responde | Ojos que rebotan y sonríen, color rosa, boca opcional |

## Instalación

1. Compila el plugin (ver abajo) o instala el ZIP desde **Plugin Manager > Developer Tools > Install from ZIP**.
2. Activa **Cara Eilik** en Plugin Manager.
3. En **Screensaver > Screensaver mode** elige **Cara Eilik (Cara Eilik)**.
4. Abre los ajustes del plugin, grupo **Voz**, y elige tu entidad `assist_satellite.*`. Sin ella solo se distingue "te escucha" de "reposo".

La acción **Demo de estados** recorre escuchar, pensar y hablar sin necesidad de voz; ejecútala con el protector activo.

## Notas

- Cada cambio de estado recrea el documento del protector (así lo exige el SDK), por lo que la cara reinicia su animación con una entrada suave.
- Se recomienda Kiosk Satellite 2026.9.87 o posterior, donde un turno de voz ya no cierra el protector.
