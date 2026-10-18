"""Loads the unpacked extension, opens sidepanel.html bound to a test tab and checks the page<->panel bridge."""
import asyncio, pathlib, tempfile, http.server, threading, functools, json
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
site = pathlib.Path(tempfile.mkdtemp()); (site/'index.html').write_text('<html><body><h1>Site</h1></body></html>')
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(site)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/index.html'
async def main():
    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(tempfile.mkdtemp(), headless=False, args=[f'--disable-extensions-except={ROOT}', f'--load-extension={ROOT}', '--headless=new'])
        sw = ctx.service_workers[0] if ctx.service_workers else await ctx.wait_for_event('serviceworker')
        ext = sw.url.split('/')[2]
        page = await ctx.new_page(); await page.goto(URL); await page.wait_for_selector('#next-widget-root', state='attached')
        tab_id = await sw.evaluate("async (u)=> (await chrome.tabs.query({})).find(t=>t.url.startsWith(u)).id", URL.rsplit('/',1)[0])
        who = await page.evaluate("chrome.runtime.sendMessage({type:'vtx-whoami'})") if False else None
        panel = await ctx.new_page(); logs=[]
        panel.on('pageerror', lambda e: logs.append(str(e))); panel.on('console', lambda m: logs.append(m.text) if m.type=='error' else None)
        await panel.goto(f'chrome-extension://{ext}/sidepanel.html?tab={tab_id}')
        await panel.wait_for_selector('#nextApp, #vertexLicenseModal', state='attached', timeout=8000)
        await panel.wait_for_timeout(1500)
        st = await panel.evaluate("JSON.stringify(VTX_PAGE.state)")
        assert '127.0.0.1' in st and 'index.html' in st, st
        assert await panel.evaluate("IS_PANEL_OK = !!document.querySelector('#next-widget-root.vtx-in-panel')")
        assert await panel.evaluate("VTX_PAGE.call('hasLovableComposer')") is False
        assert await panel.evaluate("VTX_PAGE.call('setChatBlock', false)") is True
        alive = await panel.evaluate("chrome.storage.local.get('vertex_panel_alive')")
        assert str(tab_id) in alive['vertex_panel_alive'], alive
        await page.wait_for_timeout(2500)
        hidden = await page.evaluate("document.getElementById('next-widget-root').classList.contains('vtx-panel-active')")
        assert hidden, 'widget da página deveria esconder com o painel aberto'
        vis = await panel.evaluate("(()=>{const m=document.querySelector('#vertexLicenseModal');const a=document.querySelector('#nextApp');return {lic:getComputedStyle(m).display, app:getComputedStyle(a).display, w:a.getBoundingClientRect().width, vw:innerWidth, launcher:getComputedStyle(document.querySelector('#nextLauncher')).display}})()")
        print(vis)
        assert vis['launcher'] == 'none'
        assert vis['lic'] == 'flex' or vis['app'] == 'flex'
        assert not [l for l in logs if 'Uncaught' in l or 'ReferenceError' in l or 'TypeError' in l], logs
        # fecha o painel: o widget da página volta
        await panel.close(); await page.wait_for_timeout(8500)
        back = await page.evaluate("!document.getElementById('next-widget-root').classList.contains('vtx-panel-active')")
        assert back
        print('PASS: side panel binds to the tab, bridges state/calls, hides and restores the in-page widget.', logs[:3])
        await ctx.close()
asyncio.run(main())
