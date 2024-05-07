import fs from "fs";
import play from "play-sound";
import path from "path";
import inquirer from "inquirer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
puppeteer.use(StealthPlugin());

const player = play({});

export async function setPuppeteer() {
  const windowWidth = 960;
  const windowHeight = 960;

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath:
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    userDataDir:
      "/Users/matoseb/Library/Application Support/Google/Chrome Canary/Default",
      
    ignoreDefaultArgs: [
      "--enable-automation",
      "--disable-blink-features=AutomationControlled",
    ],
    args: ["--window-size=" + windowWidth + "," + (windowHeight + 88) + ""],
    ignoreHTTPSErrors: true,
  });

  const pages = await browser.pages();

  const page = pages[0];

  return { page: page, browser: browser };
}

export async function generate_speech(text, openai, filename = "speech.mp3") {
  const speechFile = path.resolve("./" + filename);
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "onyx",
    input: text,
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);

  await playAudio();
}

function playAudio() {
  return new Promise((resolve, reject) => {
    player.play("speech.mp3", function (err) {
      if (err) {
        //console.error("Error during audio playback:", err);
        reject(err);
      } else {
        //console.log("Audio playback finished");
        resolve();
      }
    });
  });
}

export async function image_to_base64(image_file) {
  return await new Promise((resolve, reject) => {
    fs.readFile(image_file, (err, data) => {
      if (err) {
        console.error("Error reading the file:", err);
        reject();
        return;
      }

      const base64Data = data.toString("base64");
      const dataURI = `data:image/jpeg;base64,${base64Data}`;
      resolve(dataURI);
    });
  });
}

export async function input(question) {
  const response = await inquirer.prompt({
    type: "input",
    name: "answer",
    message: question,
  });

  return response.answer;
}

export async function sleep(milliseconds) {
  return await new Promise((r, _) => {
    setTimeout(() => {
      r();
    }, milliseconds);
  });
}

export async function highlight_links(page) {
  await page.evaluate(() => {
    document.querySelectorAll("[gpt-link-text]").forEach((e) => {
      e.removeAttribute("gpt-link-text");
    });
  });

  const elements = await page.$$(
    "a, button, input, textarea, [role=button], [role=treeitem]"
  );

  elements.forEach(async (e) => {
    await page.evaluate((e) => {
      function isElementVisible(el) {
        if (!el) return false; // Element does not exist

        function isStyleVisible(el) {
          const style = window.getComputedStyle(el);
          return (
            style.width !== "0" &&
            style.height !== "0" &&
            style.opacity !== "0" &&
            style.display !== "none" &&
            style.visibility !== "hidden"
          );
        }

        function isElementInViewport(el) {
          const rect = el.getBoundingClientRect();
          return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <=
              (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <=
              (window.innerWidth || document.documentElement.clientWidth)
          );
        }

        // Check if the element is visible style-wise
        if (!isStyleVisible(el)) {
          return false;
        }

        // Traverse up the DOM and check if any ancestor element is hidden
        let parent = el;
        while (parent) {
          if (!isStyleVisible(parent)) {
            return false;
          }
          parent = parent.parentElement;
        }

        // Finally, check if the element is within the viewport
        return isElementInViewport(el);
      }

      e.style.border = "1px solid red";

      const position = e.getBoundingClientRect();

      //if (position.width > 5 && position.height > 5 && isElementVisible(e)) {
      if (position.width > 5 && position.height > 5) {
        const link_text = e.textContent.replace(/[^a-zA-Z0-9 ]/g, "");
        e.setAttribute("gpt-link-text", link_text);
      }
    }, e);

    if (e === elements[elements.length - 1]) {
      const content = await page.content();
      //console.log(content);
    }
  });
}

export async function waitForEvent(page, event) {
  return page.evaluate((event) => {
    return new Promise((r, _) => {
      document.addEventListener(event, function (e) {
        r();
      });
    });
  }, event);
}
