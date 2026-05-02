import { chromium } from 'playwright';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();
  const page = await browser.newPage();

  page.on('console', msg => console.log(`[CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => console.log(`[PAGE ERROR] ${error.stack}`));
  
  console.log('Navigating to http://localhost:4176/ ...');
  try {
    await page.goto('http://localhost:4176/', { waitUntil: 'networkidle', timeout: 10000 });
  } catch(e) {
    console.log('Error navigating to 4176');
  }

  const rootHTML = await page.evaluate(() => {
    console.log('window.Buffer is:', typeof window.Buffer);
    console.log('window.process is:', typeof window.process);
    console.log('window.EventEmitter is:', typeof window.EventEmitter);
    const el = document.getElementById('root');
    return el ? el.innerHTML : 'NULL';
  });
  console.log('[ROOT HTML LENGTH]', rootHTML.length);
  if (rootHTML.length === 0) {
    console.log('[CRITICAL] Root HTML is empty!');
  } else {
    console.log('[SUCCESS] Root HTML contains content!');
  }

  await browser.close();
})();
