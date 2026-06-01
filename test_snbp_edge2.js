
const puppeteer = require('puppeteer-core');
(async () => {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
        headless: 'new'
    });
    const page = await browser.newPage();
    page.on('response', async (res) => {
        const url = res.url();
        console.log('Response:', res.status(), url);
    });
    try {
        await page.goto('https://snbp.ipb.ac.id/?renderer=html', { waitUntil: 'networkidle2' });
        await page.type('#index-form-registration-number', '426630866');
        await page.type('#index-form-birthday-day', '12');
        await page.type('#index-form-birthday-month', '12');
        await page.type('#index-form-birthday-year', '2006');
        await page.click('#index-form-submit');
        await new Promise(r => setTimeout(r, 5000));
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();

