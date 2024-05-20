import fs from "fs";
import play from "play-sound";
import path from "path";
import { config } from "dotenv";
import OpenAI from "openai";

import inquirer from "inquirer";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import useActionViz from "./utils.actionviz.js";

puppeteer.use(StealthPlugin());

const player = play({});

config();

export const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"],
});

export async function setPuppeteer(options = {}) {
  const {
    windowWidth = 960,
    windowHeight = 960,
    args = [],
    puppeteerOptions = {},
  } = options;

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath: process.env["EXECUTABLE_PATH"],
    userDataDir: process.env["USER_DATA_DIR"],

    ignoreDefaultArgs: [
      "--enable-automation",
      "--disable-blink-features=AutomationControlled",
    ],
    args: [
      "--window-size=" + windowWidth + "," + (windowHeight + 88) + "",
      ...args,
    ],
    ignoreHTTPSErrors: true,
    ...puppeteerOptions,
  });

  const pages = await browser.pages();
  const page = pages[0];
  await page.setBypassCSP(true); // bypass Content Security Policy
  //await useActionViz(page);

  return { page, browser };
}

export async function newWindow(browser, options) {
  const client = await browser.target().createCDPSession();
  const { targetId } = await client.send("Target.createTarget", {
    url: "about:blank",
    newWindow: true,
    background: false,
    ...options,
  });
  const target = await browser.waitForTarget(
    (target) => target._targetId === targetId
  );
  const page = await target.page();

  const setBounds = async (bounds) => {
    const { windowId } = await client.send("Browser.getWindowForTarget", {
      targetId,
    });
    client.send("Browser.setWindowBounds", {
      windowId,
      bounds: { windowState: "normal", ...bounds },
    });
  };

  await page.setBypassCSP(true); // bypass Content Security Policy

  return { page, client, setBounds };
}

export /*async*/ function animate(fn, { fps = 60, customData = {} } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    let frame;
    let frameCount = 0;
    let interval = 1000 / fps;

    const update = async () => {
      const time = Date.now() - start;
      const playing = await fn({ time, frameCount, customData });
      frameCount++;
      if (playing) return setTimeout(update, interval);
      resolve();
    };

    update();
  });
}

export async function generate_speech(
  text,
  voice = "onyx",
  filename = "speech.mp3"
) {
  const speechFile = path.resolve("./" + filename);
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: voice,
    input: text,
  });
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);

  await playAudio();
}

export function playAudio(file = "speech.mp3") {
  return new Promise((resolve, reject) => {
    player.play(file, function (err) {
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

// export async function sleep(ms) {
//   return await new Promise((resolve) => {
//     setTimeout(() => {
//       resolve();
//     }, ms);
//   });
// }

export async function sleep(ms) {
  return await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function findClosestElement(
  page,
  {
    multiple = false,
    cssSelector = "*",
    containText = "",
    ignoreInvisible = true,
    exactMatch = false,
  }
) {
  if (!exactMatch) containText = containText.toLowerCase().trim();

  const elems = await page.$$(cssSelector);

  function getElem(e, { containText, ignoreInvisible, exactMatch }) {
    let text = e.outerHTML;

    if (!exactMatch) text = text.toLowerCase();

    if (ignoreInvisible && !e.checkVisibility()) return;
    if (!text.includes(containText)) return;

    let deepness = 0;
    let parent = e.parentElement;
    while (parent) {
      deepness++;
      parent = parent.parentElement;
    }

    return { domDeepness: deepness, text };
  }

  let match = elems.map(async (e) => {
    const res = await e.evaluate(getElem, {
      containText,
      ignoreInvisible,
      exactMatch,
    });

    if (!res) return;

    return { domDeepness: res.domDeepness, elem: e };
  });

  match = await Promise.all(match);
  match = match.filter(Boolean);
  match = match.sort((a, b) => b.domDeepness - a.domDeepness);
  match = match.map((m) => m.elem);

  if (multiple) return match;

  match[0].evaluate((e) => {
    console.log(e);
  });

  return match[0];
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

function lerp(start, stop, amount) {
  return amount * (stop - start) + start;
}

export async function zoomTo(page, targetZoom, { duration = 1 } = {}) {
  const framesDuration = 60 * duration;

  const currentZoom = await page.evaluate(() => {
    return parseFloat(document.body.style.zoom) || 100;
  });

  if (duration > 0)
    await animate(async ({ time, frameCount }) => {
      const zoom = lerp(currentZoom, targetZoom, frameCount / framesDuration);

      page.evaluate((zoom) => {
        document.body.style.zoom = zoom + "%";
      }, zoom);

      if (frameCount < framesDuration) return true;
    });

  await page.evaluate((zoom) => {
    document.body.style.zoom = zoom + "%";
  }, targetZoom);
}
