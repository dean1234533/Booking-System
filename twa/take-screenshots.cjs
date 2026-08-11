#!/usr/bin/env node
// Takes Play Store screenshots of the Bookrightly app

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE = 'http://localhost:5173';
const OUT = path.join(__dirname, '../public/images');
const W = 390, H = 844; // Phone size (9:20 ratio, Play Store compliant)

const SCREENS = [
  {
    name: 'screenshot-01-home',
    label: 'Home – book any pro instantly',
    url: '/',
    wait: 3000,
  },
  {
    name: 'screenshot-02-home-scroll',
    label: 'Business types',
    url: '/',
    wait: 2500,
    action: async (page) => {
      await page.evaluate(() => window.scrollBy(0, 600));
      await new Promise(r => setTimeout(r, 600));
    },
  },
  {
    name: 'screenshot-03-login',
    label: 'Professional login',
    url: '/login',
    wait: 2000,
  },
  {
    name: 'screenshot-04-signup',
    label: 'Sign up as a professional',
    url: '/signup',
    wait: 2000,
  },
  {
    name: 'screenshot-05-home-features',
    label: 'Features section',
    url: '/',
    wait: 2500,
    action: async (page) => {
      await page.evaluate(() => window.scrollBy(0, 1400));
      await new Promise(r => setTimeout(r, 600));
    },
  },
  {
    name: 'screenshot-06-home-industry',
    label: 'Industry grid',
    url: '/',
    wait: 2500,
    action: async (page) => {
      await page.evaluate(() => window.scrollBy(0, 2200));
      await new Promise(r => setTimeout(r, 600));
    },
  },
  {
    name: 'screenshot-07-signup-barber',
    label: 'Barber signup form',
    url: '/signup',
    wait: 2000,
    action: async (page) => {
      await page.evaluate(() => window.scrollBy(0, 300));
      await new Promise(r => setTimeout(r, 400));
    },
  },
  {
    name: 'screenshot-08-pt-profile',
    label: 'Personal trainer profile',
    url: '/pt-book/demo',
    wait: 3000,
  },
];

async function run() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const screen of SCREENS) {
    console.log(`  Capturing: ${screen.name}`);
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: 2 });
    await page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
    );

    try {
      await page.goto(`${BASE}${screen.url}`, { waitUntil: 'networkidle2', timeout: 15000 });
      await new Promise(r => setTimeout(r, screen.wait));

      if (screen.action) {
        await screen.action(page);
      }

      const outPath = path.join(OUT, `${screen.name}.png`);
      await page.screenshot({ path: outPath, type: 'png' });
      console.log(`    Saved: ${outPath}`);
    } catch (err) {
      console.error(`    ERROR on ${screen.name}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log('\nAll screenshots done.');
}

run().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
