from pathlib import Path
from PIL import Image, ImageDraw

docs = Path(__file__).resolve().parents[1] / "docs" / "manuales"
for stem in ("Manual_completo_PaddyTools", "Guia_rapida_visual_PaddyTools"):
    folder = docs / ("_qa_" + stem)
    pages = sorted(folder.glob("page-*.png"))
    for batch, start in enumerate(range(0, len(pages), 4), 1):
        subset = pages[start:start+4]
        thumbs=[]
        for p in subset:
            im=Image.open(p).convert("RGB")
            im.thumbnail((520,680))
            thumbs.append((p.name,im.copy()))
        sheet=Image.new("RGB",(1100,1420),"#d8d8d8")
        draw=ImageDraw.Draw(sheet)
        for j,(name,im) in enumerate(thumbs):
            x=20+(j%2)*540; y=25+(j//2)*700
            sheet.paste(im,(x,y+25)); draw.text((x,y+4),name,fill="black")
        sheet.save(folder/f"contact-{batch}.png")
