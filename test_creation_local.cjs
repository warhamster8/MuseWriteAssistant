const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  try {
    await page.goto('http://localhost:8082/');
    // Wait for Landing, click Local Test
    await page.waitForXPath("//button[contains(., 'Inizia Test Locale')]");
    const [btn] = await page.$x("//button[contains(., 'Inizia Test Locale')]");
    await btn.click();
    console.log('Clicked Local Test');

    // Wait for Project Selector, click Nuova Opera
    await page.waitForXPath("//span[contains(., 'Nuova Opera')]");
    const [createBtn] = await page.$x("//span[contains(., 'Nuova Opera')]");
    await createBtn.evaluate(b => b.parentNode.click());
    console.log('Clicked Nuova Opera');

    // Type title and submit
    await page.waitForSelector('input');
    await page.type('input', 'Test Novel Auto');
    const [submitBtn] = await page.$x("//button[contains(., 'Crea')]");
    await submitBtn.click();
    console.log('Created project');

    // Wait for Dashboard
    await page.waitForXPath("//span[contains(., 'Manuscript')]");
    // Click Add Chapter
    await page.evaluate(() => {
       window.prompt = () => "My New Chapter"; // Mock prompt
    });
    const [addBtn] = await page.$x("//button[.//svg[contains(@class, 'lucide-plus')]]");
    await addBtn.click();
    console.log('Clicked add chapter');

    // Wait a sec for store update
    await page.waitForTimeout(1000);
    const html = await page.evaluate(() => document.body.innerHTML);
    if(html.includes("My New Chapter")) {
        console.log("SUCCESS: Chapter was created and displayed!");
    } else {
        console.log("FAIL: Chapter not found in DOM");
    }

  } catch(e) { console.error('E:', e); }
  finally { await browser.close(); }
})();
