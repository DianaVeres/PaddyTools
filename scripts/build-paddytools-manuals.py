import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
MANUALS = DOCS / "manuales"
ASSETS = MANUALS / "assets"
TMP = Path(os.environ.get("PADDYTOOLS_SCREENSHOTS_DIR", Path.home() / "AppData" / "Local" / "Temp"))
LOGO = ROOT / "public" / "paddy-logo-granate.png"

NAVY = "123250"; TEAL = "0B7B72"; ORANGE = "E96E2B"; PALE = "F2F6F8"
GRAY = "66788A"; LINE = "D8E1E7"; BLACK = "000000"; WHITE = "FFFFFF"

SOURCES = {
    "inicio": "codex-clipboard-78627063-550c-4c0b-892e-ef40ea74f650.png",
    "pedido": "codex-clipboard-a8f1f36b-7c11-4d4b-982c-6ff906d20e2a.png",
    "packing": "codex-clipboard-8bae9c5b-c9ce-4f52-9bec-44f61a091189.png",
    "envio": "codex-clipboard-6b2465f2-db1c-4e93-821e-863a2ad2ebf2.png",
    "reserva": "codex-clipboard-5d29716f-a02e-40e2-86b4-241d51f30313.png",
    "reserva_ficha": "codex-clipboard-08aa3412-2330-4ca6-89a5-d2c2f97ff279.png",
    "especial": "codex-clipboard-0fed4c51-a91b-4170-b3f8-f848d9147f0c.png",
    "incidencia": "codex-clipboard-d4cf44fa-3851-4b2f-ae19-f8bc67593751.png",
    "incidencia_ficha": "codex-clipboard-ed32dba6-51b4-42f3-9d9c-746da070832a.png",
    "hotline": "codex-clipboard-56f5057a-08a6-4432-889d-48198f9f39a6.png",
    "notas": "codex-clipboard-a2d15bd4-5055-4335-b8e4-15a5bb667336.png",
    "movil": "codex-clipboard-1582145d-0d29-48da-b0b5-2122664da663.png",
}

def anonymize(name, filename):
    src = TMP / filename
    out = ASSETS / f"{name}.png"
    if not src.exists(): return None
    im = Image.open(src).convert("RGB")
    # Conserva la interfaz, pero vuelve ilegibles los datos de clientes.
    boxes = {
        "pedido": [(250,330,1210,930)], "envio": [(330,360,1530,900)],
        "reserva": [(15,155,730,975)], "reserva_ficha": [(290,440,1590,915)],
        "especial": [(220,95,555,245)], "incidencia": [(20,150,665,975)],
        "incidencia_ficha": [(290,305,1550,990)], "hotline": [(310,630,1170,770)],
        "notas": [(285,390,1210,795)],
    }
    for box in boxes.get(name, []):
        crop = im.crop(box).filter(ImageFilter.GaussianBlur(radius=10))
        im.paste(crop, box)
    im.thumbnail((1800, 1100))
    im.save(out, quality=91)
    return out

def set_font(run, size=10.2, bold=False, color=BLACK):
    run.font.name = "Aptos"; run.font.size = Pt(size); run.bold = bold
    run.font.color.rgb = RGBColor.from_string(color)
    rpr = run._element.get_or_add_rPr(); rf = rpr.get_or_add_rFonts()
    rf.set(qn("w:ascii"), "Aptos"); rf.set(qn("w:hAnsi"), "Aptos")

def page_field(p):
    r=p.add_run(); b=OxmlElement("w:fldChar"); b.set(qn("w:fldCharType"),"begin")
    i=OxmlElement("w:instrText"); i.set(qn("xml:space"),"preserve"); i.text=" PAGE "
    s=OxmlElement("w:fldChar"); s.set(qn("w:fldCharType"),"separate")
    t=OxmlElement("w:t"); t.text="1"; e=OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"),"end")
    for n in (b,i,s,t,e): r._r.append(n)

def setup(doc, title):
    sec=doc.sections[0]; sec.top_margin=Inches(.65); sec.bottom_margin=Inches(.6)
    sec.left_margin=Inches(.75); sec.right_margin=Inches(.75)
    st=doc.styles
    st["Normal"].font.name="Aptos"; st["Normal"].font.size=Pt(10.2)
    st["Normal"].paragraph_format.space_after=Pt(5); st["Normal"].paragraph_format.line_spacing=1.08
    for n,sz in (("Title",30),("Heading 1",20),("Heading 2",14),("Heading 3",11.5)):
        s=st[n]; s.font.name="Aptos Display"; s.font.size=Pt(sz); s.font.bold=True
        s.font.color.rgb=RGBColor.from_string(BLACK); s.paragraph_format.keep_with_next=True
        s.paragraph_format.space_before=Pt(12); s.paragraph_format.space_after=Pt(5)
    # Elimina bordes heredados del estilo Title de algunas instalaciones de Word.
    ppr=st["Title"]._element.get_or_add_pPr(); old=ppr.find(qn("w:pBdr"))
    if old is not None: ppr.remove(old)
    f=sec.footer.paragraphs[0]; f.alignment=WD_ALIGN_PARAGRAPH.CENTER
    set_font(f.add_run(f"PaddyTools  |  {title}  |  "),8.2,color=GRAY); page_field(f)

def cover(doc, title, subtitle):
    if LOGO.exists():
        p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
        p.add_run().add_picture(str(LOGO),width=Inches(1.05))
    p=doc.add_paragraph(style="Title"); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.add_run(title)
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER
    set_font(p.add_run(subtitle),15,True,TEAL)
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(20)
    set_font(p.add_run("Guía de trabajo para el equipo de Paddy\nVersión de noviembre de 2026"),11,color=GRAY)
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.space_before=Pt(26)
    set_font(p.add_run("Incluye consulta global, pedidos, reservas, PackingList, incidencias, Hotline, contadores y KPIs."),11.5,True,NAVY)
    doc.add_page_break()

def h(doc,text,level=1): doc.add_heading(text,level=level)
def para(doc,text,bold=None):
    p=doc.add_paragraph()
    if bold and text.startswith(bold): set_font(p.add_run(bold),bold=True); p.add_run(text[len(bold):])
    else: p.add_run(text)
    return p
def bullets(doc,items):
    for x in items: doc.add_paragraph(x,style="List Bullet")
def steps(doc,items):
    for i,x in enumerate(items,1):
        p=doc.add_paragraph(); p.paragraph_format.left_indent=Inches(.22); p.paragraph_format.first_line_indent=Inches(-.22)
        set_font(p.add_run(f"{i}.  "),bold=True,color=TEAL); p.add_run(x)

def pic(doc,path,caption,width=6.85):
    if not path or not Path(path).exists(): return
    p=doc.add_paragraph(); p.alignment=WD_ALIGN_PARAGRAPH.CENTER; p.paragraph_format.keep_with_next=True
    shp=p.add_run().add_picture(str(path),width=Inches(width)); shp._inline.docPr.set("descr",caption)
    c=doc.add_paragraph(caption,style="Caption"); c.alignment=WD_ALIGN_PARAGRAPH.CENTER; c.paragraph_format.keep_with_next=False

def borders(cell):
    pr=cell._tc.get_or_add_tcPr(); bs=OxmlElement("w:tcBorders")
    for e in ("top","left","bottom","right","insideH","insideV"):
        n=OxmlElement(f"w:{e}"); n.set(qn("w:val"),"single"); n.set(qn("w:sz"),"5"); n.set(qn("w:color"),LINE); bs.append(n)
    pr.append(bs)
def shade(cell,color):
    pr=cell._tc.get_or_add_tcPr(); s=OxmlElement("w:shd"); s.set(qn("w:fill"),color); pr.append(s)
def table(doc,headers,rows,widths=None):
    t=doc.add_table(rows=1,cols=len(headers)); t.alignment=WD_TABLE_ALIGNMENT.CENTER; t.autofit=False
    for j,x in enumerate(headers):
        c=t.rows[0].cells[j]; c.text=x; shade(c,NAVY); borders(c); c.vertical_alignment=WD_ALIGN_VERTICAL.CENTER
        for r in c.paragraphs[0].runs: set_font(r,9,True,WHITE)
    for ri,row in enumerate(rows):
        cs=t.add_row().cells
        for j,x in enumerate(row):
            cs[j].text=str(x); borders(cs[j]); cs[j].vertical_alignment=WD_ALIGN_VERTICAL.CENTER
            if ri%2: shade(cs[j],PALE)
            for r in cs[j].paragraphs[0].runs: set_font(r,9)
    if widths:
        for row in t.rows:
            for j,w in enumerate(widths): row.cells[j].width=Inches(w)
    return t

def full_manual(img):
    d=Document(); setup(d,"Manual completo"); cover(d,"Manual completo de PaddyTools","Funcionamiento, procedimientos y lectura de resultados")
    h(d,"1 Qué es PaddyTools"); para(d,"PaddyTools reúne en una sola herramienta la información operativa de WooCommerce, Monday y los registros internos. Permite localizar un caso, actuar sobre él y dejar trazabilidad del trabajo.")
    table(d,["Bloque","Uso principal"],[["Consulta global","Localizar pedidos, reservas, prendas especiales e incidencias"],["PackingList","Preparar, comprobar, guardar y recuperar envíos a colegios"],["Reservas","Crear y consultar reservas y prendas especiales"],["Incidencias","Registrar problemas, imágenes, estados e historial"],["Hotline","Responder y archivar comunicaciones"],["KPIs","Medir volumen, tiempo, calidad y necesidades de personal"]],[1.7,5.0])
    h(d,"2 Acceso y seguridad"); bullets(d,["Cada persona utiliza su propio usuario.","No se comparten contraseñas ni sesiones.","Los permisos dependen del perfil; algunas funciones son solo de Rocío o Administración.","El historial identifica al usuario que realiza cada acción nueva."])
    pic(d,img["inicio"],"Cabecera principal y accesos de PaddyTools")
    d.add_page_break()

    h(d,"3 Pantalla principal y consulta global"); para(d,"La búsqueda principal consulta varias fuentes a la vez. Se puede buscar por número, nombre, teléfono o referencia.")
    steps(d,["Escribir la referencia completa siempre que sea posible.","Pulsar Buscar.","Si aparecen varias coincidencias, comprobar nombre, teléfono, colegio y origen.","Abrir la tarjeta correcta o usar sus botones de acción."])
    h(d,"Qué puede aparecer",2); bullets(d,["Pedido de WooCommerce.","Reserva o prenda especial de Monday.","Incidencia pendiente o solucionada buscada directamente.","Notas internas, actividad y comunicaciones de Hotline relacionadas."])
    pic(d,img["pedido"],"Ficha de un pedido con acciones y actividad")
    h(d,"4 Ficha del pedido",1); bullets(d,["Resumen: cliente, pedido, estado y total.","Artículos: prendas, tallas y unidades.","Envío: datos logísticos.","Notas: anotaciones internas; las comunicaciones de Hotline se muestran en su bloque propio.","Movimientos: cambios y acciones.","Documentos: factura y albarán de devolución cuando están disponibles."])
    para(d,"Crear incidencia: el botón abre el formulario habitual de Incidencias con la referencia ya rellenada. No crea un formulario paralelo.")
    d.add_page_break()

    h(d,"5 PackingList"); pic(d,img["packing"],"Formulario para generar un PackingList")
    steps(d,["Elegir el colegio. En ese momento comienza la medición automática.","Indicar fecha de envío y periodo de los pedidos.","Escribir o dictar las referencias, separadas por cajas.","Revisar todas las advertencias y líneas rojas.","Generar el PackingList; el tiempo termina cuando se guarda correctamente."])
    h(d,"Control del colegio",2); para(d,"PaddyTools compara el colegio del envío con el colegio de cada referencia. Denominaciones configuradas como equivalentes, por ejemplo un colegio y su variante Web, se aceptan. Una línea roja exige revisar el dato antes de continuar.")
    h(d,"Borradores",2); para(d,"Si el trabajo no se termina, se puede guardar un borrador compartido. Más tarde se recupera, se continúa y se actualiza. Al generar el PackingList definitivo, el borrador correspondiente se elimina.")
    h(d,"Registros y mensajes",2); bullets(d,["Los registros se agrupan por semanas y se filtran por fechas.","Mensajes carga solo el intervalo elegido.","Las referencias PA no generan mensajes automáticos; IPA, R y demás referencias admitidas sí.","¿Envío? consulta todo el histórico, aunque el registro inicial muestre pocas semanas."])
    pic(d,img["envio"],"Consulta de la fecha de envío de una referencia")
    d.add_page_break()

    h(d,"6 Reservas y prendas especiales"); para(d,"Reservas muestra la información de Monday y permite crear una reserva nueva o asociarla a un pedido existente.")
    pic(d,img["reserva"],"Formulario de creación de reserva",4.15)
    steps(d,["Indicar número de reserva o pedido.","Elegir o crear el cliente.","Revisar teléfono, email y colegio.","Elegir artículo, talla, unidades y fechas.","Guardar la reserva."])
    para(d,"Al empezar un formulario nuevo se inicia la medición automática; al guardar finaliza y queda asignada al usuario conectado.")
    pic(d,img["especial"],"La referencia de una prenda especial es su número de reserva")
    bullets(d,["Las tarjetas muestran la ID o número de reserva.","Incluyen Imprimir etiqueta, Imprimir y Preparar email.","Los comentarios de Monday se muestran junto a la reserva cuando están disponibles."])
    d.add_page_break()

    h(d,"7 Incidencias"); para(d,"Incidencias incluye pedidos, tienda, incidencias internas autorizadas, recogidas de colegios, mediciones y hoja de registro.")
    pic(d,img["incidencia_ficha"],"Formulario habitual de una incidencia")
    h(d,"Crear una incidencia",2); steps(d,["Introducir o recibir la referencia desde la ficha del pedido.","Buscar o cargar los datos.","Completar fecha, colegio de origen y descripción objetiva.","Marcar recogida y/o envío cuando corresponda.","Subir una imagen o pegarla desde el portapapeles.","Guardar."])
    bullets(d,["Si no existe número, usar Crear ID automático para evitar duplicados.","El colegio de la incidencia determina la etiqueta y la recogida, aunque el producto sea de otro colegio.","Las imágenes guardadas vuelven a verse al reabrir y se incluyen en la impresión correspondiente."])
    h(d,"Solución automática",2)
    table(d,["Situación","Cuándo queda solucionada"],[["Solo recogida","Al marcar recibida"],["Solo envío","Al marcar enviado"],["Recogida y envío","Cuando ambas están completas"],["Sin recogida ni envío","Se puede marcar manualmente"]],[2.3,4.4])
    h(d,"Registro e historial",2); bullets(d,["Las solucionadas no se muestran en la lista normal.","Una búsqueda directa sí puede encontrarlas y la ficha del pedido también.","Las acciones nuevas guardan usuario, acción, fecha y hora.","Los registros antiguos pueden no tener autor si se crearon antes del historial."])
    pic(d,img["incidencia"],"Hoja de registro de incidencias",4.0)
    d.add_page_break()

    h(d,"8 Recogidas y recepción"); para(d,"Recogidas agrupa los casos que deben volver desde un colegio. La ubicación es siempre el colegio de origen de la incidencia.")
    bullets(d,["Revisar colegio, producto, talla y unidades.","Marcar recibido solo cuando la mercancía haya llegado.","La fecha y hora de recepción y el usuario quedan en el historial de las acciones nuevas."])
    h(d,"9 Hotline"); para(d,"Hotline ayuda a responder mensajes y conservar el historial relacionado con un pedido o reserva.")
    steps(d,["Pegar el mensaje recibido.","Indicar la referencia cuando se conoce.","Generar y revisar la respuesta.","Si el mensaje está en inglés, comprobar la traducción al castellano y la respuesta en ambos idiomas.","Enviar por email o WhatsApp.","Guardar contacto."])
    pic(d,img["hotline"],"Las comunicaciones aparecen en el bloque Hotline de la ficha")
    para(d,"Las comunicaciones vinculadas se muestran en el bloque Hotline, no como notas de seguimiento. Los registros antiguos aparecen si contienen una referencia que puede relacionarse de forma segura.")
    d.add_page_break()

    h(d,"10 Contadores de trabajo"); para(d,"El contador manual permanece visible en todas las vistas. Una tarea manual puede continuar mientras se realiza una tarea con medición automática; cada proceso conserva su tiempo.")
    table(d,["Medición","Inicio","Fin"],[["PackingList automática","Al elegir colegio","Al guardar el listado"],["Reserva automática","Al empezar el formulario","Al guardar"],["Incidencia automática","Al empezar el formulario","Al guardar"],["Hotline automática","Al pegar el mensaje","Al guardar contacto"],["Manual","Al pulsar Iniciar","Al pulsar Terminar"]],[1.5,2.5,2.5])
    para(d,"Entre las tareas manuales pueden figurar Preparar pedidos, Cambiar estado inicial, Gestionar preparación de reservas, Avisos llegada colegios, Atender emails y teléfono, Mantenimiento para Administración y otras tareas autorizadas.")
    h(d,"11 KPIs y filtros"); para(d,"El panel se filtra por fecha y por persona o conjunto del equipo. Toda lectura debe interpretarse con el mismo periodo y un volumen suficiente.")
    table(d,["Lectura","Qué significa"],[["Minutos por pedido","Tiempo total dividido entre pedidos medidos"],["Minutos por producto","Útil cuando los pedidos tienen tamaños distintos"],["Tiempo por PackingList","Duración media de un envío completo"],["Tiempo por mensaje","Lectura, decisión, redacción y guardado"],["Errores por 100 tareas","Comparación de calidad ajustada por volumen"],["Tiempo de corrección","Coste operativo de reparar errores"],["Personas necesarias","Estimación según volumen, media y horas disponibles"]],[2.2,4.5])
    h(d,"Cómo analizar",2); steps(d,["Elegir un periodo representativo.","Comparar volumen y tiempo por unidad.","Revisar errores por 100 tareas, gravedad y reincidencias.","Abrir los casos concretos.","Distinguir formación, proceso, herramienta y dato de origen.","Aplicar una mejora y medir de nuevo."])
    d.add_page_break()

    h(d,"12 Calidad de datos y buenas prácticas"); bullets(d,["Usar siempre el login propio.","No duplicar una medición automática con otra manual.","Describir hechos, no opiniones.","Asignar el error al proceso donde se originó.","Comparar tasas y medias, no solo totales.","No repetir una acción varias veces ante un error; anotar referencia, hora, usuario y pantalla."])
    h(d,"13 Uso en móvil e impresión"); pic(d,img["movil"],"Vista móvil de PaddyTools",3.0)
    bullets(d,["En iPhone, Safari ofrece la compatibilidad más completa con impresión y dictado.","Para imprimir, abrir en Safari y usar Compartir > Imprimir con una impresora AirPrint.","Si la app instalada no abre la impresión, usar Abrir en Safari.","Comprobar la vista previa: etiquetas y fichas deben ocupar una sola hoja cuando así esté previsto."])
    h(d,"14 Solución rápida de problemas"); table(d,["Problema","Qué revisar"],[["No aparece un registro","Referencia exacta, origen y búsqueda directa"],["Pedido rojo en PackingList","Colegio real y equivalencias"],["Documento en blanco","Actualizar una vez y anotar la referencia"],["No imprime en iPhone","Abrir en Safari y comprobar AirPrint"],["Dato de cliente incorrecto","Corregir primero WooCommerce o Monday"],["Tiempo duplicado","Revisar tarea automática y manual"]],[2.1,4.6])
    h(d,"15 Permisos y soporte"); para(d,"Las funciones visibles dependen del usuario. Incidencias internas, mantenimiento y eliminaciones sensibles pueden estar limitadas. Ante un fallo, comunicar referencia, usuario, fecha, hora, dispositivo y captura.")
    return d

def quick_manual(img):
    d=Document(); setup(d,"Guía rápida visual"); cover(d,"Guía rápida visual de PaddyTools","Pasos sencillos para las tareas habituales")
    h(d,"1 Empieza aquí"); pic(d,img["inicio"],"Botones principales de PaddyTools")
    bullets(d,["Busca desde la pantalla principal.","Usa tu propio usuario.","El contador manual está en la cabecera.","PackingList, Recogidas, ¿Envío? e Incidencias están siempre accesibles."])
    d.add_page_break()
    h(d,"2 Buscar un pedido o una reserva"); steps(d,["Escribe número, nombre o teléfono.","Pulsa Buscar.","Comprueba los datos antes de abrir."])
    pic(d,img["pedido"],"Resultado y acciones de una ficha")
    d.add_page_break()
    h(d,"3 Crear un PackingList"); pic(d,img["packing"],"Pantalla de generación")
    steps(d,["Elige colegio.","Indica fecha y periodo.","Introduce o dicta las referencias por cajas.","Revisa las líneas rojas.","Genera y comprueba el documento."])
    para(d,"¿No terminas hoy? Guarda un borrador. Mañana elígelo, continúa y actualízalo.","¿No terminas hoy?")
    d.add_page_break()
    h(d,"4 Saber cuándo se envió"); pic(d,img["envio"],"Elige la referencia exacta y pulsa Buscar")
    steps(d,["Abre ¿Envío?.","Elige PA, IPA, R o RPA correcta.","Pulsa Buscar esta referencia."])
    d.add_page_break()
    h(d,"5 Crear una reserva"); pic(d,img["reserva"],"Formulario de reserva",4.1)
    steps(d,["Escribe el número.","Elige cliente y colegio.","Selecciona artículo, talla y unidades.","Revisa fechas y observaciones.","Guarda."])
    d.add_page_break()
    h(d,"6 Ver una reserva o prenda especial"); pic(d,img["reserva_ficha"],"Ficha de reserva")
    bullets(d,["La ID es el número de reserva.","Puedes imprimir etiqueta, imprimir ficha o preparar email.","Los comentarios de Monday aparecen en la ficha."])
    d.add_page_break()
    h(d,"7 Crear una incidencia"); pic(d,img["incidencia_ficha"],"Formulario de incidencia")
    steps(d,["Carga la referencia.","Describe qué ha ocurrido.","Elige el colegio de origen.","Marca recogida o envío.","Sube o pega imágenes.","Guarda."])
    para(d,"Sin número: marca Crear ID automático.","Sin número:")
    d.add_page_break()
    h(d,"8 Cuándo se soluciona"); table(d,["Tiene","Se soluciona"],[["Recogida","Al recibir"],["Envío","Al enviar"],["Ambos","Al completar ambos"],["Ninguno","Manual"]],[2.4,4.2])
    bullets(d,["Las solucionadas se ocultan de la lista normal.","Puedes encontrarlas escribiendo su número.","El historial muestra quién hizo cada acción nueva y cuándo."])
    d.add_page_break()
    h(d,"9 Responder en Hotline"); pic(d,img["hotline"],"Historial Hotline dentro de la ficha")
    steps(d,["Pega el mensaje.","Añade la referencia.","Genera y revisa la respuesta.","Envía por el canal correcto.","Guarda contacto."])
    para(d,"El historial aparecerá en el bloque Hotline, no dentro de Notas.")
    d.add_page_break()
    h(d,"10 Usar el contador"); bullets(d,["Tarea manual: elige una tarea y pulsa Iniciar; al acabar pulsa Terminar.","PackingList, reservas, incidencias y Hotline tienen mediciones automáticas.","Puedes mantener una tarea manual mientras haces una gestión automática."])
    h(d,"11 Leer KPIs"); table(d,["Mira","Para saber"],[["Tiempo por unidad","Cuánto cuesta cada tarea"],["Volumen","Cuánto trabajo se hizo"],["Errores por 100","Calidad comparable"],["Tiempo de corrección","Coste de los errores"],["Filtro usuario","Lecturas de una persona"],["Filtro general","Lecturas del equipo"]],[2.3,4.3])
    d.add_page_break()
    h(d,"12 En el móvil"); pic(d,img["movil"],"Vista móvil",3.0)
    bullets(d,["Usa Safari en iPhone para imprimir y dictar.","Para AirPrint: Compartir > Imprimir.","Si la app instalada falla al imprimir, abre la misma página en Safari."])
    h(d,"13 Si algo falla"); bullets(d,["No repitas muchas veces la misma acción.","Anota referencia, usuario, fecha, hora y dispositivo.","Haz una captura.","Comprueba si el dato original está bien en WooCommerce o Monday."])
    return d

def main():
    MANUALS.mkdir(parents=True,exist_ok=True)
    ASSETS.mkdir(parents=True,exist_ok=True)
    imgs={k:anonymize(k,v) for k,v in SOURCES.items()}
    outputs=[]
    for name,doc in (("Manual_completo_PaddyTools",full_manual(imgs)),("Guia_rapida_visual_PaddyTools",quick_manual(imgs))):
        path=MANUALS/f"{name}.docx"; doc.save(path); outputs.append(path)
    print("\n".join(map(str,outputs)))

if __name__=="__main__": main()
