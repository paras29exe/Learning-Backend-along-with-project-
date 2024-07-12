import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    thumbnail: {
        type: String, // cloudinary url
        required: true,
    },
    videoFile: {
        type: String, // cloudinary url for video
        required: true,
    },
    duration: {
        type: Number, // fetch duration from video file    ***** TODO ******
        // required: true,
    },
    views: {
        type: Number,
        default: 0,
    },
    publishStatus: {
        type: String,
        default: "public",
    },
    ownerId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    ownerName: {
        type: String,
    }
},{timestamps:true});

videoSchema.plugin(mongooseAggregatePaginate)

export const Video = mongoose.model("Video", videoSchema);