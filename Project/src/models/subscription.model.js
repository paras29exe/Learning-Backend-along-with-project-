import mongoose from "mongoose";
import aggregatePaginate from "mongoose-aggregate-paginate-v2";

const subscriptionSchema = new mongoose.Schema({
    subscriber:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    channel: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
}, {timestamps: true})

subscriptionSchema.plugin(aggregatePaginate)

export const Subscription = mongoose.model("Subscription", subscriptionSchema);