from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "docs"
ASSETS = DOCS / "manual_visual_assets"
OUTPUT = DOCS / "Manual_visual_PaddyTools.docx"
SOURCE_SCREENSHOT = Path(
    r"C:\Users\LORENA~1\AppData\Local\Temp\codex-clipboard-a9580a31-0204-42eb-9766-7b20b96cfb38.png"
)
LOGO = ROOT / "public" / "paddy-logo-granate.png"

NAVY = "102D4C"
TEAL = "12636C"
GREEN = "198754"
ORANGE = "D76623"
BURGUNDY = "7F1D3A"
LIGHT_BLUE = "EAF3F8"
LIGHT_GREEN = "E8F5EE"
LIGHT_ORANGE = "FFF0E5"
LIGHT_GRAY = "F4F7F9"
MID_GRAY = "D9E2E8"
TEXT_GRAY = "5D6F82"
WHITE = "FFFFFF"
BLACK = "000000"


def font(size, bold=False):
    name = "arialbd.ttf" if bold else "arial.ttf"
    return ImageFont.truetype(str(Path(r"C:\Windows\Fonts") / name), size)


def rounded(draw, box, fill, radius=24, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def center_text(draw, box, text, fnt, fill):
    left, top, right, bottom = box
    bbox = draw.multiline_textbbox((0, 0), text, font=fnt, align="center", spacing=5)
    width = bbox[2] - bbox[0]
    height = bbox[3] - bbox[1]
    draw.multiline_text(
        ((left + right - width) / 2, (top + bottom - height) / 2),
        text,
        font=fnt,
        fill=fill,
        align="center",
        spacing=5,
    )


def make_flow_image(path):
    img = Image.new("RGB", (1600, 820), "white")
    draw = ImageDraw.Draw(img)
    draw.text((70, 50), "Todo el trabajo en un solo lugar", font=font(46, True), fill="#102D4C")
    draw.text((70, 112), "Cada bloque guarda datos para trabajar y medir mejor.", font=font(27), fill="#5D6F82")
    rounded(draw, (610, 310, 990, 530), "#102D4C", 34)
    center_text(draw, (610, 310, 990, 530), "PaddyTools", font(48, True), "white")
    blocks = [
        ((80, 250, 420, 390), "Consulta global", "#EAF3F8"),
        ((80, 465, 420, 605), "PackingList", "#FFF0E5"),
        ((1180, 250, 1520, 390), "Reservas e\nincidencias", "#E8F5EE"),
        ((1180, 465, 1520, 605), "Hotline", "#F6E8ED"),
        ((630, 650, 970, 780), "KPIs y calidad", "#EAF3F8"),
    ]
    for box, label, color in blocks:
        rounded(draw, box, color, 26, "#D9E2E8", 2)
        center_text(draw, box, label, font(30, True), "#102D4C")
        cx = (box[0] + box[2]) // 2
        cy = (box[1] + box[3]) // 2
        draw.line((800, 420, cx, cy), fill="#78909C", width=5)
    img.save(path, quality=95)


def make_kpi_image(path):
    img = Image.new("RGB", (1600, 930), "white")
    draw = ImageDraw.Draw(img)
    draw.text((70, 45), "Cómo leer los tiempos", font=font(46, True), fill="#102D4C")
    draw.text((70, 108), "Ejemplo sencillo. Los datos reales cambian con el filtro elegido.", font=font(25), fill="#5D6F82")
    cards = [
        ((70, 210, 510, 430), "7,5 min", "Trabajo por pedido", "Preparar y comprobar", "#EAF3F8"),
        ((580, 210, 1020, 430), "18 min", "Tiempo por PackingList", "Desde elegir colegio hasta guardar", "#FFF0E5"),
        ((1090, 210, 1530, 430), "6 min", "Tiempo por mensaje", "Desde pegar el email hasta guardar", "#E8F5EE"),
    ]
    for box, value, title, subtitle, color in cards:
        rounded(draw, box, color, 28, "#D9E2E8", 2)
        draw.text((box[0] + 28, box[1] + 28), value, font=font(48, True), fill="#102D4C")
        draw.text((box[0] + 28, box[1] + 102), title, font=font(25, True), fill="#102D4C")
        draw.multiline_text((box[0] + 28, box[1] + 145), subtitle, font=font(21), fill="#5D6F82", spacing=4)
    draw.text((70, 525), "La lectura correcta", font=font(32, True), fill="#102D4C")
    steps = [
        ("1", "Elegir el mismo periodo", "Comparar una semana con otra semana, no con un mes."),
        ("2", "Mirar el volumen", "Más pedidos suelen necesitar más tiempo."),
        ("3", "Usar la media por unidad", "Minutos por pedido, producto, lista o mensaje."),
    ]
    y = 605
    for number, title, text in steps:
        rounded(draw, (80, y, 145, y + 65), "#12636C", 32)
        center_text(draw, (80, y, 145, y + 65), number, font(28, True), "white")
        draw.text((175, y - 2), title, font=font(25, True), fill="#102D4C")
        draw.text((175, y + 35), text, font=font(21), fill="#5D6F82")
        y += 95
    img.save(path, quality=95)


def make_quality_image(path):
    img = Image.new("RGB", (1600, 900), "white")
    draw = ImageDraw.Draw(img)
    draw.text((70, 45), "No basta con contar errores", font=font(46, True), fill="#102D4C")
    draw.text((70, 108), "Hay que compararlos con el trabajo realizado.", font=font(27), fill="#5D6F82")
    people = [
        ("Persona A", 500, 5, 1.0, "#12636C", 260),
        ("Persona B", 50, 2, 4.0, "#D76623", 520),
    ]
    for name, tasks, errors, rate, color, y in people:
        draw.text((90, y), name, font=font(30, True), fill="#102D4C")
        draw.text((90, y + 48), f"{tasks} tareas · {errors} errores", font=font(23), fill="#5D6F82")
        draw.rounded_rectangle((530, y + 5, 1430, y + 95), radius=20, fill="#EFF3F5")
        width = int(850 * rate / 5)
        draw.rounded_rectangle((530, y + 5, 530 + width, y + 95), radius=20, fill=color)
        draw.text((1450, y + 25), f"{rate:.1f}", font=font(32, True), fill="#102D4C", anchor="mm")
        draw.text((1480, y + 71), "por 100", font=font(18), fill="#5D6F82", anchor="mm")
    rounded(draw, (90, 715, 1510, 835), "#E8F5EE", 24)
    center_text(
        draw,
        (110, 720, 1490, 830),
        "La Persona A tiene más errores en total, pero una tasa mucho menor.\nLa tasa por 100 tareas permite comparar de forma justa.",
        font(25, True),
        "#155C3D",
    )
    img.save(path, quality=95)


def set_cell_shading(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def set_cell_borders(cell, color=MID_GRAY, size="6"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        tag = f"w:{edge}"
        element = borders.find(qn(tag))
        if element is None:
            element = OxmlElement(tag)
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:color"), color)


def set_cell_margin(cell, top=100, start=120, bottom=100, end=120):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for m, v in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{m}"))
        if node is None:
            node = OxmlElement(f"w:{m}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(v))
        node.set(qn("w:type"), "dxa")


def set_run_font(run, name="Arial", size=10.5, color=BLACK, bold=None):
    run.font.name = name
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:ascii"), name)
    run._element.get_or_add_rPr().get_or_add_rFonts().set(qn("w:hAnsi"), name)
    run.font.size = Pt(size)
    run.font.color.rgb = RGBColor.from_string(color)
    if bold is not None:
        run.bold = bold


def add_page_field(paragraph):
    run = paragraph.add_run()
    fld_char = OxmlElement("w:fldChar")
    fld_char.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = "1"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    for node in (fld_char, instr, separate, text, end):
        run._r.append(node)


def add_heading(doc, text, level=1):
    p = doc.add_heading(text, level=level)
    p.paragraph_format.keep_with_next = True
    return p


def add_paragraph(doc, text="", bold_lead=None):
    p = doc.add_paragraph()
    if bold_lead and text.startswith(bold_lead):
        lead = p.add_run(bold_lead)
        lead.bold = True
        p.add_run(text[len(bold_lead):])
    else:
        p.add_run(text)
    return p


def add_bullets(doc, items):
    for item in items:
        p = doc.add_paragraph(style="List Bullet")
        p.add_run(item)


def add_steps(doc, steps):
    # Use visible numbers instead of Word's shared list counter. This makes
    # every independent procedure start at 1 in Word, PDF and other viewers.
    for index, step in enumerate(steps, start=1):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Inches(0.18)
        p.paragraph_format.first_line_indent = Inches(-0.18)
        p.add_run(f"{index}.  {step}")


def add_picture(doc, path, caption, width=6.6):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    run = p.add_run()
    shape = run.add_picture(str(path), width=Inches(width))
    doc_pr = shape._inline.docPr
    doc_pr.set("descr", caption)
    cap = doc.add_paragraph(caption)
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cap.style = doc.styles["Caption"]


def add_table(doc, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    header = table.rows[0].cells
    header_properties = table.rows[0]._tr.get_or_add_trPr()
    header_properties.append(OxmlElement("w:tblHeader"))
    for index, value in enumerate(headers):
        header[index].text = value
        set_cell_shading(header[index], NAVY)
        header[index].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        for run in header[index].paragraphs[0].runs:
            set_run_font(run, size=9.5, color=WHITE, bold=True)
            header[index].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER
        set_cell_borders(header[index])
        set_cell_margin(header[index])
    for row_index, values in enumerate(rows):
        cells = table.add_row().cells
        for index, value in enumerate(values):
            cells[index].text = str(value)
            cells[index].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_shading(cells[index], "F5F8FA" if row_index % 2 else WHITE)
            set_cell_borders(cells[index])
            set_cell_margin(cells[index])
            for run in cells[index].paragraphs[0].runs:
                set_run_font(run, size=9.2)
            cells[index].paragraphs[0].alignment = (
                WD_ALIGN_PARAGRAPH.CENTER if index > 0 else WD_ALIGN_PARAGRAPH.LEFT
            )
    if widths:
        for row in table.rows:
            for idx, width in enumerate(widths):
                row.cells[idx].width = Cm(width)
    return table


def page_break(doc):
    doc.add_page_break()


def build_document():
    ASSETS.mkdir(parents=True, exist_ok=True)
    make_flow_image(ASSETS / "mapa_paddytools.png")
    make_kpi_image(ASSETS / "lectura_tiempos.png")
    make_quality_image(ASSETS / "comparar_errores.png")

    doc = Document()
    section = doc.sections[0]
    section.top_margin = Cm(1.8)
    section.bottom_margin = Cm(1.7)
    section.left_margin = Cm(2.1)
    section.right_margin = Cm(2.1)

    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Arial"
    normal._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
    normal._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
    normal.font.size = Pt(10.5)
    normal.font.color.rgb = RGBColor.from_string(BLACK)
    normal.paragraph_format.space_after = Pt(7)
    normal.paragraph_format.line_spacing = 1.12

    title_style = styles["Title"]
    title_style.font.name = "Arial"
    title_style._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
    title_style._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
    title_style.font.size = Pt(30)
    title_style.font.bold = True
    title_style.font.color.rgb = RGBColor.from_string(BLACK)

    for name, size in (("Heading 1", 21), ("Heading 2", 15), ("Heading 3", 12)):
        style = styles[name]
        style.font.name = "Arial"
        style._element.rPr.rFonts.set(qn("w:ascii"), "Arial")
        style._element.rPr.rFonts.set(qn("w:hAnsi"), "Arial")
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor.from_string(BLACK)
        style.paragraph_format.space_before = Pt(14 if name == "Heading 1" else 10)
        style.paragraph_format.space_after = Pt(6)
        style.paragraph_format.keep_with_next = True

    footer = section.footer.paragraphs[0]
    footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = footer.add_run("PaddyTools  ·  Manual de uso  ·  ")
    set_run_font(run, size=8.5, color=TEXT_GRAY)
    add_page_field(footer)

    # Portada
    if LOGO.exists():
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        logo = p.add_run().add_picture(str(LOGO), width=Inches(1.25))
        logo._inline.docPr.set("descr", "Logotipo de Paddy")
    p = doc.add_paragraph(style="Title")
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.add_run("Manual visual de PaddyTools")
    subtitle = doc.add_paragraph()
    subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = subtitle.add_run("Guía sencilla para trabajar y entender los KPIs")
    set_run_font(r, size=16, color=TEAL, bold=True)
    intro = doc.add_paragraph()
    intro.alignment = WD_ALIGN_PARAGRAPH.CENTER
    intro.paragraph_format.space_before = Pt(22)
    r = intro.add_run(
        "Este manual explica qué hace cada bloque, qué debe guardar el equipo y "
        "cómo leer los datos de productividad y calidad sin sacar conclusiones injustas."
    )
    set_run_font(r, size=12, color=TEXT_GRAY)
    add_picture(doc, ASSETS / "mapa_paddytools.png", "Mapa sencillo de PaddyTools", 6.55)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p.add_run("Versión 1.0  ·  Noviembre de 2026")
    set_run_font(r, size=9.5, color=TEXT_GRAY)

    page_break(doc)
    add_heading(doc, "Qué aprenderemos", 1)
    add_paragraph(doc, "Al terminar esta guía sabremos usar las tareas principales y explicar qué significa cada dato de KPIs.")
    add_table(
        doc,
        ["Bloque", "Para qué sirve"],
        [
            ["Consulta global", "Encontrar pedidos, reservas, clientes e incidencias"],
            ["PackingList", "Preparar y guardar envíos a colegios"],
            ["Reservas", "Consultar y crear reservas"],
            ["Recogidas", "Controlar prendas que deben volver del colegio"],
            ["Incidencias", "Registrar problemas y su solución"],
            ["Hotline", "Preparar respuestas y guardar contactos"],
            ["KPIs", "Medir volumen, tiempo, calidad y errores"],
        ],
        [4.5, 11.5],
    )
    add_heading(doc, "Tres reglas importantes", 2)
    add_bullets(doc, [
        "Cada persona entra con su propio usuario.",
        "No se mide dos veces una tarea que ya tiene contador automático.",
        "Para comparar personas usamos medias y errores por cada 100 tareas, no solo totales.",
    ])

    page_break(doc)
    add_heading(doc, "La pantalla principal", 1)
    add_paragraph(doc, "La consulta global busca al mismo tiempo en WooCommerce, Monday y los registros de PaddyTools.")
    if SOURCE_SCREENSHOT.exists():
        add_picture(doc, SOURCE_SCREENSHOT, "Pantalla principal y accesos de PaddyTools", 6.65)
    add_heading(doc, "Qué podemos buscar", 2)
    add_bullets(doc, [
        "Número de pedido o reserva.",
        "Nombre y apellidos.",
        "Teléfono.",
        "Referencia de una incidencia.",
    ])
    add_paragraph(doc, "Antes de actuar, comprobamos nombre, teléfono y colegio. Si aparecen varios resultados, elegimos el correcto por sus datos, no solo por el nombre.")

    page_break(doc)
    add_heading(doc, "PackingList", 1)
    add_paragraph(doc, "Sirve para preparar un envío completo a un colegio y dejarlo guardado en el historial.")
    add_steps(doc, [
        "Elegir el colegio.",
        "Indicar la fecha y el periodo de pedidos.",
        "Introducir las referencias y las cajas.",
        "Revisar cualquier línea roja.",
        "Generar el PackingList y revisar el documento.",
    ])
    add_heading(doc, "Qué significa una línea roja", 2)
    add_paragraph(doc, "PaddyTools cree que el pedido no pertenece al colegio del envío. Debemos revisar el colegio real antes de continuar. Las formas equivalentes, como un colegio y su versión Web, se tratan como el mismo centro cuando están configuradas.")
    add_heading(doc, "El tiempo se mide solo", 2)
    add_paragraph(doc, "El contador empieza al elegir el colegio y termina cuando el PackingList se guarda. No hay que iniciar otro contador manual.")

    page_break(doc)
    add_heading(doc, "Reservas recogidas e incidencias", 1)
    add_heading(doc, "Reservas", 2)
    add_paragraph(doc, "Podemos consultar cliente, teléfono, colegio, artículo, talla, unidades, estado, observaciones y comentarios de Monday. Al crear una reserva revisamos estos datos antes de guardar.")
    add_heading(doc, "Recogidas", 2)
    add_paragraph(doc, "La recogida se queda en el colegio de la incidencia. El producto puede pertenecer a otro catálogo, pero eso no cambia el colegio donde se recoge ni el que aparece en la etiqueta.")
    add_heading(doc, "Incidencias", 2)
    add_paragraph(doc, "Registramos la fecha, la persona, el colegio, lo que ha ocurrido y la solución. Si no existe número de pedido o reserva, usamos el identificador automático para evitar duplicados.")
    add_table(doc, ["Dato", "Qué escribir"], [
        ["Qué ha pasado", "Un hecho claro y comprobable"],
        ["Solución", "Qué se ha hecho o cuál es el siguiente paso"],
        ["Colegio", "El colegio de origen de la incidencia"],
        ["Estado", "Pendiente, solucionada, enviada o recibida según corresponda"],
    ], [4.3, 11.7])

    page_break(doc)
    add_heading(doc, "Hotline", 1)
    add_paragraph(doc, "Hotline ayuda a preparar una respuesta y guarda el contacto para que todo el equipo pueda consultar el historial.")
    add_steps(doc, [
        "Escribir el email y el asunto si se conocen.",
        "Pegar el mensaje recibido.",
        "Añadir información interna necesaria.",
        "Pulsar Analizar y redactar.",
        "Leer y corregir la propuesta.",
        "Enviar la respuesta por el canal habitual.",
        "Pulsar Guardar contacto.",
    ])
    add_paragraph(doc, "La propuesta nunca se envía sin revisarla. Hotline ayuda a redactar, pero la decisión final es de la persona que atiende el caso.")
    add_heading(doc, "Medición automática", 2)
    add_paragraph(doc, "El tiempo empieza al pegar el mensaje y termina al guardar el contacto. Si pulsamos Nuevo caso sin guardar, el contador se cancela.")

    page_break(doc)
    add_heading(doc, "Contadores de trabajo", 1)
    add_heading(doc, "Tareas automáticas", 2)
    add_table(doc, ["Tarea", "Cuándo empieza", "Cuándo termina"], [
        ["PackingList", "Al elegir el colegio", "Al guardar el PackingList"],
        ["Responder mensajes", "Al pegar el mensaje en Hotline", "Al guardar el contacto"],
    ], [4.0, 6.0, 6.0])
    add_heading(doc, "Tareas manuales", 2)
    add_paragraph(doc, "Para preparar pedidos, comprobar, gestionar incidencias, recogidas u otras tareas usamos el contador rápido.")
    add_steps(doc, [
        "Elegir la tarea.",
        "Pulsar Iniciar al empezar.",
        "Pulsar Terminar al acabar.",
        "Indicar las unidades realizadas y guardar.",
    ])
    add_paragraph(doc, "Si una tarea automática ya quedó guardada, no la añadimos otra vez de forma manual.")

    page_break(doc)
    add_heading(doc, "Cómo usar los filtros de KPIs", 1)
    add_paragraph(doc, "Elegimos una fecha inicial, una fecha final y, si queremos, una persona. Toda la pantalla cambia con esos filtros.")
    add_bullets(doc, [
        "Para ver el equipo completo, elegimos Todas las personas.",
        "Para revisar una evolución individual, elegimos una persona.",
        "Comparamos periodos iguales: semana con semana o mes con mes.",
        "No sacamos conclusiones por un solo día con poco trabajo.",
    ])
    add_picture(doc, ASSETS / "lectura_tiempos.png", "Lectura sencilla de los tiempos medios", 6.55)

    page_break(doc)
    add_heading(doc, "Qué significa cada dato de productividad", 1)
    add_table(doc, ["Lectura", "Qué nos dice", "Qué debemos mirar también"], [
        ["PackingLists", "Envíos completos preparados", "Pedidos dentro de cada lista"],
        ["Pedidos enviados", "Volumen incluido en los envíos", "Número de colegios"],
        ["Colegios atendidos", "Centros distintos con envío", "Dispersión del trabajo"],
        ["Recogidas", "Volumen de devoluciones desde colegios", "Cuántas se han recibido"],
        ["Incidencias", "Problemas abiertos en el periodo", "Pendientes y gravedad"],
        ["Resueltas", "Parte de incidencias terminadas", "Antigüedad de las pendientes"],
        ["Reincidencias", "Problemas que vuelven a repetirse", "Causa común y solución aplicada"],
    ], [3.8, 6.2, 6.0])
    add_heading(doc, "Personas necesarias", 2)
    add_paragraph(doc, "El planificador combina los pedidos previstos, las horas disponibles y el tiempo medio real por pedido. El resultado es una orientación. Debemos dejar margen para descansos, incidencias y tareas que no están incluidas.")

    page_break(doc)
    add_heading(doc, "Cómo leer los tiempos", 1)
    add_table(doc, ["Indicador", "Cálculo sencillo", "Uso"], [
        ["Preparación por pedido", "Minutos de preparación ÷ pedidos", "Saber cuánto cuesta preparar"],
        ["Preparación por producto", "Minutos ÷ productos", "Comparar pedidos de tamaños distintos"],
        ["Trabajo por pedido", "Preparación y comprobación ÷ pedidos", "Planificar personas"],
        ["Tiempo por PackingList", "Minutos ÷ listas terminadas", "Mejorar envíos completos"],
        ["Tiempo por mensaje", "Minutos ÷ contactos guardados", "Mejorar atención al cliente"],
    ], [4.1, 5.7, 6.2])

    page_break(doc)
    add_heading(doc, "Calidad y errores", 1)
    add_paragraph(doc, "Un error se registra con fecha, proceso, responsable del proceso, gravedad, referencia, unidades afectadas, minutos de corrección y si se ha repetido.")
    add_heading(doc, "La comparación justa", 2)
    add_paragraph(doc, "No comparamos solo el número total de errores. Una persona que hace mucho más trabajo puede tener más errores y, aun así, una tasa mejor.")
    add_picture(doc, ASSETS / "comparar_errores.png", "Ejemplo de errores por cada 100 tareas", 6.55)

    page_break(doc)
    add_heading(doc, "Cómo detectar un proceso que necesita mejorar", 1)
    add_steps(doc, [
        "Elegir un periodo con suficiente trabajo.",
        "Mirar qué tareas consumen más tiempo.",
        "Revisar los errores por cada 100 tareas.",
        "Comprobar gravedad, reincidencias y tiempo de corrección.",
        "Abrir los casos concretos y buscar una causa común.",
        "Aplicar una mejora y comparar el periodo siguiente.",
    ])
    add_table(doc, ["Lo que vemos", "Qué puede significar"], [
        ["Tiempo alto y pocos errores", "El proceso puede tener demasiados pasos"],
        ["Tiempo bajo y muchos errores", "Puede faltar comprobación"],
        ["Tiempo y errores altos", "Conviene rediseñar y formar"],
        ["Varias personas fallan en el mismo punto", "Probable problema del proceso o del sistema"],
        ["Una persona mantiene una tasa alta", "Revisar formación, carga y dificultad asignada"],
    ], [6.2, 9.8])

    page_break(doc)
    add_heading(doc, "Qué no debemos hacer con los KPIs", 1)
    add_bullets(doc, [
        "No comparar solo totales sin mirar el volumen.",
        "No valorar a una persona con pocos registros.",
        "No atribuir a una persona un fallo del sistema o del dato original.",
        "No registrar el mismo tiempo dos veces.",
        "No usar la gravedad para castigar: describe el impacto del error.",
        "No decidir por un día aislado; miramos la evolución.",
    ])
    add_heading(doc, "Cuándo aparece Sin base", 2)
    add_paragraph(doc, "Significa que todavía no hay suficiente volumen medido para calcular una tasa. No significa cero errores ni buen rendimiento.")

    page_break(doc)
    add_heading(doc, "Guion breve para explicarlo al equipo", 1)
    add_paragraph(doc, "Podemos presentar PaddyTools en unos diez minutos siguiendo este orden:")
    add_steps(doc, [
        "PaddyTools reúne pedidos, reservas, incidencias, envíos y mensajes.",
        "Cada persona entra con su usuario para que los datos sean correctos.",
        "PackingList y Hotline miden el tiempo automáticamente.",
        "El resto de tareas se mide con el contador rápido.",
        "KPIs muestra volumen y tiempo medio, no solo horas totales.",
        "Calidad compara errores por cada 100 tareas.",
        "Los datos sirven para mejorar procesos y formación, no para juzgar sin contexto.",
    ])
    add_heading(doc, "Comprobación final", 2)
    add_bullets(doc, [
        "¿Cada persona utiliza su usuario?",
        "¿Los contadores empiezan y terminan en el momento real?",
        "¿Los errores están asignados al proceso donde se originaron?",
        "¿La comparación usa un periodo y volumen suficientes?",
        "¿La mejora se comprobará de nuevo en el siguiente periodo?",
    ])

    doc.core_properties.title = "Manual visual de PaddyTools"
    doc.core_properties.subject = "Guía de uso y explicación de KPIs"
    doc.core_properties.author = "Paddy"
    doc.core_properties.keywords = "PaddyTools, manual, KPIs, productividad, calidad"
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    build_document()
