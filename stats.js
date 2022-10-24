import { getStats } from "./firebase.js";

let stats = {};

getStats((data) => {

    for (let i in data) {
        let entry = data[i];

        if (entry.hasOwnProperty("username")) {
            incStats(entry["username"]);
        } else {
            incStats("anonymous");
        }
    }

    document.getElementById("stats").textContent += "Total = " + Object.keys(data).length + " ";
    document.getElementById("stats").textContent += JSON.stringify(stats);
});

function incStats(name) {
    if (stats.hasOwnProperty(name))
        stats[name]++;
    else
        stats[name] = 1;
}

