import puppeteer from 'puppeteer';

(async () => {
  console.log('Launching browser...');
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure().errorText));

  console.log('Navigating to https://velum-swart.vercel.app/ ...');
  await page.goto('https://velum-swart.vercel.app/', { waitUntil: 'networkidle0' });
  
  console.log('Page loaded. Checking for #root content...');
  const rootHtml = await page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML : 'NO ROOT ELEMENT';
  });
  console.log('Root HTML length:', rootHtml.length);
  if (rootHtml.length === 0) {
    console.log('Root is perfectly empty.');
  }
  
  await browser.close();
})();
