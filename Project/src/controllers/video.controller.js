import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/ApiResponse.js"
import { Video } from "../models/video.model.js"
import { deleteFileFromCloudinary, fileUploadOnCloudinary } from "../utils/cloudinary.js";

// utility function to find owner and video document
async function findOwnerOfVideo(req) {

    // frontend will associate the video id with each individual video while rendering videos list and then pass it in url when updating thumbnail
    const { videoId } = req.params;

    if (!videoId) throw new ApiError(404, "Please provide a Video id ")

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
        ownerId: req.user._id,
        ownerchannelId: req.user.channelId,
        ownerChannelName: req.user.fullName,
        ownerAvatar: req.user.avatar
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


    const updatedVideo = await Video.findByIdAndUpdate(video._id,
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
        throw new ApiError(500, "Video Deletion failed! Try again later")
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

    if (publishStatus !== video.publishStatus) {

        if (videoOwner !== req.user?._id.toString()) {
            throw new ApiError(404, "Unauthorised to Change publish status of the video")
        }

        if (!publishStatus) {
            throw new ApiError(400, "Change the status before submitting")
        }

        const toggleStatus = await Video.findByIdAndUpdate(video._id,
            {
                $set: {
                    publishStatus: publishStatus.toLowerCase(),
                }
            },
            { new: true }
        ).select("title thumbnail videoFile publishStatus views ownerId")

        if (!toggleStatus) throw new ApiError(404, "Video with this Id not found")

        return res.status(200)
            .json(new ApiResponse(200, toggleStatus, "Publish Status changed successfully"))

    } else {
        return res.status(400)
            .json(new ApiResponse(400, {}, "No changes provided by user"))
    }
})

const getVideoById = asyncHandler(async (req, res) => {
    // take video id from request
    // find the video by id
    // then find the likes and dislikes for the video
    // finally return the response with all the required details
    const { videoId } = req.params

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(404, "Invalid Video Id provided")
    }

    const video = await Video.findByIdAndUpdate(videoId,
        {
            $inc: { views: 1 }
        },
        { new: true }
    )

    if (!video) throw new ApiError(404, "Video with this ID not found")

    return res.status(200)
        .json(new ApiResponse(200, video, "Video fetched successfully"));
})

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, sortBy = "createdAt", order = "desc" } = req.query;
    const {channelId} = req.params;

    if (!channelId) {
        throw new ApiError(404, "Invalid Query! Please pass a channelId");
    }

    const sortOrder = (order === "desc") ? -1 : 1;

    // Fetching videos with sorting and pagination
    const videos = await Video.find({ ownerId: channelId, publishStatus: "public" })
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .select("title thumbnail videoFile publishStatus views ownerId ownerChannelName createdAt");

    const totalVideos = await Video.countDocuments({ ownerId: channelId, publishStatus: "public" });

    return res.status(200)
        .json(new ApiResponse(200, { videos, totalVideos }, "Videos fetched successfully"));
});

const playVideo = asyncHandler(async (req, res) => {
    // take video id from request
    // make a aggregation pipeline by finding the video 
    // in the next step find the details of channel of owner of video
    // then find the likes and dislikes for the video
    // then find the comments that have same video id
    // finally return the response with all the required details

    const { videoId } = req.params

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(404, "Invalid Video Id provided")
    }

    // increasing video views count by 1
    await Video.updateOne({_id: videoId},
        {
            $inc: { views: 1 }
        },
        { new: true }
    )

    // refer to "src/reference/reference_for_playvideo_page.png" to know why we are collecting all this data
    const videoPage = await Video.aggregate([
        {
            $facet: {
                videoDetails: [
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId.createFromHexString(videoId),
                            publishStatus: "public",
                        }
                    },
                    {
                        $addFields: { videoId: "$_id" }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "ownerId",
                            foreignField: "_id",
                            as: "channelDetails",
                            pipeline: [
                                {
                                    $addFields: {
                                        channelName: "$fullName",
                                    }
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        channelId: 1,
                                        channelName: 1,
                                        avatar: 1,
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: "$channelDetails",
                    },
                    {
                        $lookup: {
                            from: "comments",
                            localField: "_id",
                            foreignField: "videoId",
                            as: "comments",
                            pipeline: [
                                {
                                    $sort: {
                                        createdAt: -1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            videoFile: 1,
                            views: 1,
                            likes: 1,
                            ownerId: 1,
                            channelDetails: 1,
                            comments: 1
                        }
                    },
                ],
                randomVideos: [
                    {
                        $match: {
                            // "publishStatus": "private",
                            _id: { $ne: mongoose.Types.ObjectId.createFromHexString(videoId) }
                        }
                    },
                    {
                        $sample: { size: 10 }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "ownerId",
                            foreignField: "_id",
                            as: "channelDetails",
                        }
                    },
                    {
                        $unwind: "$channelDetails",
                    },
                    {
                        $addFields: {
                            channelName: "$channelDetails.fullName",
                            channelAvatar: "$channelDetails.avatar"
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            videoFile: 1,
                            views: 1,
                            createdAt: 1,
                            channelName: 1,
                            channelAvatar: 1,
                            channelDetails: {
                                _id: 1,
                            }
                        }
                    },
                ]
            }
        },

    ])


    if (!videoPage[0].videoDetails.length) {
        throw new ApiError(404, "This video is private and cannot be played")
    }

    const result = {
        videoDetails: videoPage[0].videoDetails[0],
        randomVideos: videoPage[0].randomVideos,
    }

    return res.status(200)
        .json(new ApiResponse(200, result, "Video Page Data has been fetched"))
})

export {
    uploadVideo,
    updateVideoDetails,
    deleteVideo,
    togglePublishStatus,
    getVideoById,
    getAllVideos,
    playVideo,
}