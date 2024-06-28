import axios from 'axios';

export const uploadImage = async (img) => {
  try {
    const response = await axios.get(`${import.meta.env.VITE_SERVER_DOMAIN}/get-upload-url`);
    const uploadURL = response.data.uploadURL;

    console.log("Upload URL:", uploadURL);

    if (!uploadURL) {
      throw new Error("Received invalid upload URL");
    }

    await axios.put(uploadURL, img, {
      headers: { 'Content-Type': img.type }
    });

    const imgUrl = uploadURL.split("?")[0];
    return imgUrl;
  } catch (error) {
    console.error("Error uploading image:", error);
    throw new Error("Failed to upload image");
  }
};
