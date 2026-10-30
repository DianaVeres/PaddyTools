# PaddyTools integrado

Esta carpeta es la fuente oficial que se compila y despliega en producción.

## Objetivo

Mantener en un único proyecto la navegación, las pantallas y las integraciones de:

- Consulta global
- PackingList
- Reservas y generación de reservas
- Recogidas
- Consulta de envíos
- Incidencias

## Estrategia segura

1. Unificar primero las pantallas y las rutas bajo `gestion-unificada`.
2. Mantener las bases actuales mediante conexiones internas centralizadas.
3. Proteger los flujos críticos con verificaciones automáticas antes de compilar.
4. Migrar datos solamente con copia de seguridad y recuentos de comprobación.
5. Desplegar únicamente mediante `pnpm run deploy:production`.

## Estado

- Incidencias: integrada en `/incidencias` y almacenada en registros individuales con identificador único.
- PackingList: integrado en `/packing-list`; usa directamente la base histórica mediante el binding `PACKING_DB`.
- Reservas, Recogidas, Envío y Generar reserva: ya forman parte del núcleo de Gestión Unificada.
- Producción: PaddyTools se despliega desde esta carpeta en Cloudflare.
