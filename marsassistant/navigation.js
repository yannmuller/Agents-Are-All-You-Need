import { sleep } from "../utils.js";

export async function navigate(page, direction) {
  switch (direction) {
    case "left":
      await page.keyboard.down("ArrowLeft");
      await sleep(500);
      await page.keyboard.up("ArrowLeft");
      break;
    case "right":
      await page.keyboard.down("ArrowRight");
      await sleep(500);
      await page.keyboard.up("ArrowRight");
      break;
    case "up":
      await page.keyboard.down("ArrowUp");
      await sleep(300);
      await page.keyboard.up("ArrowUp");
      break;
    case "down":
      await page.keyboard.down("ArrowDown");
      await sleep(300);
      await page.keyboard.up("ArrowDown");
      break;
    case "zoomIn":
      const zoomPlus = "button[aria-label='Zoom in']";
      await page.waitForSelector(zoomPlus, { visible: true });
      await page.click(zoomPlus);
      break;
    case "zoomOut":
      const zoomMinus = "button[aria-label='Zoom out']";
      await page.waitForSelector(zoomMinus, { visible: true });
      await page.click(zoomMinus);
      break;
    default:
      console.error("Invalid direction");
  }
}
