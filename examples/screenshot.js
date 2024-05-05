import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

const url = process.argv[2];
const timeout = 5000;

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    executablePath:
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    userDataDir:
      "/Users/matthieu.minguet/Library/Application Support/Google/Chrome Canary/Default",
  });

  const page = await browser.newPage();

  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: timeout,
  });

  await page.waitForTimeout(timeout);

  await page.screenshot({
    path: "images/screenshot.jpg",
    fullPage: true,
  });

  await browser.close();
})();
