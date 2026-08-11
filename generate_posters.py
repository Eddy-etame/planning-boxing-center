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
    """QR vers la boutique — UTM par salle : chaque affiche devient mesurable."""
    import io as _io
    import qrcode
    url = f"https://box-plus.vercel.app/abonnements?utm_source=affiche&utm_medium=qr&utm_campaign=rentree2026-{salle}#promo"
    img = qrcode.make(url, box_size=8, border=2)
    buf = _io.BytesIO()
    img.save(buf, format="PNG")
    import base64
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1400, "height": 900})
        for salle in SALLES:
            url = f"http://localhost:3001/poster/{salle}"
            print(f"— {salle}")
            await page.goto(url, wait_until="networkidle")
            await asyncio.sleep(2)
            # la barre d'outils de l'app (Retour / Télécharger / Imprimer) ne fait
            # pas partie de l'affiche : on la retire AVANT toute capture
            await page.add_style_tag(content="button, nav, [class*='sticky'], a[href] { display: none !important; }")
            poster = page.locator("#poster-container")
            await poster.wait_for(state="visible", timeout=15000)
            await poster.scroll_into_view_if_needed()
            # le QR boutique en pied d'affiche — versions SOCIAL uniquement
            if WITH_QR: await page.evaluate("""(qr) => {
              const p = document.getElementById('poster-container');
              if (!p || p.querySelector('.qr-footer')) return;
              const bar = document.createElement('div');
              bar.className = 'qr-footer';
              bar.style.cssText = 'display:flex;align-items:center;justify-content:center;gap:14px;padding:14px 0 6px;';
              bar.innerHTML = `<img src="${qr}" alt="" style="width:86px;height:86px;border-radius:8px;border:3px solid #fff;display:block" />
                <div style="text-align:left;color:#fff;font-weight:800;font-size:13px;line-height:1.45;letter-spacing:.04em">SCANNE-MOI — L'OFFRE RENTRÉE<br><span style="color:#F59E0B">29€ PAR PERSONNE · 4 SEMAINES</span><br><span style="opacity:.75;font-weight:600;font-size:11px">box-plus.vercel.app</span></div>`;
              p.appendChild(bar);
            }""", qr_data_uri(salle))

            # 1. PNG natif : l'élément affiche seul, sans la barre d'outils
            native = os.path.join(OUT, f"planning-{salle}.png")
            await poster.screenshot(path=native, scale="device")
            print(f"   PNG natif  → {native}")

            # 2. PDF A4 : uniquement l'affiche (le chrome est masqué le temps du PDF)
            await page.emulate_media(media="print")
            a4 = os.path.join(OUT, f"planning-{salle}-A4.pdf")
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
            # recharger proprement pour la suite (le style tag injecté reste sinon)
            await page.goto(url, wait_until="networkidle")
            await asyncio.sleep(1.5)
        await browser.close()

    # 3. Story 9:16 — letterbox navy autour du PNG natif
    from PIL import Image
    NAVY = (10, 13, 26)
    for salle in SALLES:
        src = os.path.join(OUT, f"planning-{salle}.png")
        if not os.path.exists(src):
            continue
        im = Image.open(src).convert("RGB")
        target_w, target_h = 1080, 1920
        ratio = min(target_w / im.width, target_h / im.height)
        nw, nh = round(im.width * ratio), round(im.height * ratio)
        im = im.resize((nw, nh), Image.LANCZOS)
        canvas = Image.new("RGB", (target_w, target_h), NAVY)
        canvas.paste(im, ((target_w - nw) // 2, (target_h - nh) // 2))
        story = os.path.join(OUT, f"planning-{salle}-story.png")
        canvas.save(story, quality=95)
        print(f"   Story 9:16 → {story}")
    print("FINI — dossier :", OUT)

asyncio.run(main())
