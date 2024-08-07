console.log("Starting the server..."); // Initial log to confirm script execution

//Module Imports and Setup

const express = require('express');
const cors = require('cors');
const mongoose = require("mongoose");
const User = require('./models/User');
const Post = require('./models/Post');
const bcrypt = require('bcryptjs');
const app = express();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser'); 
const multer = require('multer');
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs');

const salt = bcrypt.genSaltSync(10);
const secret = '90210';

//Middleware Configuration
//Configures middlewares for the Express app, including CORS, JSON parser,
//cookie parser, and static file server

app.use(cors({credentials: true,origin:'http://localhost:3000'}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

// Add this route handler for the root URL
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

console.log("Connecting to MongoDB...");

//Database Connection
mongoose.connect('mongodb+srv://blog:z9RnZIyjoSf8TVRz@cluster0.81jzigh.mongodb.net/wellnessblog?retryWrites=true&w=majority')
  .then(() => {
    console.log('MongoDB connected');
    app.listen(4000, () => {
      console.log('Server is running on port 4000');
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

//POST endpoint for user registration: takes username and password,
//hashes the password, creates new user in database, and returns user object
app.post('/register', async(req, res) => {
    const {username, password} = req.body;
    try{
        const userDoc = await User.create({
            username, 
            password:bcrypt.hashSync(password,salt),
        });
        res.json(userDoc);
    } catch(e) {
        console.log(e);
        res.status(400).json(e);
    }

});

//POST endpoint for user login: checks username and password
//if correct generates JWT, sends it as a cookie to client
app.post('/login', async (req, res) => {
    const {username,password} = req.body;
    const userDoc = await User.findOne({username});
    const passOk = bcrypt.compareSync(password, userDoc.password);
    if (passOk) {
        //log in
        jwt.sign({username, id:userDoc._id}, secret, {}, (err,token) => {
            if(err) throw err;
            res.cookie('token', token).json({
                id:userDoc._id,
                username,
            });
        });
    } else {
        res.status(400).json('wrong credentials');
    }
});

//Defines GET endpoint to fetch profile info using JWT from cookies
app.get('/profile', (req,res) => {
    const {token} = req.cookies;
    jwt.verify(token, secret, {}, (err,info) => {
        if (err) throw err;
        res.json(info);
    });
});

//Provides POST endpoint for user logout 
//clears authentication token cookie
app.post('/logout', (req,res) => {
    res.cookie('token', '').json('ok');
});

//Sets up POST endpoint for creating posts with file uploads
//Processes and renames the file, verifies user's token, creates new post in the database
app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
    const {originalname, path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path+'.'+ext;
    fs.renameSync(path, newPath);

    const {token} = req.cookies;
    jwt.verify(token, secret, {}, async (err,info) => {
        if (err) throw err;
        const {title,summary,content} = req.body;
    const postDoc = await Post.create
    ({
        title,
        summary,
        content,
        cover:newPath,
        author:info.id,
    });
        res.json(postDoc);
    });
});

//Endpoints for fetching posts
//First GET fetches list of posts, second GET fetches post by ID
app.get('/post', async (req,res) => {
    res.json(await Post.find()
    .populate('author', ['username'])
    .sort({createdAt: -1})
    .limit(20));
})

app.get('/post/:id', async (req, res) => {
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author', ['username']);
    res.json(postDoc);
})

//Starts the server on port 4000, listening for incoming requests
app.listen(4000);

