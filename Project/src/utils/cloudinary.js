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
        if (!localFilePath) {
            throw new Error("Local file not found.");
        }
        const result = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" });
        console.log(result);
        return result.url;
    } catch (error) {
        fs.unlinkSync(localFilePath) // remove temporary file as upload fails
        console.error("Cloudinary Error: File upload failed: Error", error);

    }
}

export {fileUploadOnCloudinary}
