import { setPuppeteer, sleep } from "../utils.js";

const url = process.argv[2];
const timeout = 5000;

(async () => {
  const puppeteer = await setPuppeteer();
  const page = puppeteer.page;
  const browser = puppeteer.browser;

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: timeout,
  });

  // Attendre 3 secondes
  await sleep(3000);

  await page.screenshot({
    path: "images/screenshot.jpg",
    fullPage: true,
  });

  await browser.close();
})();
