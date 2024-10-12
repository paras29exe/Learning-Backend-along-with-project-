import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
    // validate the request body

    const { channelId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(channelId)) throw new ApiError(400, "Invalid channelId provided");

    // check if user already subscribed to the channel
    const existingSubscription = await Subscription.findOne({ channel: channelId, subscriber: req.user._id });

    if (existingSubscription) {
        // if user is already subscribed, remove the subscription
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res.status(200)
            .json(new ApiResponse(200, {}, "Subscription removed"));
    } else {
        // if user is not subscribed, create a new subscription
        const newSubscription = await Subscription.create({ subscriber: req.user?._id, channel: channelId });
        return res.status(201)
            .json(new ApiResponse(201, newSubscription, "Subscription added"));
    }
})

const subscribedChannels = asyncHandler(async (req, res) => {
    // get userId and other sorting and pagination queries for displaying subscribed channels
    // only logged user can access his subscribers list
    // find all subscribed channels of the user
    // return the response with the subscribed channels data
    const { page = 1, limit = 20 } = req.query
    const userId = req.user._id;

    // mongoose check valid id
    if (!mongoose.Types.ObjectId.isValid(userId)) throw new ApiError(400, "Invalid userId provided");

    // fetch videos with sorting and pagination
    const totalSubscribedChannels = await Subscription.countDocuments({ subscriber: userId })

    const subscribedTo = await Subscription.aggregate([
        {
            $match: { subscriber: userId }
        },
        {
            $lookup: {
                // find the channel details in users collection that is subscribed by user
                from: "users",
                localField: "channel",
                foreignField: "_id",
                pipeline: [
                    {
                        $lookup: {
                            // find subscribers of each subscribed channel
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel", // subscriptions collection ke jitne "channel" field mai uski id hai utne use subscriber😂😂
                            as: "subscribedTo",
                        }
                    },
                    {
                        $addFields: {
                            channelName: "$fullName",
                            subscribers: { $size: "$subscribedTo" },
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            channelName: 1,
                            avatar: 1,
                            subscribers: 1,
                            createdAt: 1
                        }
                    }
                ],
                as: "subscribedChannels"
            }
        },
        // // unwinding the array will return documents individually 
        { $unwind: "$subscribedChannels" },
        // now we are replacing the root object in the main data array with these individual objects recieved from unwinding
        {
            $replaceRoot: { newRoot: "$subscribedChannels" }
        },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) }
    ])

    return res.status(200)
        .json(new ApiResponse(200, { totalSubscribedChannels, subscribedTo }, "Subscribed Channels fetched successfully"))
})

const subscribersList = asyncHandler(async (req, res) => {
    // get userId from middleware because only logged in user can see his subscribers list
    // find all subscribers of the channel
    // return the response with the subscribers data
    const { page = 1, limit = 20 } = req.query
    const userId = req.user._id;

    const subscribersList = await Subscription.aggregate([
        {
            $match: { channel: userId }
        },
        {
            $lookup: {
                // find the subscriber details in users collection for each matched document
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                pipeline: [
                    {
                        // find subscribers of each subscriber 
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel", // subscriptions collection ke jitne "channel" field mai uski id hai utne use subscriber😂😂
                            as: "subscribers",
                        }
                    },
                    {
                        $addFields: {
                            channelName: "$fullName",
                            subscribers: { $size: "$subscribers" }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            channelName: 1,
                            avatar: 1,
                            createdAt: 1,
                            totalSubscribers: "$subscribers",
                        }
                    }
                ],
                as: "subscribers"
            },
        },
        // // unwinding the array will return documents individually
        { $unwind: "$subscribers" },
        // now we are replacing the root object in the main data array with these individual objects recieved from unwinding
        {
            $replaceRoot: { newRoot: "$subscribers" }
        },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) }
    ])

    return res.status(200)
        .json(new ApiResponse(200, subscribersList, "Subscribers fetched successfully"))
})

const subscribedChannelVideos = asyncHandler(async (req, res) => {
    // get userId and other sorting and pagination queries for displaying subscribed videos
    // only logged user can access his subscribers list
    // find all subscribed videos of the user
    // return the response with the subscribed videos data
    const { page = 1, limit = 30 } = req.query
    const userId = req.user._id;

    const videos = await Subscription.aggregate([
        {
            $match: { subscriber: userId }
        },
        {
            $lookup: {
                from: "videos",
                localField: "subscriber",
                foreignField: "ownerId",
                as: "subscribedVideos",
                pipeline: [
                    {
                        $match: { publishStatus: "public" }
                    },
                    {
                        $project: {
                            title: 1,
                            thumbnail: 1,
                            publishStatus: 1,
                            views: 1,
                            ownerId: 1,
                            ownerChannelName: 1,
                            createdAt: 1
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$subscribedVideos"
        },
        {
            $replaceRoot: { newRoot: "$subscribedVideos" }
        },
        { $sort: { createdAt: -1 } },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) }
    ])

return res.status(200)
    .json(new ApiResponse(200, videos, "Subscribed videos fetched successfully"))
})

export {
    toggleSubscription,
    subscribedChannels,
    subscribersList,
    subscribedChannelVideos
}