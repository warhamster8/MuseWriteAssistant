const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  try {
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(2000); // Wait for potential load
    const storage = await page.evaluate(() => {
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        result[key] = localStorage.getItem(key);
      }
      return result;
    });
    console.log(JSON.stringify(storage, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    await browser.close();
  }
})();
