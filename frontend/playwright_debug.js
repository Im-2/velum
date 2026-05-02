import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[PAGE ERROR] ${error.message}`));
  
  console.log('Navigating to https://velum-swart.vercel.app/ ...');
  await page.goto('https://velum-swart.vercel.app/', { waitUntil: 'networkidle' });

  const rootHTML = await page.evaluate(() => {
    const el = document.getElementById('root');
    return el ? el.innerHTML : 'NULL';
  });
  console.log('[ROOT HTML]', rootHTML.substring(0, 500));

  await browser.close();
})();
