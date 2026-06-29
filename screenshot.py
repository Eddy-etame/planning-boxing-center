import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={"width": 1200, "height": 800})
        
        urls = [
            ("http://localhost:3001/poster/etats-unis-boxe", "etats-unis-boxe.png"),
            ("http://localhost:3001/poster/etats-unis-fitness", "etats-unis-fitness.png"),
            ("http://localhost:3001/poster/saint-cyprien", "saint-cyprien.png"),
            ("http://localhost:3001/poster/ramonville", "ramonville.png"),
            ("http://localhost:3001/poster/barriere-de-paris", "barriere-de-paris.png")
        ]
        
        for url, fname in urls:
            print(f"Screenshotting {url}...")
            await page.goto(url, wait_until="networkidle")
            # Wait a little bit for rendering
            await asyncio.sleep(2)
            await page.screenshot(path=fname, full_page=True)
            
        await browser.close()

asyncio.run(main())
