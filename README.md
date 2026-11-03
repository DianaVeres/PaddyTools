# PaddyTools

PaddyTools reúne en una sola aplicación la consulta de pedidos, reservas,
incidencias, recogidas, PackingLists, atención de mensajes y medición de KPIs.

## Documentación

- [Manual visual editable (Word)](docs/Manual_visual_PaddyTools.docx)
- [Manual visual listo para enviar (PDF)](docs/Manual_visual_PaddyTools.pdf)
- [Manual técnico de uso y lectura de KPIs](docs/MANUAL_DE_USO_PADDYTOOLS.md)

## Fuente oficial

Este repositorio es la fuente oficial de PaddyTools. Los despliegues de
producción se realizan mediante `scripts/deploy-production.ps1`, que valida el
código, ejecuta las pruebas, crea copias de seguridad, aplica únicamente
migraciones aditivas y comprueba la aplicación publicada.
