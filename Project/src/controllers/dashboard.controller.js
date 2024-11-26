import { User, Video, Playlist, Like, Comment, Subscription } from "../models/index.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // validate the logged in user from middleware 
    // fetch data and return the channel stats

    const userId = req.user._id;

    const stats = await User.aggregate([
        {
            $match: { _id: userId }
        },
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "ownerId",
                as: "totalVideos"
            }
        },
        {
            $addFields: {
                totalVideos: { $size: "$totalVideos" }
            }
        },
        {
            $lookup: {
                from: "playlists",
                localField: "_id",
                foreignField: "ownerId",
                as: "totalPlaylists"
            }
        },
        {
            $addFields: {
                totalPlaylists: { $size: "$totalPlaylists" }
            }
        },
        // fetch the total likes on videos of owner
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "ownerId",
                as: "videos1",
                pipeline: [
                    {
                        $lookup: {
                            from: "likes",
                            localField: "_id",
                            foreignField: "video",
                            as: "likesOnVideo"
                        }
                    },
                    {
                        $addFields: {
                            likesCount: { $size: "$likesOnVideo" }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                totalLikes: { $sum: "$videos1.likesCount" }
            }
        },
        // fetching total comments on all videos
        {
            $lookup: {
                from: "videos",
                localField: "_id",
                foreignField: "ownerId",
                as: "videos2",
                pipeline: [
                    {
                        $lookup: {
                            from: "comments",
                            localField: "_id",
                            foreignField: "videoId",
                            as: "commentsOnVideo"
                        }
                    },
                    {
                        $addFields: {
                            commentsCount: { $size: "$commentsOnVideo" }
                        }
                    }
                ]
            },
        },
        {
            $addFields: {
                totalComments: { $sum: "$videos2.commentsCount" }
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "totalSubscribers"
            }
        },
        {
            $addFields: {
                totalSubscribers: { $size: "$totalSubscribers" }
            }
        },
        {
            $project: {
                _id: 1,
                totalVideos: 1,
                totalPlaylists: 1,
                totalLikes: 1,
                totalComments: 1,
                totalSubscribers: 1
            }
        }
    ])

    // in case any error occurs during processing
    if (Object.keys(stats).length === 0) {
        return res.status(404)
            .json(new ApiResponse(404, null, "No user found for the given ID"))
    }

    return res.status(200)
        .json(new ApiResponse(200, stats[0], "Channel Stats has loaded successfully"))
})

const getUserVideos = asyncHandler(async (req, res) => {
    // Get all the videos uploaded by the channel
    // Sort the videos based on their upload date
    // Pagination for videos
    // Return the videos in the requested format

    const userId = req.user._id
    const { page = 1, limit = 20, sortBy = "createdAt", order = "desc" } = req.query

    const sortOrder = (order === "desc") ? -1 : 1

    const videos = await Video.aggregate([
        { $match: { ownerId: userId } },
        // lookup from likes to get total likes
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $addFields: { likes: { $size: "$likes" } }
        },
        // lookup from comments to get total comments
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "videoId",
                as: "comments"
            }
        },
        {
            $addFields: { comments: { $size: "$comments" } }
        },
        { $sort: { [sortBy]: sortOrder } },
        { $skip: (parseInt(page) - 1) * parseInt(limit) },
        { $limit: parseInt(limit) }
    ])

    if (!videos.length) return res.status(200).json(new ApiResponse(200, [], "No videos found for this channel"))

    return res.status(200)
        .json(new ApiResponse(200, videos, "Videos fetched successfully"))
})

export {
    getChannelStats,
    getUserVideos,
};