import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const verifyJWT = asyncHandler(async (req, res, next) => {
    // validate JWT access token from cookies 
    // if valid, then next() else throw an error
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        // console.log(token);

        if (!token) {
            throw new ApiError(401, "Access token is required");
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // we have stored a lot of information in access_token using jwt ~ refer to user.model.js :: 66 ~
        const user = await User.findById(decoded?._id).select("-password -refreshToken");

        if (!user) {
            throw new ApiError(404, "Access token expired , Please login again");
        }

        req.user = user;
        next();
    } catch (error) {
            throw new ApiError(402, "No Access Token! Please Login first");
    }
});

export { verifyJWT };
