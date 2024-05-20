import fs from "fs";
import { generateTile } from "./tile.js";

function toStream(base64, path) {
  base64 = base64.replace(/^data:image\/png;base64,/, "");
  fs.writeFileSync(path, base64, "base64");
  return fs.createReadStream(path);
}

export async function setZoom(page, zoom) {
  await page.evaluate(async (zoom) => {
    gMap.setZoom(zoom);

    await Promise.all([listenOnce("idle"), listenOnce("tilesloaded")]);

    async function listenOnce(event) {
      return new Promise((resolve) =>
        google.maps.event.addListenerOnce(gMap, event, resolve)
      );
    }

    // hide controls
  }, zoom);
}

export async function createTile({ page, openaiOpts, address }) {
  openaiOpts = {
    size: "1024x1024",
    ...openaiOpts,
  };

  const id = Date.now();
  const mapElem = await page.$('#map [aria-label="Map"]');
  const fileName = "map_" + id;
  const path = `images/${fileName}.png`;
  const urlPath = `${address}/${path}`;
  const maxRes = openaiOpts.size.split("x")[0];

  const exposedCreateTile = "createTile" + id;
  const exposedScreenshot = "screenshot" + id;

  await page.exposeFunction(exposedCreateTile, async (image64, mask64) => {
    return await generateTile(
      toStream(image64, `images/${fileName}_base.png`),
      toStream(mask64, `images/${fileName}_mask.png`),
      openaiOpts
    );
  });

  await page.exposeFunction(exposedScreenshot, async () => {
    await mapElem.screenshot({ path });
  });

  const src = await page.evaluate(
    async (mapElem, urlPath, maxRes, exposedCreateTile, exposedScreenshot) => {
      const bounds = gMap.getBounds();

      mapElem.classList.add("screenshot");
      await window[exposedScreenshot]();
      mapElem.classList.remove("screenshot");

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = urlPath;
      await img.decode();
      canvas.width = maxRes;
      canvas.height = maxRes;

      const { width, height } = canvas;
      ctx.drawImage(img, 0, 0, maxRes, maxRes);
      const baseImage = canvas.toDataURL("image/png");
      // clip
      ctx.globalCompositeOperation = "destination-out";
      // arc
      ctx.beginPath();
      ctx.fillStyle = "black";

      let margin = 0.1 * width;
      ctx.fillRect(margin, margin, width - margin * 2, height - margin * 2);
      // ctx.ellipse(
      //   width / 2,
      //   height / 2,
      //   width / 2.2,
      //   height / 2.2,
      //   0,
      //   2 * Math.PI,
      //   false
      // );
      ctx.fill();
      // save

      const maskImage = canvas.toDataURL("image/png");
      const overlay = new Tile(bounds, maskImage);
      overlay.setMap(gMap);
      const src = await window[exposedCreateTile](maskImage, maskImage);
      await overlay.setSrc(src);

      return src;
    },
    mapElem,
    urlPath,
    maxRes,
    exposedCreateTile,
    exposedScreenshot
  );

  await page.removeExposedFunction(exposedCreateTile);
  await page.removeExposedFunction(exposedScreenshot);

  return { src };
}
