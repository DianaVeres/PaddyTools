# PaddyTools — fuente oficial

Esta carpeta es la única fuente oficial de PaddyTools:

`C:\Users\Lorena-PC\OneDrive\Documentos\dudas\gestion-unificada-integrada`

## Producción

- Worker: `gestion-unificada`
- URL: `https://gestion-unificada.paddygestion.workers.dev`
- Configuración: `wrangler.independent.jsonc`
- Base principal: `gestion-unificada-db`
- Base histórica de PackingList: `paddy-packing-list-db`, vinculada como `PACKING_DB`

## Estructura integrada

- Aplicación PaddyTools: `app/`, `components/`, `lib/` y `db/`.
- Pantalla de PackingList: `app/packing-list/`.
- Lógica editable de datos de PackingList: `lib/packing-list-store.ts`.
- Copia exacta recuperada del Worker de PackingList: `workers/packing-list/`.

El Worker separado se recuperó de Cloudflare el 30/10/2026. Su lógica activa ya
se trasladó a TypeScript editable dentro de PaddyTools. La copia compilada se
conserva únicamente como referencia y mecanismo de recuperación; no se despliega.

## Regla de despliegue

No ejecutar `wrangler deploy` manualmente. Utilizar siempre:

```powershell
pnpm run deploy:production
```

El script comprueba que está dentro de esta fuente oficial, compila de nuevo
la aplicación, despliega el contenido recién generado y comprueba mediante
consultas de solo lectura que la versión publicada responde correctamente.

La comprobación funcional de producción también se puede ejecutar por separado:

```powershell
pnpm run verify:production
```

Antes de cualquier cambio relacionado con PackingList se puede comprobar la
integridad del Worker recuperado con:

```powershell
pnpm run verify:packing-list-worker
```

Las carpetas `gestion-unificada-cloudflare-fix`, `gestion_unificada_cambios`,
`patch-base` y otros ZIP son copias históricas o material auxiliar. No son
fuentes válidas para producción.

