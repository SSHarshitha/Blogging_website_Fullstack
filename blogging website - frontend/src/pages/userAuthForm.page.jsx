import { useContext, useRef } from 'react';
import AnimationWrapper from "../common/page-animation.jsx";
import InputBox from '../components/input.component'
import google from '../imgs/google.png';
import {Link, Navigate} from "react-router-dom";
import {Toaster, toast} from "react-hot-toast";
import axios from "axios";
import { storeInSession } from "../common/session";
import {UserContext} from "../App";
import { authWithGoogle } from "../common/firebase";


const UserAuthForm=({ type })=>{

    const authForm = useRef(null);  


    let { userAuth: { access_token}, setUserAuth} = useContext(UserContext)

    const userAuthThroughServer = (serverRoute, formData) => {

        const serverDomain = import.meta.env.VITE_SERVER_DOMAIN;
        if (!serverDomain) {
            console.error("VITE_SERVER_DOMAIN is not defined");
            return toast.error("Server domain is not defined. Please check your environment variables.");
        }
        console.log(`Sending request to: ${serverDomain + serverRoute}`);

        axios.post(serverDomain + serverRoute, formData)
        .then(({data}) =>{
            storeInSession("user", JSON.stringify(data))
            setUserAuth(data)
           
        })
        .catch(({response}) => {
            toast.error(response?.data?.error || "An error occurred while authenticating.");
        });

    };

    const handleSubmit = (e) => {

        e.preventDefault();

        if (!authForm.current || !(authForm.current instanceof HTMLFormElement)) {
            console.error("authForm.current is not an instance of HTMLFormElement or is null:", authForm.current);
            return toast.error("Form reference is not valid.");
        }

        let serverRoute = type == "sign-in" ? "/signin" : "/signup";
        console.log("Server Route:", serverRoute);  // Debugging statement
        console.log("Form Type:", type);

        let emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/; // regex for email
        let passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{6,20}$/; // regex for password 

        

        //formData
        let form = new FormData(authForm.current);
        let formData = {};

        for(let [key, value] of form.entries()) {
            formData[key] = value;
        }

        let {fullname, email, password } = formData;

        //form validation
        if(fullname){
            if(fullname.length < 3) {
                return toast.error("Fullname must be atleast 3 letters long")
            }
        }
        if(!email || !email.length){
            return toast.error("Enter email" )
           }
           if(!emailRegex.test(email)){
            return toast.error("Email is invalid" )
           }
           if(!passwordRegex.test(password)){
            return toast.error("Password should be 6 to 20 character long with a numeric ,1 lowercase and 1 uppercase letters")
           }

           userAuthThroughServer(serverRoute, formData)

    }
    const handleGoogleAuth =(e) => {
        e.preventDefault();
        authWithGoogle().then(user => {
            
            let serverRoute = "/google-auth";

            let formData = {
                 access_token: user.accessToken
            };

            userAuthThroughServer(serverRoute, formData);
        })
        .catch(err => {
             toast.error('trouble login through google');
             return console.log(err);
        });

    };

    return (
        access_token ?
        <Navigate to="/" />
        :
        <AnimationWrapper keyValue={type}>
        <section className="h-cover flex items-center justify-center">
            <Toaster />
        <form ref={authForm} className="w-[80%] max-w-[400px]" onSubmit={handleSubmit}>
            <h1 className="text-4xl font-gelasio capitalize text-center mb-24">
                {
                    type== "sign-in" ? "Welcome Back" :"Join us Today"
                }
            </h1>
                {
                    type != "sign-in" && (
                    <InputBox 
                        name="fullname"
                        type="text"
                        placeholder="FullName"
                        icon="fi-rr-user"
                    />
                    
                     )}

                <InputBox 
                        name="email"
                        type="email"
                        placeholder="Email"
                        icon="fi-rr-envelope"
                    />

                <InputBox 
                        name="password"
                        type="password"
                        placeholder="password"
                        icon="fi-rr-key"
                    />

                    <button
                    className="btn-dark center mt-14" 
                    type="submit"
                    onClick={handleSubmit}
                    >
                        {
                            type.replace("-", " ")
                        }
                    </button>

                    <div className="relative w-full flex items-center gap-2 my-10 opacity-10 uppercase text-black font-bold">
                        <hr className="w-1/2 border-black"/>
                        <p>or</p>
                        <hr className="w-1/2 border-black"/>
                    </div>

                    <button className="btn-dark flex items-center justify-center gap-4 w-[90%] center" 
                    onClick={handleGoogleAuth}
                    >
                        <img src={google} className='w-5 '/>
                        continue with google
                    </button>

                    {
                        type =="sign-in" ?
                        <p className='mt-6 text-dark-grey text-xl text-center'> 
                        Don't have an account ?
                            <Link to="/signup" className="underline text-black text-xl ml-1">
                                join us today
                            </Link>
                        </p>
                        :
                        <p className='mt-6 text-dark-grey text-xl text-center'> 
                        Already a member ?
                            <Link to="/signin" className="underline text-black text-xl ml-1">
                            Sign in here
                            </Link>
                        </p>
                    }
        </form>
    </section>
</AnimationWrapper>
    )
}
export default UserAuthForm;