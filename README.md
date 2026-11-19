# PaddyTools

PaddyTools reúne en una sola aplicación la consulta de pedidos, reservas,
incidencias, recogidas, PackingLists, atención de mensajes y medición de KPIs.

## Documentación

- [Guía rápida visual editable (Word)](docs/manuales/Guia_rapida_visual_PaddyTools.docx)
- [Guía rápida visual lista para enviar (PDF)](docs/manuales/Guia_rapida_visual_PaddyTools.pdf)
- [Manual completo editable (Word)](docs/manuales/Manual_completo_PaddyTools.docx)
- [Manual completo listo para enviar (PDF)](docs/manuales/Manual_completo_PaddyTools.pdf)
- [Manual técnico de uso y lectura de KPIs](docs/MANUAL_DE_USO_PADDYTOOLS.md)

La versión visual anterior se conserva como referencia histórica en
`docs/Manual_visual_PaddyTools.*`.

## Fuente oficial

Este repositorio es la fuente oficial de PaddyTools. Los despliegues de
producción se realizan mediante `scripts/deploy-production.ps1`, que valida el
código, ejecuta las pruebas, crea copias de seguridad, aplica únicamente
migraciones aditivas y comprueba la aplicación publicada.
