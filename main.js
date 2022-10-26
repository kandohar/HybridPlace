import { drawServerTiles, writeServerTile } from "./firebase.js";

const canvasWidth = 100;
const canvasHeight = 100;
const defaultCanvasColor = "#FFFFFF";

const defaultZoom = 8;

const outputCanvas = document.getElementById("canvas");
let outputCtxt;

let dataCanvas;
let dataCtxt;

let colorPalette = [];
let colorButtons = [];
let currentColor;

let requestDraw;
let mousePos = { x: -1, y: -1 };

const cookieName = "hybrid-place-username=";
let username = "anonymous";

let userData = [[]];

const zoomInElem = document.getElementById("zoomin");
const zoomOutElem = document.getElementById("zoomout");
const positionElem = document.getElementById("position");
const drawnByValueElem = document.getElementById("drawnByValue");
const usernameValueElem = document.getElementById("usernameValue");
const usernameResetElem = document.getElementById("usernameReset");

const rootStyle = document.querySelector(":root").style;
let nextSide = true;

initUser();
initOutputCanvas();
initDataCanvas();
initZoomButtons();
initColorPalette();
initColorButtons();

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
        let input = encodeURIComponent(prompt("Username:"));
        if (input) {
            username = input;
            document.cookie = `${cookieName}${input}; SameSite=strict; Secure`;
        }
    }

    // show username
    usernameValueElem.textContent = decodeURIComponent(username);

    // init usernameReset button
    usernameResetElem.onclick = (_) => {
        let input = encodeURIComponent(prompt("Username:"));
        if (input) {
            username = input;
        } else {
            username = "anonymous";
        }
        document.cookie = `${cookieName}${username}; SameSite=strict; Secure`;
        usernameValueElem.textContent = decodeURIComponent(username);
    };
}

function initOutputCanvas() {
    outputCanvas.width = canvasWidth * defaultZoom;
    outputCanvas.height = canvasHeight * defaultZoom;
    outputCtxt = outputCanvas.getContext("2d");

    // draw on click
    outputCanvas.onclick = e => {
        let pos = getLocalMousePosition(e);
        writeServerTile(pos.x, pos.y, currentColor, username);
    };

    // update position text value
    outputCanvas.onmousemove = e => {
        let pos = getLocalMousePosition(e);

        positionElem.textContent = `(${pos.x}, ${pos.y})`;

        if (userData[pos.x] != null && userData[pos.x][pos.y] != null) {
            drawnByValueElem.textContent = userData[pos.x][pos.y];
        } else {
            drawnByValueElem.textContent = "anonymous";
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

    drawServerTiles(setTile);
}

function initZoomButtons() {
    zoomInElem.onclick = _ => {
        zoomIn();
    };
    zoomOutElem.onclick = _ => {
        zoomOut();
    };

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
    // Add brush tools.
    let colorsElem = document.getElementById("colors");

    for (let i in colorPalette) {
        let color = colorPalette[i];
        let colorButton = document.createElement('div');
        colorButton.style.backgroundColor = color;
        colorButton.onclick = _ => {
            currentColor = color;
            colorButtons.forEach(cb => cb.classList.remove("enabled"));
            colorButton.classList.add("enabled");

            if (nextSide) {
                rootStyle.setProperty("--bg-color-1", color);
            } else {
                rootStyle.setProperty("--bg-color-2", color);
            }
            nextSide = !nextSide;
        };

        colorsElem.appendChild(colorButton);
        colorButtons.push(colorButton);
    }

    colorButtons[0].onclick();
}

// EVENTS
function renderOutputCanvas() {
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
    dataCtxt.fillStyle = color;
    dataCtxt.fillRect(x, y, 1, 1);

    if (userData[x] == null)
        userData[x] = [];
    userData[x][y] = username;

    renderOutputCanvas();
}

function getLocalMousePosition(e) {
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