import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import bcrypt from 'bcrypt';
import User from './Schema/User.js';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import admin from 'firebase-admin';
import serviceAccountKey from './react-js-blog-website-d77e5-firebase-adminsdk-fjers-c3aa403e5d.json' assert { type: 'json' };
import { getAuth } from 'firebase-admin/auth';
import crypto from 'crypto';
import path, { dirname } from 'path';
import multer from 'multer';
import { GridFsStorage } from 'multer-gridfs-storage';
import Grid from 'gridfs-stream';
import dns from 'dns';
import { fileURLToPath } from 'url';
import fs from 'fs';

dns.setServers(['8.8.8.8', '8.8.4.4']); // Google DNS

const __dirname = dirname(fileURLToPath(import.meta.url));

const server = express();
const PORT = 3000;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccountKey),
});

let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/;

server.use(express.json());
server.use(cors());

mongoose.connect(process.env.DB_LOCATION, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err.message);
});

const conn = mongoose.createConnection(process.env.DB_LOCATION, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

let gfs;
conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads');
});

const storage = new GridFsStorage({
  url: process.env.DB_LOCATION,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          bucketName: 'uploads',
        };
        resolve(fileInfo);
      });
    });
  },
});

const upload = multer({ storage });

const formatDatatoSend = (user) => {
  const access_token = jwt.sign({ id: user._id }, process.env.SECRET_ACCESS_KEY);

  return {
    access_token,
    profile_img: user.personal_info.profile_img,
    username: user.personal_info.username,
    fullname: user.personal_info.fullname,
  };
};

const generateUsername = async (email) => {
  let username = email.split('@')[0];

  let usernameExists = await User.exists({ 'personal_info.username': username }).then((result) => result);

  usernameExists ? (username += nanoid().substring(0, 5)) : '';

  return username;
};

server.put('/files/:filename', upload.single('file'), (req, res) => {
  res.status(200).json({ file: req.file });
});

server.get('/files/:filename', (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    if (err) {
      console.error('Error finding file:', err);
      return res.status(500).json({ err: 'Internal server error' });
    }

    if (!file || file.length === 0) {
      console.log('No file exists');
      return res.status(404).json({ err: 'No file exists' });
    }

    console.log(`Found file: ${file.filename} with content type: ${file.contentType}`);

    const readstream = gfs.createReadStream(file.filename);

    readstream.on('error', (streamErr) => {
      console.error('Stream error:', streamErr);
      res.status(500).json({ err: 'Stream error' });
    });

    readstream.pipe(res);
  });
});


server.get('/test-stream', (req, res) => {
  const filePath = path.join(__dirname, 'test-image.jpeg'); // Use a small test image file
  const readstream = fs.createReadStream(filePath);
  res.set('Content-Type', 'image/jpeg');

  readstream.on('open', () => {
    readstream.pipe(res);
  });

  readstream.on('error', (err) => {
    res.status(500).send(err);
  });
});

const generateUploadURL = async () => {
  const date = new Date();
  const imageName = `${nanoid()}-${date.getTime()}.jpeg`;

  return new Promise((resolve, reject) => {
    crypto.randomBytes(16, (err, buf) => {
      if (err) {
        return reject(err);
      }
      const filename = buf.toString('hex') + '.jpeg';
      const fileInfo = {
        filename: filename,
        bucketName: 'uploads',
      };
      resolve(`http://localhost:${PORT}/files/${filename}`);
    });
  });
};

server.get('/get-upload-url', (req, res) => {
  generateUploadURL()
    .then((url) => res.status(200).json({ uploadURL: url }))
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post('/signup', async (req, res) => {
  let { fullname, email, password } = req.body;

  if (fullname.length < 3) {
    return res.status(403).json({ error: 'Fullname must be at least 3 letters long' });
  }
  if (!email.length) {
    return res.status(403).json({ error: 'Enter the email' });
  }
  if (!emailRegex.test(email)) {
    return res.status(403).json({ error: 'Email is invalid' });
  }
  if (!passwordRegex.test(password)) {
    return res.status(403).json({ error: 'Password should be 6 to 20 characters long with a numeric, 1 lowercase and 1 uppercase letter' });
  }

  try {
    const hashed_password = await bcrypt.hash(password, 10);
    const username = await generateUsername(email);

    const newUser = new User({
      personal_info: {
        fullname,
        email,
        password: hashed_password,
        username,
        profile_img: 'https://api.dicebear.com/6.x/fun-emoji/svg?seed=Garfield',
      },
    });

    const savedUser = await newUser.save();
    const userData = formatDatatoSend(savedUser);

    return res.status(200).json(userData);
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

server.post('/signin', (req, res) => {
  let { email, password } = req.body;
  User.findOne({ 'personal_info.email': email })
    .then((user) => {
      if (!user) {
        return res.status(403).json({ error: 'Email not found' });
      }

      if (!user.google_auth) {
        bcrypt.compare(password, user.personal_info.password, (err, result) => {
          if (err) {
            return res.status(403).json({ error: 'Error occurred while login. Please try again' });
          }

          if (!result) {
            return res.status(403).json({ error: 'Incorrect password' });
          } else {
            const userData = formatDatatoSend(user);
            return res.status(200).json(userData);
          }
        });
      } else {
        return res.status(403).json({ error: 'Account was created using Google. Try logging in with Google.' });
      }
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.post('/google-auth', async (req, res) => {
  let { access_token } = req.body;
  getAuth()
    .verifyIdToken(access_token)
    .then(async (decodedUser) => {
      let user = await User.findOne({ 'personal_info.email': decodedUser.email });

      if (user) {
        if (user.google_auth) {
          const userData = formatDatatoSend(user);
          return res.status(200).json(userData);
        } else {
          return res.status(403).json({ error: 'Account was created using email and password. Try logging in with email and password.' });
        }
      }

      const newUser = new User({
        personal_info: {
          fullname: decodedUser.name,
          email: decodedUser.email,
          username: await generateUsername(decodedUser.email),
          profile_img: decodedUser.picture,
        },
        google_auth: true,
      });

      const savedUser = await newUser.save();
      const userData = formatDatatoSend(savedUser);

      return res.status(200).json(userData);
    })
    .catch((err) => {
      console.log(err.message);
      return res.status(500).json({ error: err.message });
    });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
