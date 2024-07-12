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

        throw new Error("Cloudinary Error:: File Uploading Error :: ", error.message);

    }

}

// Function to delete file from Cloudinary by public ID
const deleteFileFromCloudinary = async function (oldFileLink) {
    try {
        const publicId = oldFileLink.split("/").slice(-1)[0].replace(".webp", "");
        await cloudinary.uploader.destroy(publicId)
        
        console.log("File deleted successfully from Cloudinary");
        
    } catch (error) {
        throw new Error("Cloudinary Error:: File Deletion Error :: ", error.message);
    }
}


export { fileUploadOnCloudinary, deleteFileFromCloudinary }
