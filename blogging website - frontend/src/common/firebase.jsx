// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup } from 'firebase/auth'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCZvBbrFkae-bKCh5hHwHyex3Fp9Czq880",
  authDomain: "react-js-blog-website-d77e5.firebaseapp.com",
  projectId: "react-js-blog-website-d77e5",
  storageBucket: "react-js-blog-website-d77e5.appspot.com",
  messagingSenderId: "616736434809",
  appId: "1:616736434809:web:5312d62e13b7a35071c2a8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

//google auth

const provider = new GoogleAuthProvider();
const auth = getAuth();

export const authWithGoogle = async () => { 
    let user = null;
    await signInWithPopup(auth, provider)
    .then((result) => {
        user = result.user
    })
    .catch((err) => {
        console.log(err)
    })

    return user;
}

export default authWithGoogle;