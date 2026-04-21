const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  try {
    await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
    // Let's print out the body innerHTML so we can see what rendered!
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log('BODY HTML:', bodyHTML.substring(0, 500) + '...');
  } catch (e) {
    console.error('PUPPETEER EXCEPTION:', e);
  } finally {
    await browser.close();
  }
})();
