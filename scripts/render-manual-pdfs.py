from pathlib import Path
import pypdfium2 as pdfium

docs = Path(__file__).resolve().parents[1] / "docs" / "manuales"
for stem in ("Manual_completo_PaddyTools", "Guia_rapida_visual_PaddyTools"):
    out = docs / ("_qa_" + stem)
    out.mkdir(exist_ok=True)
    pdf = pdfium.PdfDocument(docs / f"{stem}.pdf")
    for i in range(len(pdf)):
        image = pdf[i].render(scale=1.35).to_pil()
        image.save(out / f"page-{i+1:02d}.png")
    print(stem, len(pdf))
