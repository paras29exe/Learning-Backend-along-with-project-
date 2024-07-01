import mongoose from "mongoose";

const hospitalSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    pincode: {
        type: Number,
        required: true
    },
    specializedIn: [
        {
            type: String,
        }
    ],
},{timestamps:true});

export const Hospital = mongoose.model("Hospital", hospitalSchema);