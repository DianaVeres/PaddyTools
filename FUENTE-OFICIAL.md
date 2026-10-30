# PaddyTools — fuente oficial

Esta carpeta es la única fuente oficial de PaddyTools:

`C:\Users\Lorena-PC\OneDrive\Documentos\dudas\gestion-unificada-integrada`

## Producción

- Worker: `gestion-unificada`
- URL: `https://gestion-unificada.paddygestion.workers.dev`
- Configuración: `wrangler.independent.jsonc`
- Base principal: `gestion-unificada-db`
- Servicio vinculado de Packing List: `paddy-packing-list`

## Estructura integrada

- Aplicación PaddyTools: `app/`, `components/`, `lib/` y `db/`.
- Pantalla de PackingList: `app/packing-list/`.
- Conexión con el servicio de PackingList: `lib/packinglist-service.ts`.
- Copia exacta recuperada del Worker de PackingList: `workers/packing-list/`.

El Worker separado se recuperó de Cloudflare el 30/10/2026. Cloudflare solo
devuelve sus módulos compilados, por lo que de momento se conserva como base de
recuperación y no debe desplegarse directamente. El siguiente trabajo de
integración será trasladar esa lógica de datos a TypeScript editable y probado.

## Regla de despliegue

No ejecutar `wrangler deploy` manualmente. Utilizar siempre:

```powershell
pnpm run deploy:production
```

El script comprueba que está dentro de esta fuente oficial, compila de nuevo
la aplicación y solo entonces despliega el contenido recién generado.

Antes de cualquier cambio relacionado con PackingList se puede comprobar la
integridad del Worker recuperado con:

```powershell
pnpm run verify:packing-list-worker
```

Las carpetas `gestion-unificada-cloudflare-fix`, `gestion_unificada_cambios`,
`patch-base` y otros ZIP son copias históricas o material auxiliar. No son
fuentes válidas para producción.

