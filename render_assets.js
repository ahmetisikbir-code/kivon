const puppeteer = require('puppeteer');
const path = require('path');
const BASE = path.join(__dirname, '..', 'gorseller');
const OUT = path.join(__dirname, 'img');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Web logo 200x200
  await page.setViewport({ width: 200, height: 200, deviceScaleFactor: 2 });
  await page.goto('file:///' + path.join(BASE, 'profil_foto.html').split('\\').join('/'), { waitUntil: 'networkidle0', timeout: 15000 });
  await page.screenshot({ path: path.join(OUT, 'logo.png'), type: 'png' });
  console.log('logo.png OK (400x400)');

  // Web logo tiny (favicon 64x64)
  await page.setViewport({ width: 64, height: 64, deviceScaleFactor: 2 });
  await page.goto('file:///' + path.join(BASE, 'logo_square.html').split('\\').join('/'), { waitUntil: 'networkidle0', timeout: 15000 });
  await page.screenshot({ path: path.join(OUT, 'favicon.png'), type: 'png' });
  console.log('favicon.png OK (128x128)');

  await browser.close();
})();
