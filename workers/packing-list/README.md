# Worker de PackingList

Esta carpeta conserva el paquete exacto que estaba desplegado en Cloudflare
como `paddy-packing-list` el 30/10/2026.

## Estado del código

- `deployed/` contiene los 52 módulos descargados mediante la API oficial de
  Cloudflare Workers.
- Cloudflare devuelve el paquete ya compilado; no conserva los TypeScript
  originales usados antes de compilarlo.
- La pantalla editable de PackingList está en `app/packing-list/` dentro del
  proyecto principal.
- La aplicación principal se comunica con este Worker desde
  `lib/packinglist-service.ts`.

## Seguridad

No ejecutar `wrangler deploy` directamente desde esta carpeta. Este paquete es
una base de recuperación y comparación hasta que la lógica de datos se migre a
código fuente TypeScript mantenible dentro de este repositorio.

Para comprobar que la recuperación está completa:

```powershell
pnpm run verify:packing-list-worker
```

Los secretos de Monday y WooCommerce no están guardados aquí. Permanecen como
secretos cifrados de Cloudflare.
