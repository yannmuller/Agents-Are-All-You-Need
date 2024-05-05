let capture;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Create the video capture and hide the element.
  capture = createCapture(VIDEO);
  capture.hide();
}

function draw() {
  // Draw the video capture within the canvas.
  image(capture, 0, 0, width, (width * capture.height) / capture.width);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
