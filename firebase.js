import { initializeApp } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-analytics.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.12.1/firebase-database.js";

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
const analytics = getAnalytics(app);
const db = getDatabase(app);

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

function writeTile(x, y, color) {
  db.ref('/tiles/' + 'tile_' + x + '_' + y).set({
    x: x,
    y: y,
    color: color,
    user: user.displayName
  });
}

function initDB() {
  return db.ref('/tiles/').once('value').then(function (snapshot) {
    tiles = snapshot.val()
    // console.log(snapshot.val())
    for (index in tiles) {
      tile = tiles[index]
      addTile(tile.x, tile.y, tile.color)
    }
  }).then(_ => {
    console.log('finished loading')
    document.getElementById("loader").style.display = 'none'
    document.getElementById("loaded").style.display = 'inline'
    draw()

    db.ref().child('/tiles/').on('child_changed', function (data) {
      console.log('child_changed ', data.val())
      let tile = data.val()
      addTile(tile.x, tile.y, tile.color)
      draw()
    });
  });
}

initDB()