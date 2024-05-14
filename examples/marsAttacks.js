import {
  image_to_base64,
  sleep,
  input,
  setPuppeteer,
  openai,
} from "../utils.js";

(async () => {
  const { page } = await setPuppeteer();
  const user_query = await input("👩‍💻 What are you searching for: ");
  await page.goto("https://www.google.com/mars/", {
    waitUntil: "domcontentloaded",
    timeout: timeout,
  });
})();
