const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');

async function main() {
  // Serve the HTML file via a local HTTP server so canvas works
  const html = fs.readFileSync('/private/tmp/claude-501/-Users-deantyroneburtburt-Downloads-Booking-System/92da2c40-fd6c-42f7-bc94-77a047725359/scratchpad/feature-graphic.html', 'utf8');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  page.on('console', m => console.log('PAGE:', m.text()));
  page.on('pageerror', e => console.error('ERROR:', e.message));
  await page.setViewport({ width: 1024, height: 500, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  // Check canvas has pixels
  const hasPixels = await page.evaluate(() => {
    const c = document.getElementById('c');
    const ctx = c.getContext('2d');
    const d = ctx.getImageData(140, 230, 10, 10).data;
    return Array.from(d).some(v => v > 20);
  });
  console.log('Canvas has non-black pixels:', hasPixels);
  await page.screenshot({
    path: '/Users/deantyroneburtburt/Downloads/Booking-System/public/images/feature-graphic.png',
    clip: { x: 0, y: 0, width: 1024, height: 500 },
  });
  await browser.close();
  server.close();
  console.log('Feature graphic saved.');
}
main().catch(e => { console.error(e); process.exit(1); });
