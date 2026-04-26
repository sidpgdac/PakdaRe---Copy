import { chromium, devices } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['iPhone 13'],
  });
  
  const page = await context.newPage();

  console.log('Navigating to map page...');
  await page.goto('http://localhost:5173/map');
  await page.waitForTimeout(3000); // Wait for map to load
  await page.screenshot({ path: 'public/map.png' });
  console.log('Saved map.png');

  console.log('Navigating to report page...');
  await page.goto('http://localhost:5173/report');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'public/report.png' });
  console.log('Saved report.png');

  console.log('Navigating to gallery page...');
  await page.goto('http://localhost:5173/gallery');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'public/gallery.png' });
  console.log('Saved gallery.png');

  console.log('Navigating to track page...');
  await page.goto('http://localhost:5173/track/1');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'public/track.png' });
  console.log('Saved track.png');

  await browser.close();
})();
