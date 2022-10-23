import { drawServerTiles, writeServerTile } from "./firebase.js";

const canvasWidth = 100;
const canvasHeight = 100;
const defaultCanvasColor = "#FFFFFF";

let outputCanvas;
let outputCtxt;

let dataCanvas;
let dataCtxt;

let colorPalette = [];
let colorButtons = [];
let currentColor;

initOutputCanvas();
initDataCanvas();
initZoomButtons();
initColorPalette();
initColorButtons();

document.getElementById("loader").style.display = 'none';
document.getElementById("loaded").style.display = 'block';

function initOutputCanvas() {
    outputCanvas = document.getElementById("canvas");
    outputCanvas.width = canvasWidth * 8;
    outputCanvas.height = canvasHeight * 8;
    outputCtxt = outputCanvas.getContext("2d");

    // draw on click
    outputCanvas.onclick = e => {
        let pos = getLocalMousePosition(e);
        writeServerTile(pos.x, pos.y, currentColor);
    };

    // update position text value
    let positionElem = document.getElementById("position");
    outputCanvas.onmousemove = e => {
        let pos = getLocalMousePosition(e);
        positionElem.textContent = `(${pos.x}, ${pos.y})`;
    };
    outputCanvas.onmouseleave = _ => {
        positionElem.textContent = `(-1, -1)`;
    }
}

function initDataCanvas() {
    dataCanvas = document.createElement('canvas');
    dataCanvas.width = canvasWidth;
    dataCanvas.height = canvasHeight
    dataCtxt = dataCanvas.getContext('2d')

    drawServerTiles();
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

function renderOutputCanvas() {
    outputCtxt.imageSmoothingEnabled = false

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
}

function initZoomButtons() {
    let zoomInButton = document.getElementById("zoomin");
    let zoomOutButton = document.getElementById("zoomout");

    zoomInButton.onclick = _ => {
        zoomIn();
    };
    zoomOutButton.onclick = _ => {
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

function zoomIn() {
    //console.debug("zoomIn");

    outputCanvas.width = clamp(outputCanvas.width * 2, 100, 6400);
    outputCanvas.height = clamp(outputCanvas.height * 2, 100, 6400);

    renderOutputCanvas();
}

function zoomOut() {
    //console.debug("zoomOut");

    outputCanvas.width = clamp(outputCanvas.width * 0.5, 100, 6400);
    outputCanvas.height = clamp(outputCanvas.height * 0.5, 100, 6400);

    renderOutputCanvas();
}

function initColorPalette() {
    colorPalette.push("#000000");
    colorPalette.push("#7F7F7F");
    colorPalette.push("#FFFFFF");
    for (let i = 0; i < 360; i += (360 / 10)) {
        var c = hslToHex(i, 100, 25);
        colorPalette.push(c);
        var c = hslToHex(i, 100, 50);
        colorPalette.push(c);
        var c = hslToHex(i, 100, 75);
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
        };

        colorsElem.appendChild(colorButton);
        colorButtons.push(colorButton);
    }

    colorButtons[0].onclick();
}

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

export function setTile(x, y, color) {
    dataCtxt.fillStyle = color;
    dataCtxt.fillRect(x, y, 1, 1);

    renderOutputCanvas();
}

const clamp = (x, min, max) => Math.max(Math.min(x, max), min);