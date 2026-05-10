#!/usr/bin/env node
const { chromium } = require('playwright');

const BASE = 'http://213.199.56.120:3000';
const OUT = '/tmp';

async function screenshot(url, file) {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  try {
    await page.goto(url, { timeout: 15000, waitUntil: 'networkidle' });
    await page.screenshot({ path: file, fullPage: true });
    console.log(`OK: ${url} -> ${file}`);
  } catch (e) {
    console.error(`FAIL: ${url} -> ${e.message}`);
  } finally {
    await browser.close();
  }
}

async function main() {
  // Landing + sign-in
  await screenshot(`${BASE}/ar`, `${OUT}/caffe-ya-landing.png`);
  await screenshot(`${BASE}/ar/sign-in`, `${OUT}/caffe-ya-signin.png`);

  // Login flow
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.goto(`${BASE}/ar/sign-in`, { timeout: 15000 });
  await page.fill("input[type='email'], input[name='email']", 'test_admin@caffe.ya');
  await page.fill("input[type='password']", 'test1234');
  await page.click("button[type='submit']");
  await page.waitForURL('**/dashboard**', { timeout: 10000 });
  await page.screenshot({ path: `${OUT}/caffe-ya-dashboard.png`, fullPage: true });
  console.log(`OK: login -> dashboard`);
  await browser.close();

  // Other pages
  await screenshot(`${BASE}/ar/dashboard`, `${OUT}/dashboard.png`);
  await screenshot(`${BASE}/ar/pos`, `${OUT}/pos.png`);
  await screenshot(`${BASE}/ar/inventory`, `${OUT}/inventory.png`);
  await screenshot(`${BASE}/ar/accounting/reports`, `${OUT}/accounting.png`);
}

main().catch(e => { console.error(e); process.exit(1); });
