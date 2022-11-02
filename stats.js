import { getStats } from "./firebase.js";

let tilesCount = {};
let statsCount = {};

let canvasPixelCountElem = document.getElementById("canvasPixelCount");
let canvasPixelDrawnByElem = document.getElementById("canvasPixelDrawnBy");
let statsPixelCountElem = document.getElementById("statsPixelCount");
let statsUserClicksElem = document.getElementById("statsUserClicks");

getStats((tiles) => {
    for (let i in tiles) {
        let entry = tiles[i];

        if (entry.hasOwnProperty("username")) {
            inc(tilesCount, entry["username"]);
        } else {
            inc(tilesCount, "anonymous");
        }
    }

    canvasPixelCountElem.textContent = Object.keys(tiles).length;

    Object.entries(tilesCount).forEach(entry => {
        const [key, value] = entry;
        canvasPixelDrawnByElem.innerHTML += `<tr><td>${key}</td><td>${value}</td></tr>`;
    });
}, (stats) => {
    let sumClicks = 0;
    Object.entries(stats).forEach(entry => {
        const [key, value] = entry;
        statsCount[key] = value["clicks"];
        sumClicks += value["clicks"];
    });

    statsPixelCountElem.textContent = sumClicks;

    Object.entries(statsCount).forEach(entry => {
        const [key, value] = entry;
        statsUserClicksElem.innerHTML += `<tr><td>${key}</td><td>${value}</td></tr>`;
    });
});

function inc(array, name) {
    if (array.hasOwnProperty(name))
        array[name]++;
    else
        array[name] = 1;
}

