import { getStats } from "./firebase.js";

let tilesCount = {};
let clicksCount = {};
let connectionsCount = {};

let tilesDrawnByTableElem = document.getElementById("tilesDrawnByTable");
let statsConnectionsTableElem = document.getElementById("statsConnectionsTable");
let statsClicksTableElem = document.getElementById("statsClicksTable");

getStats((tiles) => {
	for (let i in tiles) {
		let entry = tiles[i];

		if (entry.hasOwnProperty("username")) {
			inc(tilesCount, entry["username"]);
		} else {
			inc(tilesCount, "anonymous");
		}
	}

	tilesDrawnByTableElem.appendChild(createTableRow("Total", Object.keys(tiles).length));
	Object.entries(tilesCount).sort(([, a], [, b]) => b - a).forEach(entry => {
		const [key, value] = entry;
		tilesDrawnByTableElem.appendChild(createTableRow(key, value));
	});
}, (stats) => {
	let sumClicks = 0;
	let sumConnections = 0;
	Object.entries(stats).forEach(entry => {
		const [key, value] = entry;
		if (value.hasOwnProperty("connections")) {
			connectionsCount[key] = value["connections"];
			sumConnections += value["connections"];
		} else {
			connectionsCount[key] = 0;
		}
		if (value.hasOwnProperty("clicks")) {
			clicksCount[key] = value["clicks"];
			sumClicks += value["clicks"];
		} else {
			clicksCount[key] = 0;
		}
	});

	statsConnectionsTableElem.appendChild(createTableRow("Total", sumConnections));
	Object.entries(connectionsCount).sort(([, a], [, b]) => b - a).forEach(entry => {
		const [key, value] = entry;
		statsConnectionsTableElem.appendChild(createTableRow(key, value));
	});

	statsClicksTableElem.appendChild(createTableRow("Total", sumClicks));
	Object.entries(clicksCount).sort(([, a], [, b]) => b - a).forEach(entry => {
		const [key, value] = entry;
		if (value != 0)
			statsClicksTableElem.appendChild(createTableRow(key, value));
	});
});

function inc(array, name) {
	if (array.hasOwnProperty(name))
		array[name]++;
	else
		array[name] = 1;
}

function createTableRow(val1, val2) {
	let row = document.createElement("tr");
	let col1 = document.createElement("td");
	let col2 = document.createElement("td");

	col1.textContent = decodeURIComponent(val1);
	col2.textContent = decodeURIComponent(val2);

	row.appendChild(col1);
	row.appendChild(col2);

	return row;
}

