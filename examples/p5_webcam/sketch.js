let capture;

function setup() {
  createCanvas(windowWidth, windowHeight);

  // Create the video capture and hide the element.
  capture = createCapture(VIDEO);
  capture.hide();
}

function draw() {
  background(0);

  // Responsive video capture
  let videoAspectRatio = capture.width / capture.height;
  let canvasAspectRatio = width / height;

  let x, y, w, h;

  if (canvasAspectRatio > videoAspectRatio) {
    w = width;
    h = w / videoAspectRatio;
    x = 0;
    y = (height - h) / 2;
  } else {
    h = height;
    w = h * videoAspectRatio;
    y = 0;
    x = (width - w) / 2;
  }

  image(capture, x, y, w, h);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
