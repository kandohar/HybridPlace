import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, get, set, update, child, onChildAdded, onChildChanged, increment } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBiqo_XSSCnF2o-DzouZumawr132boghKg",
  authDomain: "hybrid-place-2024.firebaseapp.com",
  databaseURL: "https://hybrid-place-2024-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "hybrid-place-2024",
  storageBucket: "hybrid-place-2024.appspot.com",
  messagingSenderId: "825801592342",
  appId: "1:825801592342:web:d7b7049919eb0db177ef37"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const documentErrorConsole = document.getElementById("errorConsole");

export function drawServerTiles(setTileCallback) {
  // https://firebase.google.com/docs/database/web/read-and-write#web_value_events

  let tilesRef = ref(db, "tiles/");

  // called on start and every time a new tile is added
  onChildAdded(tilesRef, (data) => {
    let tile = data.val();
    setTileCallback(tile.x, tile.y, tile.color, tile.username);
  }, (error) => {
    console.error(error);
    showError(error);
  });

  // called when a tile is modified
  onChildChanged(tilesRef, (data) => {
    let tile = data.val();
    setTileCallback(tile.x, tile.y, tile.color, tile.username);
  }, (error) => {
    console.error(error);
    showError(error);
  });
}

export function writeServerTile(x, y, color, username) {
  // https://firebase.google.com/docs/database/web/read-and-write#basic_write

  // create or update a tile on the db
  set(ref(db, 'tiles/' + 'tile_' + x + '_' + y), {
    x: x,
    y: y,
    color: color,
    username: username
  }).catch((error) => {
    console.error(error);
    showError(error);
  });

  // increments click count
  update(ref(db, 'stats/' + username), {
    clicks: increment(1)
  }).catch((error => {
    console.error(error);
    showError(error);
  }));
}

export function incConnectionCount(username) {
  // increments connection count
  update(ref(db, 'stats/' + username), {
    connections: increment(1)
  }).catch((error => {
    console.error(error);
    showError(error);
  }));
}

export function getStats(callbackTiles, callbackStats) {
  let dbRef = ref(db);

  // get whole tiles table
  get(child(dbRef, "tiles/")).then((snapshot) => {
    if (snapshot.exists()) {
      callbackTiles(snapshot.val());
    } else {
      console.error("no data");
      showError(error);
    }
  }).catch((error) => {
    console.error(error);
    showError(error);
  });

  // get whole stats table
  get(child(dbRef, "stats/")).then((snapshot) => {
    if (snapshot.exists()) {
      callbackStats(snapshot.val());
    } else {
      console.error("no data");
    }
  }).catch((error) => {
    console.error(error);
    showError(error);
  });
}

function showError(error) {
  documentErrorConsole.innerHTML += error + "<br>";
  documentErrorConsole.style.display = "block";
}