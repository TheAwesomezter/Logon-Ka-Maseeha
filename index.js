// added
const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const { OAuth2Client } = require("google-auth-library");

require("firebase/auth");
require("firebase/firestore");
require("firebase/database");

let firebase = require("firebase/app");

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("./public/"));
app.use(express.static("./public/resources/"));
app.use(express.static("./public/resources/html"));
app.use(express.static("./public/resources/js"));
app.use(express.json({ limit: "1mb" }));
dotenv.config();

const port = process.env.PORT || 8181;
const client = new OAuth2Client(process.env.CLIENT_ID);

let firebaseConfig = {
  apiKey: process.env.apiKey,
  authDomain: process.env.authDomain,
  databaseURL: process.env.databaseURL,
  projectId: process.env.projectId,
  storageBucket: process.env.storageBucket,
  messagingSenderId: process.env.messagingSenderId,
  appId: process.env.appId,
  measurementId: process.env.measurementId
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

app.post("/googleSignIn", (req, res) => {
  console.log("called post!");
  let token = req.body["token"];
  let userName = req.body["username"];
  let email = req.body["userEmail"];
  //console.log(token);
  let data = {
    email: email
  };

  let returnObj = {
    status: "Success",
    code: "200",
    message: "Works"
  };

  let credential = firebase.auth.GoogleAuthProvider.credential(token);
  firebase
    .auth()
    .signInWithCredential(credential)
    .catch(function(error) {
      returnObj[status] = "Failure";
      returnObj[code] = error.code;
      returnObj[message] = error.message;
      console.log("Some sort of an error");
      res.send(returnObj);
    });
  //res.send(returnObj);
  let users = db.ref("users");
  users.once("value", function(snapshot) {
    if (!snapshot.child(userName).exists()) {
      console.log("User does not exist!");
      db.ref("users/" + userName).set(data);
      returnObj["userName"] = userName;
      returnObj["token"] = token;
      res.send(returnObj);
    } else {
      returnObj["userName"] = userName;
      returnObj["token"] = token;
      res.send(returnObj);
    }
  });
});

app.get("/:user/:token", (req, res) => {
  console.log("called get!");
  console.log("Username: " + req.params.user);
  //console.log("token: " + req.params.token);
  let userName = req.params.user;
  let token = req.params.token;
  //console.log(token);
  if (userName.includes(":")) {
    userName = userName.replace(":", "");
    console.log(userName);
  }
  let retObj = {
    status: "Success",
    userName: userName
  };

  if (token.includes(":")) {
    token = token.replace(":", "");
  }

  verify(token)
    .then(() => {
      let userData = db.ref("users/");
      userData.once("value", function(snapshot) {
        let userRef = snapshot.child(`/${userName}`).val();
        retObj["email"] = userRef.email;
        retObj["pass"] = userRef.password;
        res.send(retObj);
      });
    })
    .catch(error => {
      retObj.status = "Failure";
      retObj.code = error.code;
      retObj.message = error.message;
      console.log("Some sort of an error");
      console.log("error is: " + error);
      res.send(retObj);
    });
  // let credential = firebase.auth.GoogleAuthProvider.credential(token);
  // firebase
  //   .auth()
  //   .signInWithCredential(credential)
  //   .catch(function(error) {
  //     // returnObj[status] = "Failure";
  //     // returnObj[code] = error.code;
  //     // returnObj[message] = error.message;
  //     console.log("Some sort of an error");
  //     console.log("error is: " + error);
  //     //res.send(returnObj);
  //   });

  // let userData = db.ref("users/");
  // userData.once("value", function(snapshot) {
  //   let userRef = snapshot.child(`/${userName}`).val();
  //   retObj["email"] = userRef.email;
  //   retObj["pass"] = userRef.password;
  //   res.send(retObj);
  // });
});

app.post("/donateItem", (req, res) => {
  let retObj = {};
  let data = req.body;
  let userCoordinates = data.userCoordinates;

  console.log(data.userName);
  console.log(userCoordinates);

  let donatedItemsListRef = db.ref("Donated_Items_List").push();
  donatedItemsListRef.set({ data }, sp => {
    console.log("data set!");
    findOutDistance(userCoordinates.lat, userCoordinates.long);
  });
  let newItemRef = db.ref("users/" + data.userName + "/DonatedItemList").push();
  console.log(newItemRef.key); //Getting the auto generated id!
  newItemRef.set({ data }, someParameter => {
    console.log("sp1: ", someParameter);
    console.log("Works");
    retObj.status = "success";
    retObj.autoKey = newItemRef.key;
    res.send(retObj);
  });

  // let updates = {};
  // updates['/newData'] = data;
  // db.ref('users/' + data.userName).update(updates, (someParameter) => {
  //   console.log("sp: ", someParameter);
  // });
});

app.listen(port, () => {
  console.log(`Listening to ${port}`);
});

function setDonatedItems() {
  let users = db.ref("users/");
  users.once("value", async snapshot => {
    let usersRef = snapshot.val();
    let users = Object.keys(usersRef);
    console.log(users);
    for (user in users) {
      let donatedRef = await snapshot
        .child(users[user] + "/DonatedItemList")
        .val();
      for (donatedItems in donatedRef) {
        let donateRef = db
          .ref("Donated_Items_List/" + donatedItems)
          .set(donatedRef[donatedItems]);
      }
    }
  });
}
//setDonatedItems();

app.post("/request_fb_initialization", (req, res) => {
  let firebaseConfig = {
    apiKey: process.env.apiKey,
    authDomain: process.env.authDomain,
    databaseURL: process.env.databaseURL,
    storageBucket: process.env.storageBucket
  };
  let retObj = {
    status: "success",
    firebaseConfig: firebaseConfig
  };
  console.log("called fb_config!");
  res.send(retObj);
});

async function verify(token) {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.CLIENT_ID
  });

  const payload = ticket.getPayload();
  const userid = payload["sub"];
}

///////////////////////////////////////////////////////////////////////
// NGO Part?
function findOutDistance(lat, long) {
  // to be called everytime a user uploads something
  const NGOs = require("./NGOs.json");

  function sendMail(ngoName) {
    console.log("ngo is: " + ngoName);
    console.log("ngo email is: " + ngoName.email);
    const nodemailer = require("nodemailer");
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "logonkamaseeha@gmail.com",
        pass: process.env.gPass
      }
    });

    const mailOptions = {
      from: "logonkamaseeha@gmail.com",
      to: ngoName.email,
      subject: "New item uploaded near you!",
      text: `Hello, a new item has been uploaded near you! Please visit the listings page as soon as possible.`
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error(err);
      }
      console.log("E-Mail sent");
    });
  }

  function calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6731; //Earth's radius
    let dLat = deg2rad(lat2 - lat1);
    let dLon = deg2rad(lon2 - lon1);
    let a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let d = R * c;
    return d;
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  for (let ngo in NGOs) {
    let d = calcDistance(
      lat,
      long,
      NGOs[ngo]["latitude"],
      NGOs[ngo]["longitude"]
    );

    console.log("distance between is: " + d);

    if (d < 5.5) {
      sendMail(NGOs[ngo]);
    }
  }
}
