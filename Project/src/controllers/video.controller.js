import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import jwt from "jsonwebtoken"
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
    try {

        const { title, description } = req.body && req.body;

        let thumbnailLocalPath
        let videoLocalPath

        // checking whether the thumbnail was given or not
        if (req.files && Array.isArray(req.files.thumbnail) && req.files.thumbnail.length > 0) {
            thumbnailLocalPath = req.files.thumbnail[0].path
        } else {
            throw new ApiError(400, "Thumbnail is required field", "thumbnail")
        }

        // checking whether the video file was given or not
        if (req.files && Array.isArray(req.files.videoFile) && req.files.videoFile.length > 0) {
            videoLocalPath = req.files.videoFile[0].path
        } else {
            throw new ApiError(400, "Video file is required field", "videoFile")
        }


        if (!title && !description && !thumbnailLocalPath && !videoLocalPath) {
            throw new ApiError(400, "All fields must be Provided");
        }

        const thumbnail = await fileUploadOnCloudinary(thumbnailLocalPath)
        const videoFile = await fileUploadOnCloudinary(videoLocalPath)

        if (!thumbnail || !videoFile) {
            throw new ApiError(400, "Video Error :: File upload Failed" , "videoFile")
        }

        const formattedDuration = (seconds) => {

            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
        };

        const video = await Video.create({
            title: String(title).trim(),
            description: String(description).trim(),
            thumbnail: thumbnail.url,
            videoFile: videoFile.url,
            duration: formattedDuration(videoFile.duration),
            ownerId: req.user._id,
            ownerUsername: req.user.username,
            ownerChannelName: req.user.fullName,
            ownerAvatar: req.user.avatar
        })

        if(!video) console.log("Error creating video")

        const uploadedVideo = await Video.findById(video?._id)

        return res.status(200)
            .json(new ApiResponse(200, uploadedVideo, "Video uploaded successfully!"))

    } catch (error) {
        // Handle Multer file size error
        if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400)
                .json(new ApiResponse(400, null, "File size exceeds the allowed limit of 50MB.", videoFile));
        }

        // Handle other errors
        next(error); // Pass the error to the global error handler
    }
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
    const deletedLikes = await Like.deleteMany({video: video._id})

    const comments = await Comment.find({videoId: video._id})
    const commentIds = comments.map((comment) => comment._id)
    const deletedCommentLikes = await Like.deleteMany({ comment: { $in: commentIds } });

    const deletedComments = await Comment.deleteMany({videoId: video._id})    

    if (!deleted || !deletedLikes || !deletedCommentLikes || !deletedComments) {
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

const getChannelVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, sortBy = "createdAt", order = "desc" } = req.query;
    const { username } = req.params;

    if (!username) {
        throw new ApiError(404, "Invalid Query! Please pass a channelId");
    }

    const sortOrder = (order === "desc") ? -1 : 1;

    // Fetching videos with sorting and pagination
    const videos = await Video.find({ ownerUsername: username, publishStatus: "public" })
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .select("title thumbnail videoFile publishStatus views ownerId ownerChannelName createdAt");

    return res.status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"));
})

const getHomeAndSearchVideos = asyncHandler(async (req, res) => {
    // NOTE: First of all create a index in mongo db ATLAS for searching video based on query [ask to google or something]
    // validating if user is logged in or not

    const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if (accessToken) {
        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)

        if (decodedToken) {
            const user = await User.findById(decodedToken._id)
            req.user = user
        }
    }

    const { page = 1, limit = 30, sortBy = "createdAt", order = "asc", query } = req.query;

    const sortOrder = (order === "desc") ? -1 : 1;

    const pipeline = [];

    if (req.user) {
        // console.log(req.user);
        pipeline.push(
            {
                $match: {
                    ownerId: { $ne: req.user._id },
                    publishStatus: "public"
                }
            }
        )
    } else {
        pipeline.push(
            {
                $match: {
                    publishStatus: "public"
                }
            }
        )
    }

    if (query) {
        pipeline.push(
            {
                $search: {
                    index: "search-videos",
                    text: {
                        query: query,
                        path: ["title", "ownerChannelName"], // search in title and ownerUsername fields
                    }
                }
            }
        )
    }

    pipeline.push({
        $sample: { size: parseInt(limit) }
    })

    pipeline.push({
        $project: {
            title: 1,
            thumbnail: 1,
            publishStatus: 1,
            views: 1,
            duration: 1,
            ownerId: 1,
            ownerAvatar: 1,
            ownerChannelName: 1,
            ownerUsername: 1,
            createdAt: 1
        }
    });

    const options = {
        page: parseInt(page),
        limit: parseInt(limit),
    }

    // if (sortBy && sortOrder) {
    //     options.sort = { [sortBy]: sortOrder }
    // }

    const paginatedVideos = await Video.aggregatePaginate(pipeline, options)

    return res.status(200)
        .json(new ApiResponse(200, paginatedVideos, "Videos fetched successfully"));

})

const playVideo = asyncHandler(async (req, res) => {
    // take video id from request
    // make a aggregation pipeline by finding the video 
    // in the next step find the details of channel of owner of video
    // then find the likes 
    // then find the comments and likes on those commentthat have same video id
    // finally return the response with all the required details

    const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if (accessToken) {
        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)

        if (decodedToken) {
            const user = await User.findById(decodedToken._id)
            req.user = user
        }
    }

    const { videoId } = req.query

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(404, "Invalid Video Id provided")
    }

    const randomVideosQuery = {
        "publishStatus": "public",
        _id: { $ne: mongoose.Types.ObjectId.createFromHexString(videoId) }
    }

    if (req.user) {
        randomVideosQuery.ownerId = { $ne: req.user._id }
    }


    // refer to "src/reference/reference_for_playvideo_page.png" to know why we are collecting all this data
    const videoPage = await Video.aggregate([
        {
            $facet: {
                videoDetails: [
                    {
                        $match: {
                            _id: mongoose.Types.ObjectId.createFromHexString(videoId),
                            publishStatus: "public",
                            ownerId: { $ne: req?.user?._id }
                        }
                    },
                    {
                        $addFields: { videoId: "$_id" }
                    },
                    // looking how many documents in likes collection has video id of this as "video" field
                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "video",
                            as: "likes",
                        }
                    },
                    {
                        $addFields: {
                            likesCount: { $size: "$likes" }
                        }
                    },
                    // finding if any document has viewer Id as "likedBy" and also video Id as "video"
                    {
                        $lookup: {
                            from: "likes",
                            let: {
                                videoId: "$_id",
                                viewer: req.user?._id
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$video", "$$videoId"] },
                                                { $eq: ["$likedBy", "$$viewer"] }
                                            ]
                                        }
                                    }
                                },
                            ],
                            as: "likedOrNot"
                        }
                    },
                    {
                        $addFields: {
                            likedByViewer: {
                                $cond: [
                                    { $eq: [{ $size: "$likedOrNot" }, 1] },
                                    true,
                                    false,
                                ]
                            }
                        }
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
                                // finding his subscribers from subscriptions collection that how many documents has his id as channel
                                {
                                    $lookup: {
                                        from: "subscriptions",
                                        localField: "_id",
                                        foreignField: "channel",
                                        as: "subscribers",
                                    }
                                },
                                {
                                    $addFields: {
                                        subscribersCount: { $size: "$subscribers" },
                                    }
                                },
                                // findind that whether viewer has subscribed or not by finding document which has viewer id as "subscriber" and channel id as "channel"
                                {
                                    $lookup: {
                                        from: "subscriptions",
                                        let: {
                                            channelId: "$_id",
                                            viewer: req.user?._id
                                        },
                                        pipeline: [
                                            {
                                                $match: {
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$channel", "$$channelId"] },
                                                            { $eq: ["$subscriber", "$$viewer"] }
                                                        ]
                                                    }
                                                }
                                            },
                                        ],
                                        as: "subscribedOrNot"
                                    }
                                },
                                {
                                    $addFields: {
                                        subscribedByViewer: {
                                            $cond: [
                                                { $eq: [{ $size: "$subscribedOrNot" }, 1] },
                                                true,
                                                false
                                            ]
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        _id: 1,
                                        channelId: 1,
                                        channelName: 1,
                                        username: 1,
                                        avatar: 1,
                                        subscribersCount: 1,
                                        subscribedByViewer: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $unwind: "$channelDetails",
                    },
                    /* {
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
                                },
                                {
                                    $lookup: {
                                        from: "likes",
                                        localField: "_id",
                                        foreignField: "comment",
                                        as: "likesOnComment",
                                    }
                                },
                                {
                                    $addFields: {
                                        // overwriting existing "likesOnComment" documents array with their count
                                        likesOnComment: { $size: "$likesOnComment" }
                                    }
                                },
                                {
                                    $lookup: {
                                        from: "likes",
                                        let: {
                                            commentId: "$_id",
                                            viewer: req.user?._id
                                        },
                                        pipeline: [
                                            {
                                                $match: {
                                                    $expr: {
                                                        $and: [
                                                            { $eq: ["$comment", "$$commentId"] },
                                                            { $eq: ["$likedBy", "$$viewer"] }
                                                        ]
                                                    }
                                                }
                                            },
                                        ],
                                        as: "likedByViewer"
                                    }
                                },
                                {
                                    $addFields: {
                                        // overwriting the existing "likedByViewer" field with true or false if it has viewer document in it or not
                                        likedByViewer: {
                                            $cond: [
                                                { $eq: [{ $size: "$likedByViewer" }, 1] },
                                                true,
                                                false
                                            ]
                                        }
                                    }
                                },

                            ]
                        }
                    },*/
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            description: 1,
                            thumbnail: 1,
                            videoFile: 1,
                            views: 1,
                            likesCount: 1,
                            likedByViewer: 1, //
                            ownerId: 1,
                            channelDetails: 1,
                            // comments: 1,
                            createdAt: 1
                        }
                    },
                ],
                randomVideos: [
                    {
                        $match: randomVideosQuery
                    },
                    {
                        $sample: { size: 15 }
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
                            channelId: "$channelDetails._id",
                            channelName: "$channelDetails.fullName",
                            channelAvatar: "$channelDetails.avatar",
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            thumbnail: 1,
                            views: 1,
                            duration: 1,
                            createdAt: 1,
                            channelName: 1,
                            channelAvatar: 1,
                            channelId: 1,
                        }
                    },
                ]
            }
        },
        {
            $unwind: "$videoDetails"
        }
    ])

    if (!videoPage[0]) {
        throw new ApiError(404, "This video is private Or cannot be played")
    }
    // increasing video views count by 1
    await Video.updateOne({ _id: videoId },
        {
            $inc: { views: 1 }
        },
        { new: true }
    )

    // adding it to users watch History 
    await User.findByIdAndUpdate(req.user?._id,
        {
            $pull: {
                watchHistory: videoId 
            }
        },
        {
            $push: {
                watchHistory: videoId
            }
        },
        { new: true }
    )

    return res.status(200)
        .json(new ApiResponse(200, videoPage[0], "Video Page Data has been fetched"))

})

export {
    uploadVideo,
    updateVideoDetails,
    deleteVideo,
    togglePublishStatus,
    getChannelVideos,
    getHomeAndSearchVideos,
    playVideo,
}