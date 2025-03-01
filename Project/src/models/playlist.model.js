import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    videos: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    coverImage: {
        type: String,
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    ownerChannelName: {
        type: String,
        ref: "User"
    }
},{timestamps: true})


export const Playlist = mongoose.model("Playlist", playlistSchema)