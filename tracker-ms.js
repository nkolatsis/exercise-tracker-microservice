const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const app = express();
const mongoose = require("mongoose");
mongoose.connect(process.env.MONGO_URI)
mongoose.connection.on('error', (e) => console.error('MongoDB error: %s', e));
const Schema = mongoose.Schema;
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({extended: false});

const userSchema = new Schema({
  userId: {
    type: String,
    required: true,
    unique: false
  }
});

const exerciseSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date
  }
});

const userDB = mongoose.model('username', userSchema);
const exerciseDB = mongoose.model('exercise', exerciseSchema);

app.post("/api/exercise/new-user", urlencodedParser, async (req, res) => {
  // PMT: curl --data "userId=nkltss" http://localhost:5000/api/exercise/new-user
  let newUser = req.body.userId;
  await userDB.findOne({userId: newUser}, (err, data) => {
    if (err) console.error(err);
    if (!data) {
      let user = new userDB({userId: newUser});
      user.save((err, data) => {
        if (err) console.error(err);
        return res.json({userId: data.userId});
      });
    } else {
      return res.send("Username already taken.");
    };
  });
});

app.post("/api/exercise/add", (req, res) => {
  // PMT: curl --data "userId=nkltss&description=Walking&duration=180&date=2018-06-22"

});

app.get("/api/exercise/log", (req, res) => {
  // PMT: curl http://localhost:5000/api/exercise/log?userId=nkltss&from=2018-01-01&to=2018-12-31&limit=50

});

app.listen(5000, () => console.log("Microservice running on port 5000"));

module.exports = app;