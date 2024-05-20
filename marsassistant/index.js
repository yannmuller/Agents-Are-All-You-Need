import {
  image_to_base64,
  sleep,
  setPuppeteer,
  openai,
  findClosestElement,
  generate_speech,
  newWindow,
  playAudio,
} from "../utils.js";

import express from "express";
import cors from "cors";
import osc from "osc";
import pkg from "terminal-kit";
import * as gmap from "./gmap.server.js";
import { navigate } from "./navigation.js";
// import { generatedImgUrl } from "./tile.js";

const url = "https://www.google.com/mars/";

const timeout = 2000;
const { terminal: term } = pkg;
const buttons = {};
const nIteration = 3;

const systemPrompt = `You are Elon Musk's assistant. You act like an engineer, but your character is pretentius, you like to brag about your creations and your thinking.
I'll put you on the google mars website, you will navigate on mars. You will have to exploit the satelite images with your knowledge on mars's regions and explain why some buildings from the following list (
  pool, yacht factory, nightclub, solar panel field, greenhouses and agricultural domes, fabrication units, tesla charging station, mining facilities, artificial lakes, 
) would be more appropriate to build in certain regions by using some engineer arguments and atmospheric conditions.
You have to navigate by choosing to go in one direction(left,right,up,down), you always have to choose one direction. You can answer in maximum 3 sentences, not more. 
Please return a JSON object with the following schema. Do not include any explanations or extra text. Example of JSON:
  {
    "left": true/false
    "right": true/false
    "up": true/false
    "down": true/false
    "reason": "The reason why you choose this location and direction as an engineer on mars"
    "building":"explain why your thinking is great and what you can find in your constructions. Don't repeat yourself" 
  }`;

const imagePrompt = `A black and white image of a city with skyscraper viewed from the top like SimCity game. Drone view. View from above. Non isometric view.`;
// A black and white image of a city with skyscraper viewed from the top like SimCity game
//  `An image of mars from a bird's eye view with a building on the ground in black and white`
// `You're on a satelite image of Mars in B&W, add on top of mars's terrain a city with a block of flats. Your are in a bird's eye view.
// It must look like a space colony. The flats are shaped as little cubes.
// Don't change the terrain, don't merge with the surroundings. It must be detailed. It must be in B&W. `;

const messages = [
  {
    role: "system",
    content: systemPrompt,
  },
];

(async () => {
  console.clear();
  // Create an osc.js UDP Port listening on port 57121.
  var udpPort = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 1234,
    metadata: true,
  });

  // Open the socket.
  udpPort.open();

  function waitForTrigger() {
    return new Promise((resolve, reject) => {
      // Listen for incoming OSC messages.
      udpPort.once("message", function (oscMsg, timeTag, info) {
        // console.log("An OSC message just arrived!", oscMsg);
        // console.log("Remote info is: ", info);
        resolve();
      });
    });
  }

  // const puppeteer = await setPuppeteer({
  //   windowWidth: 960,
  //   windowHeight: 1024,
  //   puppeteerOptions: {
  //     devtools: false,
  //   },
  //   args: ["--allow-file-access-from-files"],
  // });

  const puppeteer = await setPuppeteer({
    puppeteerOptions: {
      devtools: false,
    },
    args: [`--use-fake-ui-for-media-stream`, `--no-sandbox`],
  });

  const { browser, page: chrome_page } = puppeteer;
  chrome_page.close();

  const { page: page, setBounds } = await newWindow(browser);
  await setBounds({ left: 0, top: 0, width: 960, height: 1080 });

  const app = express();
  const port = 9000; // change in gmap.style.css too

  app.use(cors());
  app.use(express.static("./"));
  const address = `http://localhost:${port}`;
  app.listen(port, () => {
    console.log(`Server running at ${address}`);
    console.clear();
  });

  // pageevaluateOnNewDocument(`(${init.toString()})(window)`);

  //----TRIGGER BUTTON----
  // await waitForTrigger();
  playAudio("./marsassistant/assets/rocket_sound.mp3");

  // insert css stylesheet
  await page.goto(url, {
    waitUntil: "networkidle0",
  });

  const generalInput = await page.$("#page");
  // generalInput.click();
  await page.waitForSelector("#map");

  await page.evaluate(() => {
    const overlay = document.createElement("div");
    overlay.id = "custom-overlay";
    // Ajouter l'overlay à la carte
    document.querySelector('[aria-label="Map"]').appendChild(overlay);
  });

  term.slowTyping("Starting Mars Engineer Assistant…" + "\n", {
    flashStyle: term.green,
    delay: 40,
    color: term.green,
  });

  await page.addStyleTag({ path: "./marsassistant/gmap.style.css" });
  await page.addScriptTag({ path: "./marsassistant/gmap.web.js" });

  buttons.mapVisible = await findClosestElement(page, {
    containText: "Visible",
    cssSelector: "#map button",
  });

  await buttons.mapVisible.click();

  await sleep(1000);

  while (true) {
    await gmap.setZoom(page, 6);

    await page.screenshot({
      path: "images/screenshot.jpg",
      fullPage: true,
    });

    let base64_image = await image_to_base64("images/screenshot.jpg");

    generalInput.click();

    messages.push({
      role: "user",
      content: [
        {
          type: "image_url",
          image_url: {
            url: base64_image,
          },
        },
        {
          type: "text",
          text: "Here is a screenshot of mars's satelite map, explain why you choose this location to build, max 2 sentences",
        },
      ],
    });

    const answer = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: messages,
    });

    const message = answer.choices[0].message;
    const message_text = message.content;

    const json_answer = JSON.parse(message_text);

    const left = json_answer["left"];
    const right = json_answer["right"];
    const up = json_answer["up"];
    const down = json_answer["down"];
    var reason = json_answer["reason"];
    var building = json_answer["building"];

    if (left) {
      for (let i = 0; i < 3; i++) {
        await navigate(page, "left");
      }
    } else if (right) {
      for (let i = 0; i < 3; i++) {
        await navigate(page, "right");
      }
    } else if (up) {
      for (let i = 0; i < 3; i++) {
        await navigate(page, "up");
      }
    } else if (down) {
      for (let i = 0; i < 3; i++) {
        await navigate(page, "down");
      }
    }

    // On ajoute la réponse à la liste des messages pour garder le contexte
    messages.push({
      role: "assistant",
      content: message_text,
    });

    term("👷🏼: \n");
    term.slowTyping(reason + "\n", {
      flashStyle: term.brightWhite,
      delay: 50,
    }),
      generate_speech(reason, "shimmer");

    await sleep(4000);

    let nTiles = 1;
    for (let i = 0; i < nTiles; i++) {
      // generate & add tile
      await gmap.createTile({
        page,
        address,
        openaiOpts: {
          model: "dall-e-2",
          prompt: imagePrompt,
          n: 1,
          size: "1024x1024",
        },
      });

      await sleep(3000);
    }

    await page.screenshot({
      path: "images/screenshot.jpg",
      fullPage: true,
    });

    base64_image = image_to_base64("images/screenshot.jpg");
    // let base64_generatedImg = image_to_base64("images/generatedImg.png");

    var building = json_answer["building"];

    await Promise.all([
      term.slowTyping(building + "\n", {
        flashStyle: term.brightWhite,
        delay: 50,
      }),
      generate_speech(building, "shimmer"),
    ]);

    await gmap.setZoom(page, 4);
    await sleep(2000);

    console.clear();

    const moves = ["left", "right", "up", "down"];

    const randomIterations = Math.floor(Math.random() * 5);

    for (let index = 0; index < randomIterations; index++) {
      let randomDir = Math.floor(Math.random() * 4);
      await navigate(page, moves[randomDir]);
      await sleep(1000);
    }

    await sleep(2000);
  }

  // await browser.close();
})();
