# Despliegue recomendado en Railway

## 1. Crear servicio
Subir este proyecto a Railway (directamente o desde un repositorio Git).

## 2. Añadir volumen persistente
Montar un Volume en:

`/data`

La aplicación copiará automáticamente la base inicial a `/data/incidencias.db` la primera vez. A partir de ahí, todos los cambios quedan en el volumen.

## 3. Variables
Configurar:

- `PUBLIC_BASE_URL`: URL pública final de Incidencias.
- `PADDY_HANDOFF_SECRET`: secreto largo y aleatorio compartido SOLO con el backend de Gestión Unificada.
- `ALLOWED_ORIGINS`: `https://tools.paddy.es` y el dominio que use Gestión Unificada durante la transición.

No copiar el `config.json` original al servidor.

## 4. Dominio
Cuando esté probado, usar por ejemplo:

`incidencias.tools.paddy.es`

## 5. Pruebas antes de cambiar el botón de Gestión Unificada

- `/health` responde OK.
- Se ven las incidencias existentes.
- Se puede abrir una incidencia y generar sus PDFs.
- Crear una incidencia de prueba y confirmar que sigue existiendo tras reiniciar/redeploy.
- Probar `POST /api/handoff` desde Gestión Unificada.
- Solo después cambiar el botón “Gestionar incidencias”.

## 6. Copia de seguridad
El programa original local permanece intacto en el PC. Además, conviene activar backups del volumen del servicio.
