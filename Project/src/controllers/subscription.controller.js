import { Subscription } from "../models/subscription.model";
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose from "mongoose";

const toggleSubscription = asyncHandler(async (req, res) => {
    // validate the request body
    const { channelId } = req.params;

    if (!channelId) throw new ApiError(400, "Please provide a channelId");

    if (!mongoose.Types.ObjectId.isValid(channelId)) throw new ApiError(400, "Invalid channelId provided");

    // check if user already subscribed to the channel
    const existingSubscription = await Subscription.findOne({ _id: channelId, subscriber: req.user?._id });

    if (existingSubscription) {
        // if user is already subscribed, remove the subscription
        await Subscription.findByIdAndDelete(existingSubscription._id);
        return res.status(200)
            .json(new ApiResponse(200, {}, "Subscription removed"));
    } else {
        // if user is not subscribed, create a new subscription
        const newSubscription = await Subscription.create({ subscriber: req.user?._id , channel: channelId });
        return res.status(201)
            .json(new ApiResponse(201, newSubscription, "Subscription added"));
    }
})

// const getAllSubscribedChannels = asyncHandler(async (req, res) => {
//     // get username and other sorting and pagination queries for displaying subscribed channels
//     // find all subscribed channels of the user
//     // return the response with the subscribed channels data
//     const { page = 1, limit = 20, sortBy = "-createdAt", order = "desc" } = req.query;
//     const { userId } = req.params;
    
//     if (!username) throw new ApiError(404, "Wrong Query! Please pass a username");
    
//     const sortOrder = (order === "desc" )? -1 : 1
    
//     // fetch videos with sorting and pagination
//     const subscribedToCount = await Subscription.countDocuments({subscriber: userId})

//     const subscribedChannels = await Subscription.find({ subscriber: userId })
//        .sort({ [sortBy]: sortOrder })
//        .skip((page - 1) * limit)
//        .limit(parseInt(limit))
//        .select("channel")
//        .populate("channel", "fullName avatar")
//        .exec()

//        return res.status(200)
//           .json(new ApiResponse(200, { subscribedChannels, subscribedToCount }, "Subscribed Channels fetched successfully"))
// })

export { 
    toggleSubscription
    // getAllSubscribedChannels
    }