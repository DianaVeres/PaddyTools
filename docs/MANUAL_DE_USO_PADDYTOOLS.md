# Manual de uso de PaddyTools

**Versión del manual:** 1.0  
**Actualizado:** 3 de noviembre de 2026  
**Aplicación:** PaddyTools · Gestión Paddy

---

## 1. Para qué sirve PaddyTools

PaddyTools reúne en un único lugar las tareas diarias que antes estaban
repartidas entre WooCommerce, Monday, PackingList, incidencias y otras
herramientas.

Sus objetivos son:

1. Encontrar toda la información relacionada con una persona o referencia.
2. Evitar errores al preparar envíos y recogidas.
3. Mantener un registro compartido de reservas, incidencias y comunicaciones.
4. Medir tiempos y volúmenes de trabajo de forma objetiva.
5. Detectar procesos que necesitan mejoras.
6. Comparar calidad y productividad teniendo en cuenta el volumen realizado.

PaddyTools no sustituye los datos originales de WooCommerce o Monday. Los
consulta y los presenta juntos, y guarda en su propia base los registros que
pertenecen a PaddyTools.

---

## 2. Acceso y seguridad

Cada persona debe entrar con su propio usuario. Esto permite:

- proteger la información de clientes;
- identificar quién realiza cada tarea;
- asignar correctamente los tiempos de trabajo;
- saber quién registra una nota o un error;
- aplicar permisos especiales a Administración.

No se deben compartir usuarios. Si dos personas trabajan con el mismo usuario,
los KPIs atribuirán todo el trabajo a una sola persona y las comparaciones no
serán fiables.

Al terminar en un ordenador compartido, se debe cerrar la sesión desde el nombre
de usuario situado en la cabecera.

---

## 3. Pantalla principal y consulta global

La pantalla principal permite buscar por:

- número de pedido de WooCommerce;
- número de reserva de Monday;
- nombre del cliente;
- teléfono;
- referencias relacionadas con incidencias y registros.

La consulta reúne, cuando existen:

- pedidos de WooCommerce;
- reservas de Monday;
- prendas o registros relacionados;
- incidencias;
- notas y comentarios;
- documentos disponibles;
- información de envío.

### Recomendaciones de búsqueda

1. Para una referencia, escribirla completa siempre que sea posible.
2. Para una persona, probar primero nombre y apellidos.
3. Si hay varias coincidencias, comprobar teléfono y correo antes de actuar.
4. No asumir que una reserva es un pedido: revisar el origen que muestra cada
   tarjeta.

### Acciones disponibles

Según el tipo de resultado se puede:

- imprimir una etiqueta o documento;
- preparar un correo o WhatsApp;
- consultar artículos y datos del cliente;
- añadir o eliminar notas internas permitidas;
- abrir el registro relacionado;
- comprobar cuándo se realizó un envío;
- marcar una devolución como atendida.

---

## 4. PackingList

El bloque PackingList sirve para preparar y archivar envíos a colegios.

### Crear un PackingList

1. Entrar en **PackingList**.
2. Seleccionar el colegio.
3. Indicar la fecha de envío y el periodo de pedidos.
4. Introducir las referencias y cajas.
5. Revisar las líneas marcadas como discrepancia.
6. Generar el PackingList.
7. Revisar el documento antes de imprimir o guardar el PDF.

### Control del colegio

PaddyTools compara el colegio del envío con el colegio asociado a cada pedido.
Las variantes equivalentes de un mismo colegio se normalizan, por ejemplo una
denominación general y su variante «Web».

Si una referencia pertenece realmente a otro colegio:

- la línea se marca en rojo;
- el mensaje de entrega muestra un aviso;
- debe corregirse o confirmarse antes de continuar.

El color rojo es una advertencia, no una decisión automática. Si se considera un
falso positivo se deben revisar los datos de origen y comunicarlo para corregir
la equivalencia de colegios.

### Registros y mensajes

Los PackingLists quedan archivados y se pueden filtrar por fechas y semanas. La
búsqueda de la fecha de envío de una referencia consulta todo el histórico, no
solo las semanas visibles en el filtro inicial.

En Mensajes se cargan únicamente los registros del intervalo elegido. Las
referencias `PAxxxxx` no generan mensajes automáticos; las demás referencias
admitidas sí.

### Medición automática

El contador comienza cuando se selecciona el colegio y termina después de que
el PackingList se haya guardado correctamente. Registra:

- usuario;
- tiempo empleado;
- número de pedidos;
- un PackingList terminado.

No se debe iniciar también «Preparar PackingLists» en el contador manual porque
duplicaría el tiempo. Esta opción se ha eliminado del selector rápido.

---

## 5. Reservas

El bloque Reservas muestra los registros procedentes de Monday y permite
trabajar con sus datos desde PaddyTools.

Desde una reserva se puede consultar:

- cliente y teléfono;
- colegio;
- código y descripción del artículo;
- talla y unidades;
- estado y observaciones;
- comentarios de Monday;
- incidencias relacionadas.

### Crear una reserva

En **Generar reserva** se puede crear una reserva nueva o relacionarla con un
pedido existente. El cliente puede buscarse en Monday y WooCommerce. Al elegir
el colegio se muestran los artículos correspondientes.

Antes de guardar se debe verificar especialmente:

- identidad del cliente;
- teléfono;
- colegio;
- artículo y talla;
- unidades;
- fecha prevista.

---

## 6. Recogidas

Recogidas reúne las incidencias que requieren recoger producto en un colegio.

Hay dos colegios que no deben confundirse:

- **Colegio de la incidencia:** lugar de origen del caso y lugar donde se
  realiza la recogida.
- **Colegio del producto:** centro al que pertenece el artículo del catálogo.

La etiqueta y la lista de recogidas utilizan siempre el colegio de la
incidencia. El colegio del producto no cambia el destino de la recogida.

Los estados de recepción permiten medir cuántas recogidas están pendientes y
cuántas ya se han recibido.

---

## 7. ¿Envío?

El botón **¿Envío?** permite localizar la fecha en la que una referencia fue
incluida en un PackingList.

Cuando una búsqueda puede corresponder a varias referencias, se debe elegir la
forma exacta en el desplegable. PaddyTools consulta el archivo completo aunque
la pantalla de registros cargue inicialmente un periodo limitado.

---

## 8. Incidencias

El bloque Incidencias reúne:

- incidencias de pedidos;
- incidencias de tienda;
- incidencias internas;
- recogidas en colegios;
- mediciones y hoja de registro.

### Datos básicos de una incidencia

Siempre que sea posible se deben completar:

- fecha de alta;
- referencia del pedido o reserva;
- cliente, teléfono, correo y dirección;
- colegio de la incidencia;
- descripción objetiva de lo ocurrido;
- solución o siguiente paso;
- productos afectados;
- observaciones;
- estado de solución y envío.

Si no existe número de pedido o reserva se puede generar un identificador
automático. Debe utilizarse esa opción para evitar duplicidades.

La fecha de alta queda guardada y es la fecha utilizada en las etiquetas de la
incidencia.

### Abrir y revisar una incidencia

Las incidencias de pedido, tienda e internas se pueden abrir para consultar las
anotaciones completas. Los usuarios autorizados pueden eliminar registros
erróneos desde la hoja correspondiente.

### Incidencia y producto de distinto colegio

La incidencia pertenece al colegio indicado como colegio de origen, aunque el
producto que se vaya a recoger pertenezca a otro catálogo. La etiqueta y la
recogida conservan el colegio de origen.

---

## 9. Hotline

Hotline ayuda a responder correos de clientes con respuestas homogéneas y deja
un registro compartido.

### Flujo recomendado

1. Escribir el email y, si se conoce, el asunto.
2. Pegar el mensaje recibido.
3. Añadir información interna necesaria para redactar.
4. Pulsar **Analizar y redactar**.
5. Revisar la propuesta; nunca enviarla sin leerla.
6. Corregir respuesta, estado y siguiente paso si fuera necesario.
7. Copiar y enviar la respuesta por el canal habitual.
8. Pulsar **Guardar contacto**.

### Plantillas

La pestaña Plantillas contiene respuestas oficiales y plantillas creadas por el
equipo. Las nuevas plantillas deben describir una situación reutilizable y no
deben contener datos personales de un cliente concreto.

### Registro y análisis

El Registro permite buscar comunicaciones anteriores. Análisis muestra casos
guardados, estados y plantillas utilizadas.

### Medición automática

El tiempo empieza al pegar o escribir el mensaje recibido y finaliza cuando
**Guardar contacto** confirma el guardado. Si se recarga la página, el contador
continúa. Si se pulsa **Nuevo caso** sin guardar, la medición se cancela.

No se debe medir también «Responder correos» con el contador manual. Esta opción
se ha eliminado del selector rápido.

---

## 10. Contador de productividad

El contador rápido aparece en PaddyTools cuando hay una sesión iniciada.

Se utiliza para tareas que todavía no tienen principio y final automáticos:

- preparar pedidos;
- cambiar el estado inicial;
- gestionar la preparación de reservas;
- avisar de llegadas a colegios;
- gestionar recogidas;
- mantenimiento, solo para Administración;
- otras tareas.

### Uso

1. Elegir la tarea.
2. Pulsar **Iniciar** justo cuando se empieza.
3. Pulsar **Terminar** al finalizar.
4. Indicar pedidos, productos o unidades correspondientes.
5. Guardar y terminar.

No existe un formulario para añadir tiempos después: la medición debe iniciarse
desde el contador para evitar registros duplicados o tiempos estimados.

---

## 11. KPIs: filtros y alcance

La pantalla KPIs se filtra por:

- fecha inicial;
- fecha final;
- persona o conjunto del equipo.

Todos los indicadores de la pantalla responden al periodo seleccionado. Cuando
se elige una persona, los tiempos y los errores se limitan a esa persona.

Para comparar periodos se deben usar intervalos equivalentes: semana con semana,
mes con mes o campaña con campaña.

---

## 12. Lecturas de productividad

### 12.1 PackingLists

Número de PackingLists cuya fecha de envío está dentro del periodo.

**Sirve para:** medir cuántos envíos completos se han preparado.  
**No indica por sí solo:** la cantidad de pedidos incluida en cada uno.

### 12.2 Pedidos enviados

Número total de pedidos incluidos en PackingLists del periodo.

**Sirve para:** medir el volumen real expedido.  
**Lectura conjunta:** comparar este dato con PackingLists permite conocer el
tamaño medio aproximado de los envíos.

### 12.3 Colegios atendidos

Número de colegios distintos que han recibido un PackingList.

**Sirve para:** conocer la dispersión operativa. Un mismo volumen repartido entre
muchos colegios puede requerir más organización.

### 12.4 Recogidas

Número de incidencias del periodo marcadas para recogida en colegio.

**Sirve para:** medir el volumen de logística inversa.

---

## 13. Lecturas de incidencias y resolución

### 13.1 Incidencias

Número de incidencias cuya fecha de incidencia —o, si falta, su actualización—
está dentro del periodo.

El detalle muestra cuántas continúan pendientes.

### 13.2 Resueltas y tasa de resolución

La tasa se calcula así:

```text
incidencias resueltas ÷ incidencias del periodo × 100
```

Una tasa baja no siempre significa peor trabajo. Puede deberse a casos recientes
que todavía esperan respuesta, mercancía o decisión del cliente. Conviene
revisarla junto con la antigüedad de los pendientes.

### 13.3 Recogidas recibidas

```text
recogidas recibidas ÷ recogidas solicitadas × 100
```

Mide el avance de las recogidas. Una tasa baja puede señalar retrasos del colegio,
transporte o seguimiento interno.

### 13.4 Reincidencias

Suma de las veces que una incidencia se ha repetido.

Un aumento puede indicar que la solución aplicada no elimina la causa original.
Debe revisarse por tipo de problema y proceso.

---

## 14. Lecturas de tiempos

### 14.1 Preparación por pedido

```text
minutos de preparación ÷ pedidos preparados
```

Mide el tiempo de preparación, sin incluir comprobación.

### 14.2 Preparación por producto

```text
minutos de preparación ÷ productos preparados
```

Es útil cuando los pedidos tienen cantidades muy diferentes. Dos personas con
igual número de pedidos pueden haber preparado volúmenes de producto muy
distintos.

### 14.3 Trabajo por pedido

```text
(minutos de preparación + minutos de comprobación)
÷ unidades de pedido registradas en ambas tareas
```

Mide el esfuerzo conjunto de preparar y comprobar. Es la referencia utilizada
por el calculador de personas necesarias.

### 14.4 Tiempo por PackingList

```text
minutos medidos automáticamente en PackingList ÷ PackingLists terminados
```

Debe analizarse junto al número de pedidos por PackingList. Un envío con muchos
pedidos normalmente requiere más tiempo.

### 14.5 Tiempo por mensaje

```text
minutos medidos en Hotline ÷ contactos guardados
```

Incluye desde que se pega el mensaje hasta que se guarda el contacto. No mide
solo la escritura: también incluye la lectura, revisión y decisión.

### 14.6 Tiempo por persona

Suma los registros de trabajo atribuidos al usuario. Muestra también pedidos,
productos y PackingLists declarados.

No se debe comparar únicamente el tiempo total: quien realiza más volumen tendrá
normalmente más minutos. Deben utilizarse las medias por unidad.

### 14.7 Tiempo por tarea

Agrupa los minutos y el número de registros por función. Permite saber qué
procesos consumen más capacidad del equipo.

---

## 15. Planificador de personas necesarias

El planificador utiliza:

- pedidos previstos;
- horas disponibles por persona;
- tiempo medio real de preparación y comprobación por pedido.

La fórmula es:

```text
personas = redondeo superior(
  pedidos previstos × minutos medios por pedido
  ÷ minutos disponibles por persona
)
```

Ejemplo: 100 pedidos, 8 horas disponibles y 7,5 minutos por pedido:

```text
100 × 7,5 ÷ 480 = 1,56 → 2 personas
```

El resultado es una orientación. Se debe añadir margen para incidencias,
descansos, atención al cliente, recepción de mercancía y tareas no medidas.

---

## 16. Calidad y errores

El bloque Calidad y errores permite registrar un hecho comprobable indicando:

- fecha;
- proceso;
- responsable de ese proceso;
- gravedad;
- tipo de error;
- pedido o referencia;
- unidades afectadas;
- minutos necesarios para corregir;
- descripción;
- si es reincidencia;
- si ya está corregido.

PaddyTools guarda automáticamente quién registra el error. La persona que
registra y la responsable del proceso pueden ser distintas.

### Gravedad

- **Leve:** impacto pequeño, sin consecuencias relevantes para el cliente.
- **Media:** requiere corrección y consume tiempo, pero el impacto es limitado.
- **Grave:** afecta de forma clara al cliente, al envío o al trabajo de varias
  personas.
- **Crítica:** riesgo económico, de datos, seguridad o impacto operativo alto.

La gravedad debe basarse en el impacto, no en quién cometió el error.

### Errores registrados

Número de registros de error en el periodo. El detalle indica cuántos siguen sin
corregir.

### Errores por cada 100 tareas

```text
número de errores ÷ unidades de trabajo medidas × 100
```

Esta es la medida adecuada para comparar procesos o personas con volúmenes
distintos.

Ejemplo:

| Persona | Tareas | Errores | Errores por 100 |
|---|---:|---:|---:|
| A | 500 | 5 | 1,0 |
| B | 50 | 2 | 4,0 |

Aunque A tiene más errores absolutos, su tasa es menor. El dato no debe usarse
para afirmar que A trabaja peor.

Si no existe volumen medido suficiente, PaddyTools muestra **Sin base**. No debe
interpretarse como cero errores ni como buen rendimiento.

### Graves o críticos

Cuenta los errores clasificados con impacto grave o crítico. Deben revisarse de
forma individual aunque la tasa general sea baja.

### Tiempo de corrección

Suma los minutos consumidos en reparar errores. Permite estimar el coste oculto
de la falta de calidad.

### Procesos a mejorar

Ordena procesos utilizando la tasa de errores por volumen y muestra:

- errores;
- tareas medidas;
- errores por 100;
- errores graves;
- reincidencias;
- minutos de corrección.

Un proceso es candidato a mejora cuando mantiene una tasa alta durante varios
periodos, acumula reincidencias o consume mucho tiempo de corrección.

### Comparativa por persona

Utiliza la misma normalización por volumen. Debe servir para detectar necesidades
de formación, herramientas o reparto de trabajo, no para valorar a una persona
con una muestra pequeña.

Antes de tomar una decisión se debe revisar:

1. que el periodo tenga suficiente volumen;
2. que las tareas comparadas tengan dificultad similar;
3. que los errores estén asignados al proceso correcto;
4. que no haya registros duplicados;
5. si el problema depende del sistema, del dato original o de otra área;
6. la evolución durante varios periodos, no un único día.

---

## 17. Cómo detectar qué proceso funciona peor

Orden recomendado de análisis:

1. Seleccionar un periodo representativo.
2. Revisar **Tiempo por tarea** para localizar procesos costosos.
3. Revisar **Errores por cada 100 tareas**.
4. Comprobar gravedad, reincidencias y tiempo de corrección.
5. Abrir los registros concretos y buscar una causa común.
6. Separar problemas de procedimiento, formación, herramienta y dato de origen.
7. Aplicar una mejora concreta.
8. Comparar el mismo KPI en el periodo siguiente.

Ejemplos de decisiones:

- tiempo alto y pocos errores: revisar pasos o automatización;
- tiempo bajo y muchos errores: reforzar comprobación;
- tiempo y errores altos: rediseñar el proceso y formar al equipo;
- muchos errores de varias personas en el mismo punto: probable problema de
  proceso o sistema, no individual;
- tasa alta de una persona con volumen suficiente: revisar formación,
  instrucciones, carga y dificultad asignada.

---

## 18. Reglas para obtener datos fiables

1. Cada persona utiliza su propio login.
2. El contador se inicia y termina en el momento real.
3. No se duplican mediciones automáticas con registros manuales.
4. Se indican correctamente pedidos, productos y PackingLists.
5. Los errores se describen con hechos, no opiniones.
6. Se asigna el proceso donde se originó el error, no donde se detectó.
7. Se marca reincidencia solo cuando se repite el mismo problema.
8. Se registra el tiempo real de corrección.
9. Se comparan tasas, no solo totales.
10. Se revisan tendencias de varias semanas antes de evaluar resultados.

---

## 19. Qué hacer ante un dato incorrecto

- **Pedido o reserva incorrectos:** revisar primero WooCommerce o Monday.
- **Colegio marcado en rojo incorrectamente:** revisar los colegios de origen y
  comunicar la equivalencia que falta.
- **Tiempo duplicado:** eliminar el registro incorrecto desde KPIs si el usuario
  tiene permiso.
- **Error asignado incorrectamente:** eliminarlo o corregirlo y volver a
  registrarlo correctamente.
- **Incidencia duplicada:** utilizar la eliminación autorizada en su hoja de
  registro.
- **Documento o pantalla en blanco:** no repetir varias veces la acción; anotar
  referencia, usuario, hora y pantalla para poder diagnosticarlo.

---

## 20. Administración, copias y actualizaciones

La fuente oficial está en el repositorio:

`https://github.com/DianaVeres/PaddyTools`

Las actualizaciones deben:

1. realizarse en el módulo correspondiente;
2. incluir pruebas que eviten regresiones;
3. crear un commit descriptivo;
4. crear una etiqueta de recuperación cuando corresponda;
5. generar copias de las bases antes del despliegue;
6. aplicar solo migraciones aditivas;
7. verificar producción;
8. subir commits y etiquetas a GitHub.

No se debe desplegar una copia antigua ni modificar directamente archivos de
producción fuera de este flujo.

---

## 21. Resumen rápido

| Necesidad | Bloque |
|---|---|
| Buscar pedido, reserva, cliente o incidencia | Consulta global |
| Preparar envíos a colegios | PackingList |
| Consultar o crear reservas | Reservas / Generar reserva |
| Gestionar productos que deben recogerse | Recogidas |
| Saber cuándo se envió una referencia | ¿Envío? |
| Registrar y solucionar problemas | Incidencias |
| Preparar y registrar respuestas de correo | Hotline |
| Medir tiempos, volumen y necesidades | KPIs |
| Detectar errores y procesos a mejorar | KPIs · Calidad y errores |

La calidad de las conclusiones depende de la calidad de los registros. PaddyTools
ayuda a medir y comparar, pero las decisiones deben apoyarse en volumen
suficiente, contexto operativo y revisión de los casos concretos.
