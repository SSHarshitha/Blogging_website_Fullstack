import express from 'express';
import mongoose from 'mongoose';
import 'dotenv/config'
import bcrypt from 'bcrypt'; 
import User from './Schema/User.js';
import { nanoid } from 'nanoid';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import admin from "firebase-admin";
import serviceAccountKey from "./react-js-blog-website-d77e5-firebase-adminsdk-fjers-c3aa403e5d.json" assert { type: "json" }
import {getAuth} from "firebase-admin/auth"

 const server = express();
 let PORT = 3000;


 admin.initializeApp({
    credential: admin.credential.cert(serviceAccountKey)

 });

 let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
 let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password
 
 server.use(express.json());
 server.use(cors())

 mongoose.connect(process.env.DB_LOCATION, {autoIndex: true})

 const formatDatatoSend = (user) => {

    const access_token = jwt.sign({ id: user._id}, process.env.SECRET_ACCESS_KEY);

    return {
        access_token,
        profile_img: user.personal_info.profile_img,
        username: user.personal_info.username,
        fullname: user.personal_info.fullname

    };

 };
 const generateUsername = async (email) => {

    let username =email.split("@")[0];

    let usernameExists = await User.exists({"personal_info.username": username }).then((result) => result)

    usernameExists ? username += nanoid().substring(0, 5) : "";

    return username;
 };

 server.post("/signup", async (req, res) => {
    
    let { fullname, email, password } = req.body;

    //validating data from frontend
    if(fullname.length < 3) {
        return res.status(403).json({"error": "Fullname must be atleast 3 letters long" })
    }
    if(!email.length){
        return res.status(403).json({"error":"Enter the email"})
       }
       if(!emailRegex.test(email)){
        return res.status(403).json({"error":"Email is invalid"})
       }
       if(!passwordRegex.test(password)){
        return res.status(403).json({"error":"Password should be 6 to 20 character long with a numeric ,1 lowercase and 1 uppercase letters"})
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
                profile_img: 'https://api.dicebear.com/6.x/fun-emoji/svg?seed=Garfield'
            }
        });

        const savedUser = await newUser.save();
        const userData = formatDatatoSend(savedUser);

        return res.status(200).json(userData);
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ "error": "Internal Server Error" });
    }
});


 server.post("/signin", (req, res) => {
    let {email, password} = req.body;
    User.findOne({"personal_info.email": email})
    .then((user) => {
        if(!user){
            return res.status(403).json({"error": "Email not found"});
        }

        if(!user.google_auth){

            bcrypt.compare(password, user.personal_info.password, (err, result) => {

                if(err) {
                    return res.status(403).json({"error": "Error occured while login Please try again"})
                }
            
                if(!result){
                    return res.status(403).json({"error": "Incorrect password"})
             
                } else {
                    const userData = formatDatatoSend(user);
                    return res.status(200).json(userData);
                    }
            
            });
                   

        } else {
            return res.status(403).json({"error": "Account was created using google. Try logging in with google."})
        }


        
    })
    .catch(err =>{
        console.log(err.message);
        return res.status(500).json({"error": err.message})
    });
 });


 server.post("/google-auth", async (req, res) => {
    let {access_token} = req.body;
    getAuth()
    .verifyIdToken(access_token)
    .then(async (decodedUser) => {

        let {email, name, picture } = decodedUser;

        picture = picture.replace("s96-c", "s384-c");

        let user = await User.findOne({"personal_info.email": email}).select("personal_info.fullname personal_info.username personal_info.profile_img google_auth").then((u) =>{
            return u || null
        })
        .catch(err => {
            return res.status(500).json({"error": err.message})
        })

        if(user) {
            if(!user.google_auth) {
                return res.status(403).json({"error": "This email was signed up without google. Please Login with password to access the account"})
            }
        }
        else {
            let username = await generateUsername(email);

            user = new User({
                personal_info: {fullname: name, email, profile_img: picture, username},
                google_auth: true
            })
            await user.save().then((u)=> {
                user=u;
            })
            .catch(err => {
                return res.status(500).json({"error": err.message})
            })
        }
        return res.status(200).json(formatDatatoSend(user))

    })
    .catch(err => {
        return res.status(500).json({"error": "Failed to authenticate you with google. Try with some other google account"})
    })
 })
 server.listen(PORT, () => {
    console.log('listening on port  ->' + PORT);
 })

