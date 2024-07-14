import { User } from "../models/user.model.js"
import { Video } from "../models/video.model.js"
import { Comment } from "../models/comment.model.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import mongoose from "mongoose"
import { json } from "express"

// utility function to find owner and video document
async function findOwnerOfComment(req) {

    // frontend will associate the video id and comment id with each individual video while rendering videos and then pass it in url
    const { videoId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(404, "Invalid Video Id provided")
    }

    const { commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(404, "Invalid comment Id provided")
    }

    // finding video doc in db
    const comment = await Comment.findById(commentId)

    // extracting the owner of video doc and its owner id in string
    const commentOwner = comment.owner.toString()

    return { comment, commentOwner }
}

const addComment = asyncHandler(async (req, res) => {
    // get user from middleware of verifyJWT
    // validate comment content
    // create a new comment
    // add comment to video document
    // return success message

    // if user has been passed to this function by middleware it means he is logged in and his data is stored in req.user
    const { videoId } = req.params
    const { content } = req.body;

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(404, "Invalid Video Id provided")
    }

    if (!content) {
        throw new ApiError(400, "Comment content is required")
    }

    const newComment = await Comment.create({
        content: String(content),
        ownerId: req.user._id,
        ownerUsername: req.user.username,
        videoId: videoId
    })

    if (!newComment) throw new ApiError(500, "Error while adding comment")

    return res.status(201)
        .json(new ApiResponse(201, newComment, "Comment Added Successfully"))

})

const getComments = asyncHandler(async (req, res) => {
    // get user from middleware of verifyJWT
    // fetch all comments for the given video
    // return comments with their details
    const { videoId } = req.params

    if (!mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(404, "Invalid Video Id provided")
    }

    const comments = await Comment.find({ videoId})


    if (!comments) throw new ApiError(500, "Error getting comments")

    return res.status(200)
        .json(new ApiResponse(200, comments, "Comments Fetched Successfully"))
})

const editComment = asyncHandler(async (req, res) => {
    // get user from middleware of verifyJWT
    // take the comment id and match it with userId
    // validate comment content
    // update the comment in the database
    // return success message

    // user is logged in if he is passed to this function by middleware
    const { content } = req.body;
    const { comment, commentOwner } = await findOwnerOfComment(req)

    if (String(content) !== comment.content) {

        if (commentOwner !== req.user._id.toString()) {
            throw new ApiError(403, "Unauthorized to edit this comment")
        }

        if (!content) {
            throw new ApiError(400, "Comment content is required")
        }

        const newComment = await Comment.findByIdAndUpdate(comment._id,
            {
                $set: {
                    content: String(content)
                }
            },
            { new: true }
        )

        if (!newComment) throw new ApiError(500, "Error while updating comment")

        return res.status(200)
            .json(new ApiResponse(200, newComment, "Comment Updated Successfully"))
    } else {
        return res.status(400)
            .json(new ApiResponse(400, {}, "No changes made to old comment"))
    }
})

const deleteComment = asyncHandler(async (req, res) => {
    // get user from middleware of verifyJWT
    // take the comment id and match its owner id with the user
    // delete the comment from the database
    // return success message

    const { comment, commentOwner } = await findOwnerOfComment(req)

    if (commentOwner !== req.user._id.toString()) {
        throw new ApiError(403, "Unauthorized to delete this comment")
    }

    const deleted = await Comment.deleteOne({_id: comment._id}, {secure : true})

    if (!deleted) throw new ApiError(500, "Error while deleting comment")

    return res.status(200)
        .json(new ApiResponse(200, { comment: "Removed"}, "Comment Deleted Successfully"))
})

export {
    addComment,
    getComments,
    editComment,
    deleteComment
}