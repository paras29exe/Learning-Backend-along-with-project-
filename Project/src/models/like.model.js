import mongoose from "mongoose";

const likesSchema = new mongoose.Schema({
    likedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
    },
    comment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Comment",
    }
}, {timeseries: true})


export const Like = mongoose.model("Like", likesSchema);
