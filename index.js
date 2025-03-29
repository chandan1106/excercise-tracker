const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json()); // Allows parsing JSON data
app.use(express.urlencoded({ extended: true })); // Allows parsing form data
app.use(express.static('public'));

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.error("MongoDB Connection Error:", err));

// Define Mongoose Schemas
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    log: [{
        description: String,
        duration: Number,
        date: String
    }]
});

const User = mongoose.model("User", userSchema);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/views/index.html');
});

app.post('/api/users', async (req, res) => {
    try {
        const { username } = req.body;
        const newUser = new User({ username });
        await newUser.save();
        res.json({ username: newUser.username, _id: newUser._id });
    } catch (error) {
        res.status(500).json({ error: "Error creating user" });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username _id');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: "Error fetching users" });
    }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
    try {
        const { description, duration, date } = req.body;
        const user = await User.findById(req.params._id);
        if (!user) return res.status(404).json({ error: "User not found" });

        const exercise = {
            description,
            duration: parseInt(duration),
            date: date ? new Date(date).toDateString() : new Date().toDateString()
        };

        user.log.push(exercise);
        await user.save();

        res.json({
            _id: user._id,
            username: user.username,
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date
        });
    } catch (error) {
        res.status(500).json({ error: "Error adding exercise" });
    }
});

app.get('/api/users/:_id/logs', async (req, res) => {
    try {
        const user = await User.findById(req.params._id);
        if (!user) return res.status(404).json({ error: "User not found" });

        let { from, to, limit } = req.query;
        let log = user.log;

        if (from) log = log.filter(ex => new Date(ex.date) >= new Date(from));
        if (to) log = log.filter(ex => new Date(ex.date) <= new Date(to));
        if (limit) log = log.slice(0, parseInt(limit));

        res.json({
            _id: user._id,
            username: user.username,
            count: log.length,
            log: log.map(ex => ({
                description: ex.description,
                duration: ex.duration,
                date: ex.date
            }))
        });
    } catch (error) {
        res.status(500).json({ error: "Error fetching logs" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
