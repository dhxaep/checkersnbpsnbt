
const puppeteer = require('puppeteer-core');
(async () => {
    const browser = await puppeteer.launch({
        executablePath: 'C:\\\\Program Files (x86)\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe',
        headless: 'new'
    });
    const page = await browser.newPage();
    let interceptedData = null;
    page.on('response', async (res) => {
        const url = res.url();
        if (url.includes('.json') && !url.includes('config')) {
            try {
                interceptedData = await res.json();
                console.log('Intercepted:', interceptedData);
            } catch (e) {}
        }
    });

    try {
        await page.goto('https://snbp.ipb.ac.id/?renderer=html', { waitUntil: 'networkidle2' });
        console.log('Navigated');
        await page.type('#index-form-registration-number', '426630866');
        await page.type('#index-form-birthday-day', '12');
        await page.type('#index-form-birthday-month', '12');
        await page.type('#index-form-birthday-year', '2006');
        await page.click('#index-form-submit');
        console.log('Submitted');
        await new Promise(r => setTimeout(r, 5000));
        console.log('Final data:', interceptedData);
    } catch (e) {
        console.error(e);
    } finally {
        await browser.close();
    }
})();

