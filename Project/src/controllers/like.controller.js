import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/apiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import mongoose from "mongoose";

const toggleLikeOnVideo = asyncHandler(async (req, res) => {
    // validate the request body
    // verify the logged in user from verifyJWT middleware
    const { videoId } = req.params;

    if (videoId && !mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400, "Invalid videoId provided");

    // check if user already liked the video
    const existingLike = await Like.findOne({ video: videoId, likedBy: req.user._id });

    if (existingLike) {
        // if user is already liked, remove the like
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200)
            .json(new ApiResponse(200, {}, "Like removed from video"));
    } else {
        // if user is not already liked, create a new like
        await Like.create({ video: videoId, likedBy: req.user._id });
        return res.status(201)
            .json(new ApiResponse(201, {}, "Like added to video"));
    }
})

const toggleLikeOnComment = asyncHandler(async (req, res) => {
    // validate the request body
    // verify the logged in user from verifyJWT middleware
    const { commentId } = req.params;

    if (commentId && !mongoose.Types.ObjectId.isValid(commentId)) throw new ApiError(400, "Invalid commentId provided");

    // check if user already liked the comment
    const existingLike = await Like.findOne({ comment: commentId, likedBy: req.user._id });

    if (existingLike) {
        // if user has already liked, remove the like
        await Like.findByIdAndDelete(existingLike._id);
        return res.status(200)
            .json(new ApiResponse(200, {}, "Like removed from comment"));
    } else {
        // if user has not already liked, create a new like
        await Like.create({ comment: commentId, likedBy: req.user._id });
        return res.status(201)
            .json(new ApiResponse(201, {}, "Like added to comment"));
    }
})

export {
    toggleLikeOnVideo,
    toggleLikeOnComment, 
}