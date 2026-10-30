# Gestión Unificada integrada

Esta carpeta es el entorno de desarrollo de la siguiente versión. No se despliega sobre producción hasta completar las pruebas y recibir autorización expresa.

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
2. Mantener temporalmente las bases actuales mediante adaptadores internos.
3. Probar cada flujo contra copias o servicios de lectura antes de migrar datos.
4. Migrar datos solamente con copia de seguridad, recuentos y prueba de reversión.
5. Desplegar únicamente después de una validación funcional completa.

## Estado

- Incidencias: integrada en `/incidencias`; pendiente convertir la pantalla heredada en componentes React.
- PackingList: integrada localmente en `/packing-list`; sus operaciones se conectan al Worker existente mediante el binding `PACKINGLIST`.
- Reservas, Recogidas, Envío y Generar reserva: ya forman parte del núcleo de Gestión Unificada.
- Producción: sin cambios por este trabajo.
