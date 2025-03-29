require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Define Mongoose Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Serve Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// API: Create New User
app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (error) {
    res.json({ error: 'Error creating user' });
  }
});

// API: Get All Users
app.get('/api/users', async (req, res) => {
  const users = await User.find({}, '_id username');
  res.json(users);
});

// API: Add Exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;
    const user = await User.findById(_id);
    
    if (!user) return res.json({ error: "User not found" });

    const exercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    await exercise.save();

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id
    });
  } catch (error) {
    res.json({ error: 'Error adding exercise' });
  }
});

// API: Get User Logs
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) return res.json({ error: "User not found" });

    let filter = { userId: _id };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    let exercises = await Exercise.find(filter).limit(parseInt(limit) || 100);
    
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString()
      }))
    });
  } catch (error) {
    res.json({ error: 'Error fetching logs' });
  }
});

// Start Server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Listening on port ' + listener.address().port);
});
