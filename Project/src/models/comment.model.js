import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    ownerUsername: {
        type: mongoose.Schema.Types.String,
        ref: "User",
        required: true
    },
    videoId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
        required:  true
    }
},{timestamps: true});



export const Comment = mongoose.model("Comment", commentSchema)