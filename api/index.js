console.log("Starting the server..."); // Initial log to confirm script execution

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
const secret = 'YOUR_SECRET';

//Middleware Configuration
//Configures middlewares for the Express app, including CORS, JSON parser,
//cookie parser, and static file server

app.use(cors({
  credentials: true,
  origin: 'IPV4 DNS'  // Use your actual frontend URL here
}));
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(__dirname + '/uploads'));

console.log("Connecting to MongoDB...");
//Database Connection
mongoose.connect('YOUR_MONGODB_URL')

//POST endpoint for user registration: takes username and password,
//hashes the password, creates new user in database, and returns user object
app.post('/register', async (req,res) => {
  const {username,password} = req.body;
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
app.post('/login', async (req,res) => {
  const {username,password} = req.body;
  const userDoc = await User.findOne({username});
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    // logged in
    jwt.sign({username,id:userDoc._id}, secret, {}, (err,token) => {
      if (err) throw err;
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
app.put('/post',uploadMiddleware.single('file'), async (req,res) => {
  let newPath = null;
  if (req.file) {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
  }

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {id,title,summary,content} = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }
    await postDoc.update({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });

});

//Endpoints for fetching posts
//First GET fetches list of posts, second GET fetches post by ID
app.post('/post', uploadMiddleware.single('file'), async (req,res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];  // Extract the token

  if (!token) {
    return res.status(401).json({ message: 'JWT token is missing' });
  }

  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    
    // Proceed with the rest of your logic
    const {title,summary,content} = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover:newPath,
      author:info.id,
    });
    res.json(postDoc);
  });
});


app.get('/post', async (req,res) => {
  res.json(
    await Post.find()
      .populate('author', ['username'])
      .sort({createdAt: -1})
      .limit(20)
  );
});

app.get('/post/:id', async (req, res) => {
  const {id} = req.params;
  const postDoc = await Post.findById(id).populate('author', ['username']);
  res.json(postDoc);
})

//Starts the server on port 4000, listening for incoming requests
app.listen(4000);
