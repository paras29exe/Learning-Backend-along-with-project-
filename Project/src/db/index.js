import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDb = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        console.log(`MONGODB connected || DB Host || ${connectionInstance.connection.host}`);
       
    } catch (error) {
        console.log("MONGODB connection Failed ! ", error);
        process.exit() // it is a capability give by nodejs
    }
}

export default connectDb