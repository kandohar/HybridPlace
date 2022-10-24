import { initializeApp } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-app.js";
import { getDatabase, ref, get, set, child, onChildAdded, onChildChanged } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-database.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-analytics.js";

// <script src="https://www.gstatic.com/firebasejs/9.12.1/firebase-app.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.12.1/firebase-analytics.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.12.1/firebase-database.js"></script>

// <script src="https://www.gstatic.com/firebasejs/9.12.1/firebase-auth.js"></script>
// <script src="https://www.gstatic.com/firebasejs/ui/4.6.0/firebase-ui-auth.js"></script>
// <link type="text/css" rel="stylesheet" href="https://www.gstatic.com/firebasejs/ui/4.6.0/firebase-ui-auth.css" />


const firebaseConfig = {
  apiKey: "AIzaSyDPGa9tystBypSl31xxmH-S1aQVs-mAbds",
  authDomain: "hybridplace.firebaseapp.com",
  projectId: "hybridplace",
  storageBucket: "hybridplace.appspot.com",
  messagingSenderId: "853594879874",
  appId: "1:853594879874:web:45f154a729d4809d7f019b",
  measurementId: "G-TBK52M6G0R",
  databaseURL: "https://hybridplace-default-rtdb.europe-west1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
// const analytics = getAnalytics(app);

/*
let user
function signIn() {
  var provider = new firebase.auth.GithubAuthProvider();
  firebase.auth().signInWithPopup(provider).then(function (result) {
    // This gives you a GitHub Access Token. You can use it to access the GitHub API.
    var token = result.credential.accessToken;
    // The signed-in user info.
    user = result.user;
    // ...
  }).catch(function (error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    // The email of the user's account used.
    var email = error.email;
    // The firebase.auth.AuthCredential type that was used.
    var credential = error.credential;
    // ...
  });
}
*/

export function drawServerTiles(setTile) {
  // https://firebase.google.com/docs/database/web/read-and-write#web_value_events

  let tilesRef = ref(db, "tiles/");
  onChildAdded(tilesRef, (data) => {
    let tile = data.val();
    //console.debug("added " + JSON.stringify(tile));
    setTile(tile.x, tile.y, tile.color);
  });
  onChildChanged(tilesRef, (data) => {
    let tile = data.val();
    //console.debug("changed " + JSON.stringify(tile));
    setTile(tile.x, tile.y, tile.color);
  });
}

export function writeServerTile(x, y, color, username) {
  // https://firebase.google.com/docs/database/web/read-and-write#basic_write
  set(ref(db, 'tiles/' + 'tile_' + x + '_' + y), {
    x: x,
    y: y,
    color: color,
    username: username
  });
}

export function getStats(callback) {
  let dbRef = ref(db);
  return get(child(dbRef, "tiles/")).then((snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      console.error("no data");
    }
  }).catch((error) => {
    console.error(error);
  });
}