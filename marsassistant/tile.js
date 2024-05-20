import { image_to_base64, sleep, setPuppeteer, openai } from "../utils.js";
import pkg from "terminal-kit";

import fs from "fs";
import jimp from "jimp";
import axios from "axios";
import path from "path";

const { terminal: term } = pkg;

export async function prepareTile(randomImage, tileName) {
  await downloadImage(randomImage, `images/${tileName}.png`);
  const mask = await jimp.read("images/mask.png"); //image + mask
  const tile = await jimp.read(`images/${tileName}.png`); //image input
  const tileMask = await jimp.read(`images/${tileName}.png`); //image input

  tileMask.mask(mask, 0, 0);
  // save image
  tile.resize(256, jimp.AUTO);
  tileMask.resize(256, jimp.AUTO);

  await tile.writeAsync(`images/${tileName}.png`);
  await tileMask.writeAsync(`images/${tileName}_masked.png`);

  return {
    image: fs.createReadStream(`images/${tileName}.png`),
    mask: fs.createReadStream(`images/${tileName}_masked.png`),
  };
}

export async function generateTile(image, mask, options) {
  // console.log("Engeering…");
  const response = await openai.images.edit({
    model: "dall-e-2",
    image,
    mask,
    prompt: `Add architectural plan grid to the image`,
    // prompt: `A google maps satellite view of a huge futuristic lunar like New `,
    n: 1,
    size: "256x256",
    ...options,
  });

  const generatedImgUrl = response.data[0].url;
  term("👷🏼: \n");
  term.green("Task accomplished! \n");
  // console.log("Image URL:", generatedImgUrl);
  return generatedImgUrl;
}

export async function downloadImage(url, filename) {
  const response = await axios.get(url, { responseType: "arraybuffer" });

  fs.writeFile(filename, response.data, (err) => {
    if (err) throw err;
    // console.log("Image downloaded successfully!");
  });
}

export const fakeTileURL =
  "https://oaidalleapiprodscus.blob.core.windows.net/private/org-t99RSKR5bW0lhuWQlHWow0LD/user-7Z1DWNis9zUxppWZ98L5fXw1/img-6YYtEb1RfXWP5MZkiAvZOjhG.png?st=2024-05-15T15%3A02%3A11Z&se=2024-05-15T17%3A02%3A11Z&sp=r&sv=2021-08-06&sr=b&rscd=inline&rsct=image/png&skoid=6aaadede-4fb3-4698-a8f6-684d7786b067&sktid=a48cca56-e6da-484e-a814-9c849652bcb3&skt=2024-05-15T11%3A48%3A35Z&ske=2024-05-16T11%3A48%3A35Z&sks=b&skv=2021-08-06&sig=69kv%2BMtWj3xG8lfKI/FmmsHZy65mC2o48A3ozaW5Buk%3D";

export async function getTileSrc(page, tileElem) {
  return await page.evaluate((el) => el.src, tileElem);
}

export async function replaceTileURL(page, tileElem, newURL) {
  return await page.evaluate(
    (imgElem, newSrc) => {
      imgElem.src = newSrc;
    },
    tileElem,
    newURL
  );
}

export async function highlightTile(page, tileElem) {
  await page.evaluate((el) => {
    const container = el.parentElement;
    container.classList.add("tileContainer");
    requestAnimationFrame(() => {
      container.classList.add("tileContainer--selected");
    });
  }, tileElem);

  return async function stop() {
    await page.evaluate((el) => {
      const container = el.parentElement;
      // catch img load event in container
      el.onload = () => {
        container.classList.remove("tileContainer--selected");
      };
    }, tileElem);
  };
}
