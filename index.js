const express = require('express')
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const app = express()
const cors = require('cors')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const userSchema = new mongoose.Schema({
  username: {type: String, required: true}
});
const User = mongoose.model('User', userSchema);

const exerciceSchema = new mongoose.Schema({
  username: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: Date,
});
const Exercise = mongoose.model('Exercise', exerciceSchema);

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', (req, res) => {
  const username = req.body.username;
  User.findOne({username: username}, function(err, existingUser) {
    if (err) {
      console.log(err);
    } else if (existingUser) {
      res.json({username: existingUser.username, _id: existingUser._id});
    } else {
      const newUser = new User({username: username});
      newUser.save(function(err2, savedUser) {
        if (err2) {
          console.log(err2)
        } else {
          res.json({username: savedUser.username, _id: savedUser._id});
        }
      });
    }
  });
});

app.get('/api/users', (req, res) => {
  User.find({}, function(err, users) {
    if (err) {
      // console.log(err);
      res.json({error: 'Something went wrong'});
    } else {
      res.json(users.map(user => ({username: user.username, _id: user._id})));
    }
  });
});

app.post('/api/users/:userId/exercises', (req, res) => {
  User.findById(req.params.userId, function(err, existingUser) {
    if (err) {
      //console.log(err);
      res.json({error: 'Invalid user'});
    } else {
      const parsedDate = Date.parse(req.body.date);
      const newExercise = new Exercise({
        username: existingUser.username,
        description: req.body.description,
        duration: req.body.duration,
        date: !isNaN(parsedDate) ? new Date(parsedDate) : new Date(),
      })
      newExercise.save(function(err2, savedExercise) {
        if (err2) {
          //console.log(err2);
          res.json({error: 'Exercise failed'});
        } else {
          res.json({
            username: existingUser.username,
            description: savedExercise.description,
            duration: savedExercise.duration,
            date: new Date(savedExercise.date).toDateString(),
            _id: existingUser._id
          });
        }
      });
    }
  });
});

app.get('/api/users/:userId/logs', (req, res) => {
  User.findById(req.params.userId, function(err, existingUser) {
    if (err) {
      res.json({error: 'Invalid user'});
    } else {
      let query = {username: existingUser.username};
      if (req.query.from) query.date = {...query.date, $gte: new Date(req.query.from)};
      if (req.query.to) query.date = {...query.date, $lte: new Date(req.query.to)};
      
      Exercise.find(query, function(err2, existingExercises) {
        if (err2) {
          res.json({error: 'Something went wrong'});
        } else {
          res.json({
            username: existingUser.username,
            count: existingExercises.length,
            _id: existingUser._id,
            log: existingExercises.map(exercise => ({
              description: exercise.description,
              duration: exercise.duration,
              date: new Date(exercise.date).toDateString(),
            }))
          });
        }
      }).limit(Number(req.query.limit) || 0);
    }
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
