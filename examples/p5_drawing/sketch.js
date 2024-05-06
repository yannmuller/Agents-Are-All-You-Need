let cellSize;
let cells = 4;

const colors = ["red", "blue", "yellow", "white"];
const shapes = ["square", "circle", "triangle", "half_circle"];

let pcolor, pshape, posx, posy;

function setup() {
  createCanvas(windowWidth, windowHeight);
  background(0);
  angleMode(DEGREES);
  noLoop();

  pcolor = random(colors);
  pshape = random(shapes);

  cellSize = width / cells;
}

function mouseClicked() {
  posx = mouseX;
  posy = mouseY;
  drawShape();
}

function drawShape() {
  const i = Math.floor(posx / cellSize);
  const j = Math.floor(posy / cellSize);

  const x = i * cellSize;
  const y = j * cellSize;

  push();
  translate(x + cellSize / 2, y + cellSize / 2); // Move the origin to the center of the cell

  const rotations = [0, 90, 180, 270];
  const randomRotation = random(rotations);
  rotate(randomRotation);

  fill(pcolor);
  noStroke();

  switch (pshape) {
    case "square":
      rectMode(CENTER);
      rect(0, 0, cellSize, cellSize);
      break;
    case "circle":
      ellipseMode(CENTER);
      ellipse(0, 0, cellSize);
      break;
    case "triangle":
      triangle(
        -cellSize / 2,
        -cellSize / 2,
        0,
        cellSize / 2,
        cellSize / 2,
        -cellSize / 2
      );
      break;
    case "half_circle":
      // half circle
      arc(0, 0, cellSize, cellSize, 0, 180);
      break;
  }
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  background(0);
}
