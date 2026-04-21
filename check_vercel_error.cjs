const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  try {
    await page.goto('https://muse-delta-one.vercel.app/', { waitUntil: 'networkidle0' });
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    console.log('BODY HTML:', bodyHTML.substring(0, 200) + '...');
  } catch (e) {
    console.error('PUPPETEER EXCEPTION:', e);
  } finally {
    await browser.close();
  }
})();
