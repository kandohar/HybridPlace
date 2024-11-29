import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref as ref_db, get, set, update, child, onChildAdded, onChildChanged, increment } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";
import { getStorage, ref as ref_storage, uploadBytes } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

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
const storage = getStorage(app);

const documentErrorConsole = document.getElementById("errorConsole");

export function drawServerTiles(setTileCallback) {
  // https://firebase.google.com/docs/database/web/read-and-write#web_value_events

  const tilesRef = ref_db(db, "tiles/");

  // called on start and every time a new tile is added
  onChildAdded(tilesRef, (data) => {
    let tile = data.val();
    setTileCallback(tile.x, tile.y, tile.color, tile.username);
  }, (error) => {
    showError(error);
  });

  // called when a tile is modified
  onChildChanged(tilesRef, (data) => {
    let tile = data.val();
    setTileCallback(tile.x, tile.y, tile.color, tile.username);
  }, (error) => {
    showError(error);
  });
}

export function writeServerTile(x, y, color, username) {
  // https://firebase.google.com/docs/database/web/read-and-write#basic_write

  // create or update a tile on the db
  set(ref_db(db, 'tiles/' + 'tile_' + x + '_' + y), {
    x: x,
    y: y,
    color: color,
    username: username,
    date: Date.now(),
  }).catch((error) => {
    showError(error);
  });

  // increments click count
  update(ref_db(db, 'stats/' + username), {
    clicks: increment(1)
  }).catch((error => {
    showError(error);
  }));

  // set logs/lastPlacedPixelTime to Date.now
  update(ref_db(db, 'logs'), {
    lastPlacedPixelTime: Date.now()
  }).catch((error) => {
    showError(error);
  });
}

export function incConnectionCount(username) {
  // increments connection count
  update(ref_db(db, 'stats/' + username), {
    connections: increment(1)
  }).catch((error => {
    showError(error);
  }));
}

export function getStats(callbackTiles, callbackStats) {
  const dbRef = ref_db(db);

  // get whole tiles table
  get(child(dbRef, "tiles/")).then((snapshot) => {
    if (snapshot.exists()) {
      callbackTiles(snapshot.val());
    } else {
      console.error("no data");
    }
  }).catch((error) => {
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
    showError(error);
  });
}

export function isSnapshotOld(uploadSnapshotCallback) {
  get(ref_db(db, "logs/")).then((snapshot) => {
    if (snapshot.exists()) {
      const values = snapshot.val();
      if (values.hasOwnProperty("lastUploadedSnapshotTime") && values.hasOwnProperty("lastPlacedPixelTime")) {
        // console.debug(Math.floor(difference / 3600000)); // hours
        // console.debug(Math.floor(difference / 60000)); // minutes
        // console.debug(Math.floor(difference / 1000)); // seconds

        const threshold = 3;

        const difference = Date.now() - values["lastUploadedSnapshotTime"]; // in ms
        if (Math.floor(difference / 3600000) >= threshold && values["lastPlacedPixelTime"] > values["lastUploadedSnapshotTime"]) {
          console.debug("try upload snapshot");
          uploadSnapshotCallback();
        } else {
          console.debug(`snapshot not needed : ${(difference / 3600000).toFixed(2)} < ${threshold}`);
        }
      }
    } else {
      console.error("no data");
    }
  }).catch((error) => {
    showError(error);
  })
}

export function uploadImage(image) {
  // https://firebase.google.com/docs/storage/web/upload-files
  const now = new Date();
  const fileName = `snapshots/snapshot_${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, "0")}-${now.getUTCDate().toString().padStart(2, "0")}_${now.getUTCHours().toString().padStart(2, "0")}-${now.getUTCMinutes().toString().padStart(2, "0")}-${now.getUTCSeconds().toString().padStart(2, "0")}.png`;
  const storageRef = ref_storage(storage, fileName);

  const metadata = {
    contentType: 'image/png',
  }

  uploadBytes(storageRef, image, metadata).then((snapshot) => {
    console.debug("snapshot uploaded successfully");
    // set logs/lastUploadedSnapshotTime to Date.now
    update(ref_db(db, 'logs'), {
      lastUploadedSnapshotTime: Date.now()
    }).catch((error) => {
      showError(error);
    });
  }).catch((error) => {
    showError(error);
  });
}

function showError(error, extra = "") {
  console.error(`${error} - ${extra}`);

  documentErrorConsole.innerHTML += error + "<br>";
  documentErrorConsole.style.display = "block";
}