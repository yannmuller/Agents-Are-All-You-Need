import { image_to_base64, sleep, setPuppeteer, openai } from "../utils.js";
import fs from "fs";
import jimp from "jimp";
import axios from "axios";
import path from "path";

const url = "https://www.google.com/mars/";

const timeout = 2000;

(async () => {
  console.clear();

  const puppeteer = await setPuppeteer({
    puppeteerOptions: {
      devtools: true,
    },
  });
  const page = puppeteer.page;
  const browser = puppeteer.browser;

  await page.goto(url, {
    waitUntil: "networkidle0",
  });

  // await sleep(timeout);
  // const zoomPlus = "button[aria-label='Zoom in']";
  // const zoomMinus = "button[aria-label='Zoom out']";
  const generalClick = "div[id='page']";

  await page.waitForSelector(zoomPlus, { visible: true });
  await page.click(zoomPlus);

  await sleep(2000);

  await page.keyboard.down("ArrowLeft");
  await page.keyboard.up("ArrowLeft");

  return;

  const imgSrcList = await page.$$eval('#map img[draggable="false"]', (imgs) =>
    imgs.map((img) => img.src)
  );
  const randomImage =
    imgSrcList[Math.floor(Math.random() * imgSrcList.length - 1)];

  // Télécharger l'image
  //const download = await axios.get(imageUrl, { responseType: 'arraybuffer' }
  await downloadImage(randomImage, "images/tile.png");

  console.log("building...");

  const tile = await jimp.read("images/tile.png"); //image input
  const tileMask = await jimp.read("images/tile.png"); //image input
  const mask = await jimp.read("images/mask.png"); //image + mask

  //image masked
  tileMask.mask(mask, 0, 0);

  // save image
  tile.resize(256, jimp.AUTO);
  tileMask.resize(256, jimp.AUTO);

  await tile.writeAsync("images/tile.png");
  await tileMask.writeAsync("images/tile_masked.png");

  // fonction génération de l'image
  const response = await openai.images.edit({
    model: "dall-e-2",
    image: fs.createReadStream("images/tile.png"),
    mask: fs.createReadStream("images/tile_masked.png"),
    prompt: `A detailed futuristic building complex on the Martian surface in a black and white satellite image. The building complex is in 3D isometric view, integrated into the Martian landscape with several impact craters around it. The architecture is advanced and imaginative, showcasing advanced technology. The building complex and surroundings are colored to enhance the visual appeal, but key features of the craters are not obscured. No text in the image. Large Building complex with crazy aaarchitecture on Mars.`,
    // prompt: `A google maps satellite view of a huge futuristic lunar like New `,
    n: 1,
    size: "256x256",
  });

  const generatedImgUrl = response.data[0].url;
  console.log("Image URL:", generatedImgUrl);

  await page.$eval(
    "img[src='" + randomImage + "']",
    (img, generatedImgUrl) => {
      img.src = generatedImgUrl;
    },
    generatedImgUrl
  );

  // await browser.close();
})();

async function downloadImage(url, filename) {
  const response = await axios.get(url, { responseType: "arraybuffer" });

  fs.writeFile(filename, response.data, (err) => {
    if (err) throw err;
    console.log("Image downloaded successfully!");
  });
}
