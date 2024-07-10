import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Initialize Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload file to Cloudinary and return the URL of the uploaded file. 
const fileUploadOnCloudinary = async (localFilePath) => {
    
    try {
        const result = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" });
        fs.unlinkSync(localFilePath); // remove temporary file after upload to cloudinary completes
        
        return result.url;

    } catch (error) {
        fs.unlinkSync(localFilePath) // remove temporary file as upload fails

        if (error instanceof cloudinary.Error) {
            console.error("Cloudinary Error: ", error.message);
        } else {
            console.error("File Uploading Error: ", error.message);
        }

        return null; 
    }

}

export { fileUploadOnCloudinary }
