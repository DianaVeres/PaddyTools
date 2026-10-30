# PaddyTools — fuente oficial

Esta carpeta es la única fuente oficial de PaddyTools:

`C:\Users\Lorena-PC\OneDrive\Documentos\dudas\gestion-unificada-integrada`

## Producción

- Worker: `gestion-unificada`
- URL: `https://gestion-unificada.paddygestion.workers.dev`
- Configuración: `wrangler.independent.jsonc`
- Base principal: `gestion-unificada-db`
- Servicio vinculado de Packing List: `paddy-packing-list`

## Regla de despliegue

No ejecutar `wrangler deploy` manualmente. Utilizar siempre:

```powershell
pnpm run deploy:production
```

El script comprueba que está dentro de esta fuente oficial, compila de nuevo
la aplicación y solo entonces despliega el contenido recién generado.

Las carpetas `gestion-unificada-cloudflare-fix`, `gestion_unificada_cambios`,
`patch-base` y otros ZIP son copias históricas o material auxiliar. No son
fuentes válidas para producción.

