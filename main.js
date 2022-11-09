import { drawServerTiles, incConnectionCount, writeServerTile } from "./firebase.js";

// BEGIN SETTINGS
const canvasWidth = 150;
const canvasHeight = 100;
const defaultCanvasColor = "#FFFFFF";

const defaultZoom = 8;
// END SETTINGS

// displayed data, resizable
const outputCanvas = document.getElementById("canvas");
let outputCtxt;

// data linked to database
let dataCanvas;
let dataCtxt;

let colorPalette = [];
let colorButtons = [];
let currentColor;

let requestDraw;
let mousePos = { x: -1, y: -1 };

const cookieName = "hybrid-place-username=";
let username = "anonymous";

let pixelDrawnByData = [[]];

const zoomInElem = document.getElementById("zoomin");
const zoomOutElem = document.getElementById("zoomout");
const positionElem = document.getElementById("position");
const drawnByValueElem = document.getElementById("drawnByValue");
const usernameValueElem = document.getElementById("usernameValue");
const usernameResetElem = document.getElementById("usernameReset");

// init everything
initUser();
initOutputCanvas();
initDataCanvas();
initZoomButtons();
initColorPalette();
initColorButtons();

// then hide spinner and show canvas
document.getElementById("loader").style.display = 'none';
document.getElementById("loaded").style.display = 'block';

// INITS
function initUser() {
    // try read cookie
    if (document.cookie.split(';').some((item) => item.trim().startsWith(cookieName))) {
        // cookie exists, read the value
        let input = document.cookie.split('; ').find((item) => item.trim().startsWith(cookieName)).split('=')[1];
        if (input) {
            username = input;
        }
    } else {
        // no cookie, ask user, create cookie
        let input = prompt("Username:");
        if (input) {
            let safeInput = encodeURIComponent(input);
            username = safeInput;
            // set cookie
            document.cookie = `${cookieName}${safeInput}; SameSite=strict; Max-Age=172800; Secure`;
        } else {
            username = "anonymous";
        }
    }

    // show username display
    usernameValueElem.textContent = decodeURIComponent(username);

    // inc stats connection count
    incConnectionCount(username);

    // init usernameReset button
    usernameResetElem.onclick = (_) => {
        let input = prompt("Username:");
        if (input) {
            let safeInput = encodeURIComponent(input);
            username = safeInput;
        } else {
            username = "anonymous";
        }

        // update cookie
        document.cookie = `${cookieName}${username}; SameSite=strict; Max-Age=172800; Secure`;
        // update username display
        usernameValueElem.textContent = decodeURIComponent(username);
        // inc stats connection count
        incConnectionCount(username);
    };
}

function initOutputCanvas() {
    outputCanvas.width = canvasWidth * defaultZoom;
    outputCanvas.height = canvasHeight * defaultZoom;
    outputCtxt = outputCanvas.getContext("2d");

    // draw on click
    outputCanvas.onclick = e => {
        let pos = getLocalMousePosition(e);

        if (isValidDraw(pos.x, pos.y, currentColor))
            writeServerTile(pos.x, pos.y, currentColor, username);

    };

    // update position & drawnBy values
    outputCanvas.onmousemove = e => {
        let pos = getLocalMousePosition(e);

        positionElem.textContent = `(${pos.x}, ${pos.y})`;

        if (pixelDrawnByData[pos.x] != null && pixelDrawnByData[pos.x][pos.y] != null) {
            drawnByValueElem.textContent = decodeURIComponent(pixelDrawnByData[pos.x][pos.y]);
        } else {
            drawnByValueElem.textContent = "";
        }

        mousePos.x = pos.x;
        mousePos.y = pos.y;
        renderOutputCanvas();
    };
    outputCanvas.onmouseleave = _ => {
        positionElem.textContent = `(-1, -1)`;

        drawnByValueElem.textContent = "";

        mousePos.x = -1;
        mousePos.y = -1;
        renderOutputCanvas();
    }
}

function initDataCanvas() {
    dataCanvas = document.createElement('canvas');
    dataCanvas.width = canvasWidth;
    dataCanvas.height = canvasHeight
    dataCtxt = dataCanvas.getContext('2d')

    // get values from db
    drawServerTiles(setTile);
}

function initZoomButtons() {
    zoomInElem.onclick = _ => {
        zoomIn();
    };
    zoomOutElem.onclick = _ => {
        zoomOut();
    };

    // cancel CTRL+wheel browser zoom, instead apply custom zoom
    window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) {
            if (e.deltaY < 0) {
                zoomIn();
            } else if (e.deltaY > 0) {
                zoomOut();
            }
            e.preventDefault();
        }
    }, { passive: false });
}

function initColorPalette() {

    colorPalette.push("#000000");
    colorPalette.push("#7F7F7F");
    colorPalette.push("#FFFFFF");

    for (let i = 0; i < 360; i += (360 / 14)) {
        var c = hslToHex(i, 100, 25); // dark color
        colorPalette.push(c);
        var c = hslToHex(i, 100, 50); // base color
        colorPalette.push(c);
        var c = hslToHex(i, 100, 75); // light color
        colorPalette.push(c);
    }
}

function initColorButtons() {
    // for each color in colorPalette, creates a corresponding button
    let colorsElem = document.getElementById("colors");

    for (let i in colorPalette) {
        let color = colorPalette[i];
        let colorButton = document.createElement('div');
        colorButton.style.backgroundColor = color;
        colorButton.onclick = _ => {
            currentColor = color;
            colorButtons.forEach(cb => cb.classList.remove("enabled"));
            colorButton.classList.add("enabled");
        };

        colorsElem.appendChild(colorButton);
        colorButtons.push(colorButton);
    }

    // select the first color by default
    colorButtons[0].onclick();
}

// EVENTS
function renderOutputCanvas() {
    // solution to avoid multiple render call in 1 frame
    if (requestDraw)
        return;

    requestDraw = true
    requestAnimationFrame(() => {
        requestDraw = false

        outputCtxt.imageSmoothingEnabled = false;

        // fill empty canvas
        outputCtxt.fillStyle = defaultCanvasColor;
        outputCtxt.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

        // draw data canvas
        outputCtxt.save();
        let widthScaleFactor = outputCanvas.width / canvasWidth;
        let heightScaleFactor = outputCanvas.height / canvasHeight;
        outputCtxt.scale(widthScaleFactor, heightScaleFactor);
        outputCtxt.drawImage(dataCanvas, 0, 0);
        outputCtxt.restore();

        // draw pixel preview on cursor
        if (mousePos.x != -1 && mousePos.y != -1) {
            outputCtxt.save();
            outputCtxt.scale(widthScaleFactor, heightScaleFactor);
            outputCtxt.fillStyle = currentColor;
            outputCtxt.fillRect(mousePos.x, mousePos.y, 1, 1);
            outputCtxt.restore();
        }
    });
}

function zoomIn() {
    outputCanvas.width = clamp(outputCanvas.width * 2, canvasWidth, 6400);
    outputCanvas.height = clamp(outputCanvas.height * 2, canvasHeight, 6400);

    renderOutputCanvas();
}

function zoomOut() {
    outputCanvas.width = clamp(outputCanvas.width * 0.5, canvasWidth, 6400);
    outputCanvas.height = clamp(outputCanvas.height * 0.5, canvasHeight, 6400);

    renderOutputCanvas();
}

function setTile(x, y, color, username) {
    // update the data canvas
    dataCtxt.fillStyle = color;
    dataCtxt.fillRect(x, y, 1, 1);

    if (pixelDrawnByData[x] == null)
        pixelDrawnByData[x] = [];
    pixelDrawnByData[x][y] = username;

    renderOutputCanvas();
}

function getLocalMousePosition(e) {
    // convert window mouse position into data canvas mouse position
    let rect = outputCanvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;

    let widthScaleFactor = outputCanvas.width / canvasWidth;
    let heightScaleFactor = outputCanvas.height / canvasHeight;

    x /= widthScaleFactor;
    y /= heightScaleFactor;

    x = Math.floor(x);
    y = Math.floor(y);

    return {
        'x': x,
        'y': y
    };
}

// UTILS
const clamp = (x, min, max) => Math.max(Math.min(x, max), min);

function hslToHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function isValidDraw(x, y, color) {
    // get current color on canvas
    let targetPixelData = dataCtxt.getImageData(x, y, 1, 1).data;
    let targetPixelColor = imageDataToRGB(targetPixelData);

    // if no pixel was already placed, the default valid is #000000 so allow it
    if (targetPixelColor.toLowerCase() == "#000000")
        return true;

    // check canvas pixel != desired pixel
    if (targetPixelColor.toLowerCase() != color.toLowerCase())
        return true;

    return false;
}

function imageDataToRGB(data) {
    let r = data[0];
    let g = data[1];
    let b = data[2];

    let rgb = "#" + ("000000" + (((r << 16) | (g << 8) | b).toString(16))).slice(-6);

    return rgb;
}