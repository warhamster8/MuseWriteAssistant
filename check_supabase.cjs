const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('LOG:', msg.text()));
  page.on('response', async (response) => {
    if (response.url().includes('supabase.co/rest/v1/') && response.status() >= 400) {
      console.log('SUPABASE ERROR RESPONSE:', response.status(), response.url());
      try {
        console.log('BODY:', await response.text());
      } catch(e) {}
    }
  });

  try {
    await page.goto('https://muse-delta-one.vercel.app/', { waitUntil: 'networkidle0' });
    
    // We will just execute a Supabase insert right in the console to see the error!
    console.log('Testing Supabase insert from page context...');
    const err = await page.evaluate(async () => {
      // Need auth first. But wait, we don't have auth credentials here.
      // We can't do this easily.
      return "Need to login manually.";
    });
    console.log(err);
    
  } catch (e) {
    console.error('EXCEPTION:', e);
  } finally {
    await browser.close();
  }
})();
