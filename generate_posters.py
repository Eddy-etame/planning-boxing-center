# -*- coding: utf-8 -*-
"""
Génère les affiches planning dans les 3 formats demandés par le boss :
  1. PNG natif (le style actuel de la plateforme — l'affiche telle quelle)
  2. PDF A4 imprimable
  3. PNG Story 9:16 (1080×1920, letterbox navy)
Couleur par DISCIPLINE, jamais par coach — aucun nom de coach n'apparaît
(règle appliquée par src/lib/posterExport.js). Les plannings d'origine de
Portet sont, eux, coloriés par coach : on ne les recopie pas.
Les 8 salles sont exportées, États-Unis compris.
Prérequis : le serveur next dev tourne sur :3001.
"""
import asyncio
import os
import sys
from playwright.async_api import async_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "images", "rentree-2026")
WITH_QR = os.environ.get("QR", "1") != "0"
OUT = os.path.join(BASE_OUT, "social" if WITH_QR else "web")
os.makedirs(OUT, exist_ok=True)

SALLES = [
    # Le provisoire de Portet a ses propres visuels : il vit du 24 aout au
    # 3 octobre, puis les deux salles prennent le relais. Tant qu il est en
    # ligne, il lui faut ses affiches comme aux autres.
    "portet-provisoire",
    "portet-combat", "portet-mma", "minimes", "saint-cyprien", "ramonville",
    # Les trois salles des Etats-Unis etaient exclues de l'export : elles
    # n'avaient donc AUCUNE affiche, alors que leurs plannings existent.
    "etats-unis-boxe", "etats-unis-mma", "etats-unis-fitness",
]

def qr_data_uri(salle):
    """QR vers la boutique. Trois reglages qui decident s il se scanne ou non :

    · border=4 — la ZONE DE SILENCE. La norme QR en exige quatre modules ;
      il en avait deux. Un scanner qui ne trouve pas ce blanc autour du code
      ne verrouille pas dessus, meme si l image est nette.
    · box_size=12 — chaque module fait 12 px a la source au lieu de 8, donc
      l image reste franche apres la reduction en story 1080.
    · correction L — l URL est courte (32 caracteres), on reste en version
      basse : moins de modules, donc des modules PLUS GROS a taille egale.
      C est le reglage qui fait qu on scanne de loin sans zoomer.
    """
    import io as _io
    import qrcode
    url = "https://boutique.boxingcenter.fr/"
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_L,
                       box_size=12, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buf = _io.BytesIO()
    img.save(buf, format="PNG")
    import base64
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

async def export_for_target(with_qr):
    target_name = "social" if with_qr else "web"
    out_dir = os.path.join(BASE_OUT, target_name)
    os.makedirs(out_dir, exist_ok=True)
    print(f"\n==================== EXPORTING FOR {target_name.upper()} ====================")
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # device_scale_factor : l affiche fait 1200 px de large en CSS. Sans ce
        # facteur, Playwright la capturait a 1200 px reels — d ou le rendu mou
        # signale par le boss. A 4, on sort 4800 px de large (au-dela du 4K).
        page = await browser.new_page(viewport={"width": 1400, "height": 900},
                                      device_scale_factor=4)
        for salle in SALLES:
            url = f"http://localhost:3001/poster/{salle}"
            print(f"— {salle} ({target_name})")
            await page.goto(url, wait_until="networkidle")
            await asyncio.sleep(2)
            await page.add_style_tag(content="button, nav, [class*='sticky'], a[href] { display: none !important; }")
            poster = page.locator("#poster-container")
            await poster.wait_for(state="visible", timeout=15000)
            await poster.scroll_into_view_if_needed()
            if with_qr:
                await page.evaluate("""(qr) => {
                  const p = document.getElementById('poster-container');
                  if (!p || p.querySelector('.qr-footer')) return;
                  const bar = document.createElement('div');
                  bar.className = 'qr-footer';
                  bar.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:22px;padding:20px 0 10px;';
                  bar.innerHTML = `<span style="display:block;background:#fff;padding:10px;border-radius:10px;line-height:0"><img src="${qr}" alt="" style="width:190px;height:190px;display:block;border-radius:0;image-rendering:pixelated" /></span>
                    <div style="text-align:left;color:#fff;font-weight:800;font-size:17px;line-height:1.45;letter-spacing:.04em">SCANNE-MOI — L'OFFRE RENTRÉE<br><span style="color:#F59E0B">29€ PAR PERSONNE · 4 SEMAINES</span><br><span style="opacity:.75;font-weight:600;font-size:11px">boutique.boxingcenter.fr</span></div>`;
                  p.appendChild(bar);
                }""", qr_data_uri(salle))

            native = os.path.join(out_dir, f"planning-{salle}.png")
            await poster.screenshot(path=native, scale="device")
            print(f"   PNG natif  → {native}")

            await page.emulate_media(media="print")
            a4 = os.path.join(out_dir, f"planning-{salle}-A4.pdf")
            await page.add_style_tag(content="""
              body > *:not(:has(#poster-container)) { display: none !important; }
              header, nav, button, a { display: none !important; }
              #poster-container { margin: 0 auto !important; }
            """)
            await page.pdf(path=a4, format="A4", print_background=True,
                           margin={"top": "8mm", "bottom": "8mm", "left": "6mm", "right": "6mm"},
                           scale=0.62)
            await page.emulate_media(media="screen")
            print(f"   PDF A4     → {a4}")
            await page.goto(url, wait_until="networkidle")
            await asyncio.sleep(1.5)
        await browser.close()

    from PIL import Image
    NAVY = (10, 13, 26)
    for salle in SALLES:
        src = os.path.join(out_dir, f"planning-{salle}.png")
        if not os.path.exists(src):
            continue
        im = Image.open(src).convert("RGB")
        target_w, target_h = 1080, 1920
        ratio = min(target_w / im.width, target_h / im.height)
        nw, nh = round(im.width * ratio), round(im.height * ratio)
        im = im.resize((nw, nh), Image.LANCZOS)
        canvas = Image.new("RGB", (target_w, target_h), NAVY)
        canvas.paste(im, ((target_w - nw) // 2, (target_h - nh) // 2))
        story = os.path.join(out_dir, f"planning-{salle}-story.png")
        canvas.save(story, quality=95)
        print(f"   Story 9:16 → {story}")

async def main():
    await export_for_target(with_qr=False) # web
    await export_for_target(with_qr=True)  # social

asyncio.run(main())
