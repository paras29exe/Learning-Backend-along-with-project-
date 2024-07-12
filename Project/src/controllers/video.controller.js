import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { Video } from "../models/video.model.js"
import { deleteFileFromCloudinary, fileUploadOnCloudinary } from "../utils/cloudinary.js";

// utility function to find owner and video document
async function findOwnerOfVideo(req) {

    // frontend will associate the video id with each individual video while rendering videos list and then pass it in url when updating thumbnail
    const { videoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(404, "Invalid Video Id provided")
    }

    // finding video doc in db
    const video = await Video.findById(videoId)

    // extracting the owner of video doc and its owner id in string
    const videoOwner = video.ownerId.toString()

    return { video, videoOwner }
}

const uploadVideo = asyncHandler(async (req, res) => {
    // take all the fields from the request
    // save the video file and thumbnail file in temp folder then upload to cloudinary
    // save the details in the database as a Video model instance
    // return the response with the video data

    const { title, description } = req.body && req.body;

    let thumbnailLocalPath
    let videoLocalPath

    // checking whether the thumbnail was given or not
    if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
        thumbnailLocalPath = req.files.thumbnail[0].path
    }

    // checking whether the video file was given or not
    if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
        videoLocalPath = req.files.videoFile[0].path
    }


    if (!title && !description && !thumbnailLocalPath && !videoLocalPath) {
        throw new ApiError(400, "All fields must be given");
    }

    const thumbnail = await fileUploadOnCloudinary(thumbnailLocalPath)
    const videoFile = await fileUploadOnCloudinary(videoLocalPath)

    if (!thumbnail && !videoFile) {
        throw new ApiError(400, "Video Error :: File upload Failed")
    }

    const video = await Video.create({
        title: String(title).trim(),
        description: String(description).trim(),
        thumbnail,
        videoFile,
        ownerId: req.user,
        ownerName: req.user.username
    })

    const uploadedVideo = await Video.findById(video?._id)

    return res.status(200)
        .json(new ApiResponse(200, uploadedVideo, "Video uploaded successfully!"))
})

const updateVideoDetails = asyncHandler(async (req, res) => {
    // validate if he is owner or not who is making request
    // update the details in the database for the given new details
    // save the updated thumbnail in cloudinary (if given) and remove previously uploaded thumbnail
    // return the response with the updated video data

    // calling function to get video and its owner
    const { video, videoOwner } = await findOwnerOfVideo(req)

    if (videoOwner !== req.user?._id.toString()) {
        throw new ApiError(403, "Unauthorized to update this video")
    }

    // taking details if authorised
    const { title, description } = req.body && req.body;
    let thumbnailLocalPath = req.file?.path


    if (!title && !description && !thumbnailLocalPath) {
        throw new ApiError(400, "No changes provided by user");
    }

    let thumbnail;
    // if user gave thumbnail only then we will call the cloudinary upload
    if (thumbnailLocalPath) {
        thumbnail = await fileUploadOnCloudinary(thumbnailLocalPath)

        if (!thumbnail) {
            throw new ApiError(400, "Thumbnail update Error :: File upload Failed")
        }
    }


    const updatedVideo = await Video.findByIdAndUpdate(videoId,
        {
            $set: {
                title: title || video.title,
                description: description || video.description,
                thumbnail: thumbnail || video.thumbnail
            }
        },
        { new: true }
    )

    // deleting old thumbnail if new one is provided
    if (thumbnailLocalPath && thumbnail && thumbnail !== video.thumbnail) {
        await deleteFileFromCloudinary(video.thumbnail)
    }

    return res.status(200)
        .json(new ApiResponse(200, updatedVideo, "Video details updated successfully!"))

})

const deleteVideo = asyncHandler(async (req, res) => {
    // validate if he is owner or not who is making request
    // delete the video document from the database
    // remove the thumbnail and videofile from cloudinary
    // return the response with success message

    // calling function to get video and its owner
    const { video, videoOwner } = await findOwnerOfVideo(req)

    if (videoOwner !== req.user?._id.toString()) {
        throw new ApiError(404, "Unauthorised to delete the video")
    }

    // now the user is authenticated to delete the video
    const deleted = await Video.deleteOne(video._id, { secure: true })

    if (!deleted) {
        throw new ApiError(500, "Video Deletion failed")
    }

    // removing video and thumbnail from cloudinary
    try {
        await deleteFileFromCloudinary(video.videoFile)
        await deleteFileFromCloudinary(video.thumbnail)
    } catch (error) {
        throw new ApiError(500, "Files deleting on cloudinary failed")
    }

    return res.status(200)
        .json(new ApiResponse(200, { video: "video has been removed" }, "Video Deleted successfully"))
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { publishStatus } = req.body
    const { video, videoOwner } = await findOwnerOfVideo(req)

    if (videoOwner !== req.user?._id.toString()) {
        throw new ApiError(404, "Unauthorised to Change publish status of the video")
    }

    if (!publishStatus) {
        throw new ApiError(400, "Change the status before submitting")
    }

    const toggleStatus = await Video.findByIdAndUpdate(video._id,
        {
            $set: {
                publishStatus : publishStatus.toLowerCase(),
            }
        },
        { new: true }
    ).select("thumbnail videoFile publishStatus ownerId")

    return res.status(200)
        .json(new ApiResponse(200, toggleStatus, "Publish Status changed successfully"))

})

export {
    uploadVideo,
    updateVideoDetails,
    deleteVideo,
    togglePublishStatus
}