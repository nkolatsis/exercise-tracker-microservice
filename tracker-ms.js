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
  username: {
    type: String,
    required: true,
    unique: false
  },
  _id: {
    type: String,
    required: true
  }
});

const exerciseSchema = new Schema({
  username: {
    type: String,
    required: true
  },
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

function getUniqueSlug(len) {
  const whitelist = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split("");
  let unique = false;
  while (unique == false) {
    let slug = [];
    [...Array(len)].forEach((x) => {
      slug.push(whitelist[Math.floor(Math.random() * whitelist.length)]);
    });
    // TODO/TOLEARN: make an async/await database call that halts the loop, checks
    // for uniqueness and continues the loop if not unique
    unique = true;
    return slug.join("");
  };
};

function isValidDate(date) {
  // date = yyyy-mm?-dd? returns true or false
  date = new Date(date);
  console.log(date);
  if (!date instanceof Date) return false;
  let now = new Date();
  if (now.valueOf() < date.valueOf()) return false;
  if (date.getFullYear() < 2010) return false;
  return true;
};

function getUsernameById(userId) {
  return new Promise(async (resolve, reject) => {
    try {
      await userDB.findOne({_id: userId}).exec().then((data) => {
        if (data) resolve({ exists: true, username: data.username });
        else resolve({ exists: false });
      });
    } catch(err) {
      console.error(err);
      reject(err);
    }
  });
};

app.get("/", (req, res) => res.sendFile(__dirname+"/views/form.html"));

app.post("/api/exercise/new-user", urlencodedParser, async (req, res) => {
  // PMT: curl --data "username=nkltss" http://localhost:5000/api/exercise/new-user
  let username = req.body.username;
  await userDB.findOne({username}, (err, data) => {
    if (err) console.error(err);
    if (!data) {
      let user = new userDB({_id: getUniqueSlug(10), username});
      user.save((err, data) => {
        if (err) console.error(err);
        return res.json({username: data.username, _id: data._id});
      });
    } else {
      return res.send("Username already taken.");
    };
  });
});

app.post("/api/exercise/add", urlencodedParser, async (req, res) => {
  // PMT: curl --data "userId=bMbff8xr7W&description=Walking&duration=180&date=2018-06-22" http://localhost:5000/api/exercise/add
  let [userId, description, duration, date] = [req.body.userId,
    req.body.description, req.body.duration, req.body.date];
    
  if (description.length < 3) return res.send("Description too short.")
  if (Number(duration) == NaN || duration.length == 0) return res.send("Duration must be a number.");
  if (isValidDate(date)) date = new Date(date);
  else res.send("invalid date");
  let user = await getUsernameById(userId);
  console.log(user);
  if (user.exists) {
    let username = user.username;
    let exercise = new exerciseDB({username, userId, description, duration, date});
    exercise.save((err, data) => {
      if (err) console.error(err);
      return res.json({username, description, duration, _id: userId, date})
    });
  } else {
    return res.send("unknown _id");
  }
});

app.get("/api/exercise/log", async (req, res) => {
  // PMT: curl http://localhost:5000/api/exercise/log?userId=bMbff8xr7W&from=2018-01-01&to=2018-12-31&limit=50
  let [userId, from, to, limit] = [req.query.userId, req.query.from, req.query.to, req.query.limit];
  console.log("from:"+from, "to:"+to);
  
  limit = Number(limit);
  if (limit == NaN) limit = 10;
  from = new Date(from);
  to = new Date(to);
  
  let user = await getUsernameById(userId);
  if (user.exists) {
    let query = exerciseDB.find({userId});
    if (from instanceof Date) query = query.where({ date: { $gte: from.valueOf() }});
    if (to instanceof Date) query = query.where({date: {$lte: to.valueOf()}});
    query.limit(limit).exec((err, data) => {
      if (err) console.error(err);
      let response = {_id: userId, username: user.username, from, to, limit: data.length, log: []};
      for (let exercise of data) {
        response.log.push({description: exercise.description, duration: exercise.duration, date: exercise.date});
      };
      res.json(response);
    });
  } else {
    res.send("invalid userId");
  }
});

app.listen(5000, () => console.log("Microservice running on port 5000"));

module.exports = app;