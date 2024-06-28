//importing tools

import Embed from "@editorjs/embed";
import List from "@editorjs/list";
import Image from "@editorjs/image";
import Header from "@editorjs/header";
import Quote from "@editorjs/quote";
import Marker from "@editorjs/marker";
import InlineCode from "@editorjs/inline-code";
import { uploadImage } from "../common/aws";


const uploadImageByFile=(e)=>{
      return uploadImage(e).then(url=>{
        if(url){
          return {
            success: 1,
            file: {url}
          }
        }
      }) 
}


const uploadImageByUrl = (url) => {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const timeoutDuration = 10000; // 10 seconds timeout

  return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
          reject(new Error('Request timed out'));
      }, timeoutDuration);

      fetch(proxyUrl)
          .then(response => {
              clearTimeout(timeout); // Clear timeout since request succeeded
              if (!response.ok) {
                  throw new Error('Network response was not ok');
              }
              return response.json(); // assuming JSON response
          })
          .then(data => {
              // Extract the image URL from the response data
              const imageUrl = data.contents; // adjust this based on the response structure

              // Handle the image URL as needed
              resolve({
                  success: 1,
                  file: { url: imageUrl }
              });
          })
          .catch(error => {
              clearTimeout(timeout); // Clear timeout in case of error
              reject({
                  success: 0,
                  message: error.message
              });
          });
  });
}

// const uploadImageByUrl=(e)=>{
//     let link = new Promise((resolve,reject)=>{
//         try{
//             resolve(e)
//         }
//         catch(err){
//             reject(err)
//         }
//     })
//     return link.then(url=>{
//         return{
//             success:1,
//             file:{ url }
//         }
//     })
// }

export const tools={
    embed: Embed,
    list:{
        class: List,
        inlineToolbar: true
    },
    image: {
        class:Image,
        config:{
            uploader:{
                uploadByUrl:uploadImageByUrl ,
                uploadByFile: uploadImageByFile
            }
        },
    },
    header:{
        class: Header,
        config:{
            placeholder: "Type Heading....",
            levels:[2,3],
            defaultLevel: 2
        }
    },
    quote: {
        class:Quote,
        inlineToolbar: true
    },
    marker: Marker,
    inlineCode: InlineCode
}
