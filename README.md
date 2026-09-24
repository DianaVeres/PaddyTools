# PaddyTools

Proyecto de 2.º DAM para centralizar la gestión de pedidos, reservas, incidencias y listas de preparación de Paddy.

## Aplicaciones

- `gestion-unificada/`: aplicación principal desplegada en Cloudflare Workers.
- `packinglist/`: gestión de PackingList desplegada en Cloudflare Workers.
- `incidencias/`: aplicación FastAPI desplegada en Railway.

## Requisitos de desarrollo

- Git
- Node.js 22 o superior
- pnpm
- Python 3.11 o superior
- Wrangler 4
- Railway CLI, solamente para desplegar Incidencias

## Preparación en otro ordenador

```powershell
git clone https://github.com/DianaVeres/PaddyTools.git
cd PaddyTools

cd gestion-unificada
pnpm install
Copy-Item .env.example .env.local
pnpm run dev
```

Rellena `.env.local` con tus credenciales. Este archivo está excluido de Git y nunca debe subirse.

Para PackingList, repite el proceso dentro de `packinglist/`.

Para Incidencias:

```powershell
cd incidencias
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app:app --reload
```

## Despliegue

Cloudflare:

```powershell
cd gestion-unificada
pnpm run build
pnpm exec wrangler login
pnpm exec wrangler deploy --config wrangler.independent.jsonc --keep-vars
```

Railway:

```powershell
cd incidencias
railway login
railway link
railway up
```

## Seguridad

Las claves de WooCommerce, Monday, Cloudflare, Railway y los tokens de sincronización no forman parte del repositorio. Deben configurarse como secretos en cada plataforma y como variables locales durante el desarrollo.

