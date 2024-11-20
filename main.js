import { drawServerTiles, writeServerTile, incConnectionCount, uploadImage, isSnapshotOld } from "./firebase.js";

// BEGIN SETTINGS
const canvasHeight = 200;
const canvasWidth = Math.floor(canvasHeight * (29.7 / 21.0)); // A4 ratio
const defaultCanvasColor = "#FFFFFF";

const initialZoom = 3;

const exportPixelSize = 8;
// END SETTINGS

// displayed data, resizable
const outputCanvas = document.getElementById("canvas");
let outputContext;
let currentZoom = initialZoom;

// data linked to database
let dataCanvas;
let dataContext;

let colorPalette = [];
let colorButtons = [];
let currentColor;

let requestDraw;
let mousePos = { x: -1, y: -1 };

var pipetteMode = false;

const cookieName = "hybrid-place-username=";
// day * hours * minutes * seconds
// 10 * 24 * 60 * 60
const cookieMaxAge = "864000";
let username = "anonymous";

let pixelDrawnByData = [[]];

const zoomInElem = document.getElementById("zoomin");
const zoomOutElem = document.getElementById("zoomout");
const saveElem = document.getElementById("save");
const saveLinkElem = document.getElementById("saveLink");
const changeBgElem = document.getElementById("changeBg");
const positionElem = document.getElementById("position");
const drawnByValueElem = document.getElementById("drawnByValue");
const usernameValueElem = document.getElementById("usernameValue");
const usernameResetElem = document.getElementById("usernameReset");
const instructionElem = document.getElementById("instruction");
const instructionCloseBtnElem = document.getElementById("instructionCloseBtn");

var customColorElem;
var colorPickerElem;
var colorPipetteElem;

// init everything
initUser();
initOutputCanvas();
initDataCanvas();
initToolsButtons();
initColorPalette();
initColorButtons();
initBackgroundColor();

// then hide spinner and show canvas
document.getElementById("loader").style.display = 'none';
document.getElementById("loaded").style.display = 'block';

// wait for data to load and try upload snapshot
setTimeout(tryUploadSnapshot, 500);

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
            document.cookie = `${cookieName}${safeInput}; SameSite=strict; Max-Age=${cookieMaxAge}; Secure`;
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
        document.cookie = `${cookieName}${username}; SameSite=strict; Max-Age=${cookieMaxAge}; Secure`;
        // update username display
        usernameValueElem.textContent = decodeURIComponent(username);
        // inc stats connection count
        incConnectionCount(username);
    };
}

function initOutputCanvas() {
    outputCanvas.width = canvasWidth * currentZoom;
    outputCanvas.height = canvasHeight * currentZoom;
    outputContext = outputCanvas.getContext("2d");

    // draw on click
    outputCanvas.onclick = e => {
        if (pipetteMode) {
            const canvasPixelColor = getCanvasPixelColor(mousePos.x, mousePos.y);
            setCurrentColor(canvasPixelColor, customColorElem);
            colorPickerElem.value = canvasPixelColor;
            customColorElem.style.backgroundColor = canvasPixelColor;

            onColorPipetteClickEvent();
        } else {
            if (isValidDraw(mousePos.x, mousePos.y, currentColor))
                writeServerTile(mousePos.x, mousePos.y, currentColor, username);
        }
    };

    // right click
    outputCanvas.addEventListener('contextmenu', e => {
        e.preventDefault();

        if (pipetteMode) {
            // cancel pipette
            onColorPipetteClickEvent();
        } else {
            // draw white pixel
            if (isValidDraw(mousePos.x, mousePos.y, defaultCanvasColor))
                writeServerTile(mousePos.x, mousePos.y, defaultCanvasColor, username);
        }

        return false;
    }, false);

    document.addEventListener('keydown', e => {
        if (e.code === 'Space') {
            e.preventDefault();

            // space bar => quick pipette
            if (mousePos.x != -1 && mousePos.y != -1) {
                const canvasPixelColor = getCanvasPixelColor(mousePos.x, mousePos.y);
                setCurrentColor(canvasPixelColor, customColorElem);
                colorPickerElem.value = canvasPixelColor;
                customColorElem.style.backgroundColor = canvasPixelColor;
            }
        } else if ((e.code === 'Numpad0' || e.code === 'Digit0') && e.ctrlKey) {
            e.preventDefault();

            // CTRL+0 => reset zoom
            resetZoom();
        } else if ((e.code === 'NumpadAdd' || e.code === 'Equal') && e.ctrlKey) {
            e.preventDefault();

            // CTRL+'+' => zoom in
            zoomIn();
        } else if ((e.code === 'NumpadSubtract' || e.code === 'Digit6') && e.ctrlKey) {
            e.preventDefault();

            // CTRL+'-' => zoom out
            zoomOut();
        }

        // console.debug(e.code + " : " + e.key);
    });

    // update position & drawnBy values
    outputCanvas.onmousemove = e => {
        const pos = getLocalMousePosition(e);

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

function initDataCanvas() {
    dataCanvas = document.createElement('canvas');
    dataCanvas.width = canvasWidth;
    dataCanvas.height = canvasHeight
    dataContext = dataCanvas.getContext('2d')

    // get values from db
    drawServerTiles(setTile);
}

function initToolsButtons() {
    zoomInElem.onclick = _ => zoomIn();
    zoomOutElem.onclick = _ => zoomOut();
    saveElem.onclick = _ => savePng();
    changeBgElem.onclick = _ => initBackgroundColor();

    instructionCloseBtnElem.onclick = _ => closeInstruction();
}

function initColorPalette() {
    // black to dark grey
    colorPalette.push(hslToHtml(0, 0, 0));
    colorPalette.push(hslToHtml(0, 0, 100 / 5));
    colorPalette.push(hslToHtml(0, 0, 200 / 5));

    // grey to white
    colorPalette.push(hslToHtml(0, 0, 300 / 5));
    colorPalette.push(hslToHtml(0, 0, 400 / 5));
    colorPalette.push(hslToHtml(0, 0, 100));

    const colors = 12;

    // if needed: https://colorjs.io
    // WaveLength color
    for (let i = 0; i < colors; i++) {
        const minWave = 400;
        const maxWave = 645;
        const wave = minWave + (i * ((maxWave - minWave) / (colors - 1)));
        let rgb = nmToRgb(wave);
        let hsl = rgbToHsl(rgb);

        let html = hslToHtml(hsl[0] * 360, 100, 25);
        colorPalette.push(html);
        html = hslToHtml(hsl[0] * 360, 100, 50);
        colorPalette.push(html);
        html = hslToHtml(hsl[0] * 360, 100, 75);
        colorPalette.push(html);
    }
}

function initColorButtons() {
    // for each color in colorPalette, creates a corresponding button
    const colorsElem = document.getElementById("colors");

    for (let i in colorPalette) {
        const color = colorPalette[i];
        const colorButton = document.createElement('div');
        colorButton.title = color;
        colorButton.classList.add("color");
        colorButton.style.backgroundColor = color;
        colorButton.onclick = _ => {
            setCurrentColor(color, colorButton);
        };

        colorsElem.appendChild(colorButton);
        colorButtons.push(colorButton);
    }

    // Add custom color
    customColorElem = document.createElement('div');
    customColorElem.id = "customColor";
    customColorElem.classList.add("color");
    customColorElem.style.backgroundColor = "#000000";
    customColorElem.onclick = _ => {
        setCurrentColor(colorPickerElem.value, customColorElem);
    };
    colorsElem.appendChild(customColorElem);

    // Add ColorPicker
    colorPickerElem = document.createElement('input');
    colorPickerElem.id = "colorPicker";
    colorPickerElem.classList.add("color");
    colorPickerElem.type = "color";
    colorPickerElem.name = "colorPicker";
    colorPickerElem.value = "#000000";
    colorPickerElem.title = "ColorPicker";
    colorPickerElem.onclick = _ => setCurrentColor(colorPickerElem.value, customColorElem);
    colorPickerElem.addEventListener("input", onColorPickerInputEvent, false);
    colorsElem.appendChild(colorPickerElem);

    // Add ColorPipette
    colorPipetteElem = document.createElement('button');
    colorPipetteElem.id = "colorPipette";
    colorPipetteElem.classList.add("color");
    colorPipetteElem.title = "Pipette";
    colorPipetteElem.onclick = onColorPipetteClickEvent;
    colorsElem.appendChild(colorPipetteElem);

    // select the first color by default
    colorButtons[0].onclick();
}

function onColorPickerInputEvent(event) {
    setCurrentColor(event.target.value, customColorElem);
    colorPickerElem.value = event.target.value;
    customColorElem.style.backgroundColor = event.target.value;
}

function onColorPipetteClickEvent() {
    pipetteMode = !pipetteMode;

    if (pipetteMode) {
        colorPipetteElem.classList.add("enabled");
        outputCanvas.classList.add("pipette");
    } else {
        colorPipetteElem.classList.remove("enabled");
        outputCanvas.classList.remove("pipette");
    }
}

function setCurrentColor(color, elem) {
    currentColor = color;

    colorButtons.forEach(cb => cb.classList.remove("enabled"));
    customColorElem.classList.remove("enabled");
    colorPickerElem.classList.remove("enabled");

    elem.classList.add("enabled");
}

function initBackgroundColor() {
    const root = document.querySelector(':root');

    const hue = Math.floor(Math.random() * 360);
    root.style.setProperty('--bg-color-1', hslToHtml(hue, 100, 75));

    const hue2 = Math.floor(Math.random() * 360);
    root.style.setProperty('--bg-color-2', hslToHtml(hue2, 100, 75));

    const rotation = Math.floor(Math.random() * 180);
    root.style.setProperty('--bg-angle', `${rotation}deg`);
}

// EVENTS
function renderOutputCanvas() {
    // solution to avoid multiple render call in 1 frame
    if (requestDraw)
        return;

    requestDraw = true
    requestAnimationFrame(() => {
        outputContext.imageSmoothingEnabled = false;

        // fill empty canvas
        outputContext.fillStyle = defaultCanvasColor;
        outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height);

        // draw data canvas
        outputContext.save();
        const widthScaleFactor = outputCanvas.width / canvasWidth;
        const heightScaleFactor = outputCanvas.height / canvasHeight;
        outputContext.scale(widthScaleFactor, heightScaleFactor);
        outputContext.drawImage(dataCanvas, 0, 0);
        outputContext.restore();

        // draw pixel preview on cursor
        if (mousePos.x != -1 && mousePos.y != -1) {
            outputContext.save();
            outputContext.scale(widthScaleFactor, heightScaleFactor);
            if (pipetteMode) {
                const canvasPixelColor = getCanvasPixelColor(mousePos.x, mousePos.y);
                outputContext.fillStyle = canvasPixelColor;
            } else {
                outputContext.fillStyle = currentColor;
            }
            outputContext.fillRect(mousePos.x, mousePos.y, 1, 1);
            outputContext.restore();
        }

        requestDraw = false
    });
}

function zoomIn() {
    currentZoom *= 1.2;

    // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
    // maximum canvas size of 6000 to avoid any unexpected behaviour
    currentZoom = clamp(currentZoom, 1, Math.floor(6000 / canvasWidth));

    resizeCanvas(currentZoom);
}

function zoomOut() {
    currentZoom *= 0.8;

    currentZoom = clamp(currentZoom, 1, Math.floor(6000 / canvasWidth));

    resizeCanvas(currentZoom);
}

function resetZoom() {
    currentZoom = initialZoom;

    resizeCanvas(currentZoom);
}

function closeInstruction() {
    instructionElem.style.display = "none";
}

function savePng() {
    resizeCanvas(exportPixelSize);

    setTimeout(savePngHandler);
}

function savePngHandler() {
    saveLinkElem.setAttribute('download', 'canvas.png');
    saveLinkElem.setAttribute('href', outputCanvas.toDataURL("image/png", 1).replace("image/png", "image/octet-stream"));
    saveLinkElem.click();

    // restore zoom level
    resizeCanvas(currentZoom);
}

function tryUploadSnapshot() {
    // check if the last uploaded snapshot is outdated
    isSnapshotOld(uploadPng);
}

function uploadPng() {
    resizeCanvas(exportPixelSize);

    setTimeout(uploadPngHandler);
}

function uploadPngHandler() {
    outputCanvas.toBlob((blob) => {
        uploadImage(blob);
    }, "image/png", 1);

    // restore zoom level
    resizeCanvas(currentZoom);
}

function setTile(x, y, color, username) {
    // update the data canvas
    dataContext.fillStyle = color;
    dataContext.fillRect(x, y, 1, 1);

    if (pixelDrawnByData[x] == null)
        pixelDrawnByData[x] = [];
    pixelDrawnByData[x][y] = username;

    renderOutputCanvas();
}

function getLocalMousePosition(e) {
    // convert window mouse position into data canvas mouse position
    const rect = outputCanvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

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
function resizeCanvas(scale) {
    // save scroll percent
    let percentWidth = document.documentElement.scrollLeft / (document.documentElement.scrollWidth - document.documentElement.clientWidth);
    let percentHeight = document.documentElement.scrollTop / (document.documentElement.scrollHeight - document.documentElement.clientHeight);

    // recompute canvas size
    outputCanvas.width = canvasWidth * scale;
    outputCanvas.height = canvasHeight * scale;

    // update render
    renderOutputCanvas();

    // restore scroll percent
    window.scrollTo((document.documentElement.scrollWidth - document.documentElement.clientWidth) * percentWidth, (document.documentElement.scrollHeight - document.documentElement.clientHeight) * percentHeight);
}

const clamp = (x, min, max) => Math.max(Math.min(x, max), min);

function isValidDraw(x, y, color) {
    // get current color on canvas
    const canvasPixelColor = getCanvasPixelColor(x, y);

    // if no pixel was already placed (the default valid is #000000), allow it
    if (canvasPixelColor.toLowerCase() == "#000000") {
        return true;
    }

    // check canvas pixel != desired pixel
    if (canvasPixelColor.toLowerCase() != color.toLowerCase())
        return true;

    return false;
}

function getCanvasPixelColor(x, y) {
    // get current color on canvas
    const targetPixelData = dataContext.getImageData(x, y, 1, 1).data;
    const targetPixelColor = rgbToHtml(targetPixelData);
    return targetPixelColor;
}

function hslToHtml(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');   // convert to Hex and prefix "0" if needed
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function rgbToHtml(rgb) {
    const r = rgb[0];
    const g = rgb[1];
    const b = rgb[2];

    const html = "#" + ("000000" + (((r << 16) | (g << 8) | b).toString(16))).slice(-6);

    return html;
}

function rgbToHsl(rgb) {
    let r = rgb[0];
    let g = rgb[1];
    let b = rgb[2];

    r /= 255, g /= 255, b /= 255;

    var max = Math.max(r, g, b), min = Math.min(r, g, b);
    var h, s, l = (max + min) / 2;

    if (max == min) {
        h = s = 0; // achromatic
    } else {
        var d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }

        h /= 6;
    }

    return [h, s, l];
}

function nmToRgb(wavelength) {
    var Gamma = 0.80,
        IntensityMax = 255,
        factor, red, green, blue;
    if ((wavelength >= 380) && (wavelength < 440)) {
        red = -(wavelength - 440) / (440 - 380);
        green = 0.0;
        blue = 1.0;
    } else if ((wavelength >= 440) && (wavelength < 490)) {
        red = 0.0;
        green = (wavelength - 440) / (490 - 440);
        blue = 1.0;
    } else if ((wavelength >= 490) && (wavelength < 510)) {
        red = 0.0;
        green = 1.0;
        blue = -(wavelength - 510) / (510 - 490);
    } else if ((wavelength >= 510) && (wavelength < 580)) {
        red = (wavelength - 510) / (580 - 510);
        green = 1.0;
        blue = 0.0;
    } else if ((wavelength >= 580) && (wavelength < 645)) {
        red = 1.0;
        green = -(wavelength - 645) / (645 - 580);
        blue = 0.0;
    } else if ((wavelength >= 645) && (wavelength < 781)) {
        red = 1.0;
        green = 0.0;
        blue = 0.0;
    } else {
        red = 0.0;
        green = 0.0;
        blue = 0.0;
    };
    // Let the intensity fall off near the vision limits
    if ((wavelength >= 380) && (wavelength < 420)) {
        factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
    } else if ((wavelength >= 420) && (wavelength < 701)) {
        factor = 1.0;
    } else if ((wavelength >= 701) && (wavelength < 781)) {
        factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
    } else {
        factor = 0.0;
    };
    if (red !== 0) {
        red = Math.round(IntensityMax * Math.pow(red * factor, Gamma));
    }
    if (green !== 0) {
        green = Math.round(IntensityMax * Math.pow(green * factor, Gamma));
    }
    if (blue !== 0) {
        blue = Math.round(IntensityMax * Math.pow(blue * factor, Gamma));
    }
    return [red, green, blue];
}