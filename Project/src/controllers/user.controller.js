import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { Video, Like, Comment, Subscription, Playlist } from "../models/index.js"
import { fileUploadOnCloudinary, deleteFileFromCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken = async (userId) => {
    // try catch 
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        // save refresh token in db so that we dont have to ask for password everytime
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError("Something went wrong when generating access and refresh tokens", error)
    }
}

const registerUser = asyncHandler(async (req, res, next) => {
    const { fullName, email, username, password } = req.body

    if (!fullName || !email || !username || !password) throw new ApiError(404, "All fields are required")

    if (!email.trim().includes("@")) {
        throw new ApiError(400, "Invalid email")
    }

    // Check if email or username already exists in the database
    const existedEmail = await User.findOne({email: email})

    if (existedEmail) {
        throw new ApiError(409, "Email already registered")
    }
    
    const existedUsername = await User.findOne({username: username.toLowerCase()})
    
    if (existedUsername) {
        throw new ApiError(409, "Username not available")
    }

    // logics for avatar and cover image
    let avatarLocalPath;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path
    } else {
        throw new ApiError(400, "Avatar is required field")
    }

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    } else {
        console.log("coverImageLocalPath : Alert! You didn't provided a coverImage")
    }

    const avatar = await fileUploadOnCloudinary(avatarLocalPath)

    // as coverImage is not required necessary so we are handling it if it is given
    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await fileUploadOnCloudinary(coverImageLocalPath)
    }

    /* it will create a new document in "users" named collection and if collection doesn't exists,
      it will create a collection first with the name of model created in user.model.js */

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password: String(password),
        avatar,
        coverImage: coverImage || ""
    })

    const createdUser = await User.findById(user._id)

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating user")
    }

    loginUser({ body: { username, password: String(password) } }, res, next)

})

const loginUser = asyncHandler(async (req, res, next) => {
    // take data from req.body
    // take username or email to login
    // find user from db
    // validate password
    // send access token and refresh token
    // send cookies

    const { username, email, password } = req.body

    if (!username && !email) {
        throw new ApiError(400, "Username or email is required")
    }

    const user = await User.findOne({
        // "$or" return true if any one or more item is found
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(401, "Username or Email not found")
    }

    const isPassValid = await user.isPasswordCorrect(String(password))

    if (!isPassValid) {
        throw new ApiError(401, "Invalid Password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken -watchHistory")

    // we need options when we send cookies to the server so that they can be modified only by server not by user
    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully"))
})

const logoutUser = asyncHandler(async (req, res) => {
    // we got the user details from the middleware from auth.middleware.js
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res.status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User has been logged out"))
})

const refreshTheTokens = asyncHandler(async (req, res, next) => {
    try {
        // get the refresh token from cookies
        const savedRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

        if (!savedRefreshToken) {
            throw new ApiError(401, "Access token is required")
        }

        // token is sent to user in encoded form so decode it first by comparing to get the user Id
        const decodedToken = jwt.verify(savedRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const loggedUser = await User.findById(decodedToken._id)

        if (savedRefreshToken !== loggedUser.refreshToken) {
            throw new ApiError(401, "Access token is expired")
        }

        const options = {
            httpOnly: true,
            secure: true,
        }

        const { accessToken, refreshToken } = await generateAccessAndRefreshToken(loggedUser._id)

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(new ApiResponse(200, { user: loggedUser, accessToken, newRefreshToken: refreshToken }, "Access token refreshed successfully"))

    } catch (error) {
        throw new ApiError("Failed to refresh access token", error)
    }
})

const changeCurrentPassword = asyncHandler(async (req, res) => {
    // get the user details from the middleware from auth.middleware.js
    // get the old password from req.body
    // validate old password
    // update the password in db
    // return success message

    const { currentPassword, newPassword } = req.body

    if (currentPassword && newPassword) {

        const user = await User.findById(req.user?._id)
        const isPassValid = await user.isPasswordCorrect(currentPassword)

        if (!isPassValid) {
            throw new ApiError(401, "Current Password is incorrect!")
        }

        user.password = newPassword;
        await user.save({ validateBeforeSave: false })

        return res.status(200)
            .json(new ApiResponse(200, {}, "Password changed successfully"))

    } else {

        return res.status(400)
            .json(new ApiResponse(400, {}, "All fields are required!"))
    }

})

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200)
        .json(new ApiResponse(200, { user: req.user }, "User has been fetched"))
})

const updateAccountDetails = asyncHandler(async (req, res) => {
    // take fields to be changed
    // update them in database 
    // return the response
    const { fullName, email } = req.body

    if (!fullName && !email) {
        return res.status(400)
            .json(new ApiResponse(400, {}, "No Changes have been made"))

    } else {
        // storing the changed field to return in response by selecting the changed field
        const changes = (fullName && email) ? "fullName email" : fullName ? "fullName" : "email"

        const userAccount = await User.findByIdAndUpdate(req.user._id,
            {
                $set: {
                    fullName: fullName || req.user.fullName,
                    email: email || req.user.email
                }
            },
            { new: true }
        ).select(`-_id ${changes}`)

        return res.status(200)
            .json(new ApiResponse(200, userAccount, "Account details updated successfully!"))
    }

})

const updateAvatar = asyncHandler(async (req, res) => {
    // take avatar file from user
    // upload new avatar to cloudinary
    // find the user and make changes in avatar in db
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "File was not given by user")
    }

    // fetching old avatar link from user object to delete it after uploading new one
    const user = await User.findById(req.user?._id)
    const oldAvatar = user.avatar

    const avatar = await fileUploadOnCloudinary(avatarLocalPath)

    if (!avatar) {
        throw new ApiError(500, "Failed to upload avatar on Cloudinary")
    }

    const changes = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar || req.user.avatar
            }
        },
        { new: true }
    ).select("avatar")

    // deleting old avatar
    await deleteFileFromCloudinary(oldAvatar)

    return res.status(200)
        .json(new ApiResponse(200, { Changes: changes }, "Avatar has been updated!"))
})

const updateCoverImage = asyncHandler(async (req, res) => {
    // take cover file from user
    // upload new cover to cloudinary
    // find the user and make changes in cover in db
    const coverImageLocalPath = req.file && req.file.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "File was not given by user")
    }

    // fetching old cover image link from user object to delete it after uploading new one
    const user = await User.findById(req.user?._id)
    const oldCoverImage = user.coverImage

    const coverImage = await fileUploadOnCloudinary(coverImageLocalPath)

    if (!coverImage) {
        throw new ApiError(500, "Failed to upload cover on Cloudinary")
    }

    const changes = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage || req.user.coverImage
            }
        },
        { new: true }
    ).select("coverImage")

    // deleting old cover image
    await deleteFileFromCloudinary(oldCoverImage)

    return res.status(200)
        .json(new ApiResponse(200, { Changes: changes }, "Cover image has been updated!"))
})

const getChannelById = asyncHandler(async (req, res) => {
    const accessToken = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if (accessToken) {
        const decodedToken = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)

        if (decodedToken) {
            const user = await User.findById(decodedToken._id)
            req.user = user
        }
    }

    const { page = 1, limit = 24 } = req.query
    const { channelId } = req.params

    if (!mongoose.isValidObjectId(channelId)) throw new ApiError(400, "Invalid Channel ID provided")

    const channel = await User.aggregate([
        {
            $facet: {
                channelDetails: [
                    { $match: { _id: mongoose.Types.ObjectId.createFromHexString(channelId) } },
                    { $addFields: { channelName: "$fullName" } },
                    // finding no. of documents in subscription collection that has his ID in "channel" field
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        // overwriting the matching documents with in array their size of array or count of documents 
                        $addFields: {
                            subscribers: { $size: "$subscribers" }
                        }
                    },
                    {
                        $lookup: {
                            from: "subscriptions",
                            let: {
                                channel: "$_id",
                                viewer: req.user?._id
                            },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [
                                                { $eq: ["$channel", "$$channel"] },
                                                { $eq: ["$subscriber", "$$viewer"] }
                                            ]
                                        }
                                    }
                                }
                            ],
                            as: "subscribedByViewer"
                        }
                    },
                    {
                        $addFields: {
                            subscribedByViewer: {
                                $cond: [
                                    { $eq: [{ $size: "$subscribedByViewer" }, 1] },
                                    true,
                                    false
                                ]
                            }
                        }
                    },
                    {
                        $project: {
                            fullName: 0,
                            email: 0,
                            password: 0,
                            __v: 0,
                            refreshToken: 0,
                            watchHistory: 0,
                            updatedAt: 0
                        }
                    }

                ],
                videos: [
                    {
                        $match: { _id: mongoose.Types.ObjectId.createFromHexString(channelId) },
                    },
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "ownerId",
                            as: "videos",
                            pipeline: [
                                {
                                    $sort: { "views": -1 }
                                },
                                {
                                    $project: {
                                        description: 0,
                                        videoFile: 0,
                                        publishStatus: 0,
                                        updatedAt: 0,
                                        __v: 0,
                                        ownerUsername: 0,
                                    }
                                },
                            ]
                        }
                    },
                    { $unwind: "$videos" },
                    { $replaceRoot: { newRoot: "$videos" } },
                    { $skip: (page - 1) * parseInt(limit) },
                    { $limit: parseInt(limit) }
                ]
            },
        },
        {
            $unwind: "$channelDetails"
        },
    ])

    if (Object.keys(channel[0].channelDetails).length === 0) {
        throw new ApiError(404, "Channel not found")
    }

    return res.status(200)
        .json(new ApiResponse(200, channel[0], "Channel fetched successfully"));
})

const getWatchHistory = asyncHandler(async (req, res) => {
    const userId = req.user._id;

    const watchHistory = await User.aggregate([
        {
            $match: { _id: userId }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "ownerId",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $addFields: { channelName: "$fullName" }
                                },
                                {
                                    $project: {
                                        channelName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                ]
            }
        },
        {
            $unwind: "$watchHistory"
        },
        {
            $replaceRoot: {
                newRoot: "$watchHistory"
            }
        }
    ])

    if (watchHistory.length === 0) {
        return res.status(200).json(new ApiResponse(204, {}, "No videos available in watch history."))
    }

    return res.status(200)
        .json(new ApiResponse(200, watchHistory, "Watch history fetched successfully."));
})


const deleteAccount = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const session = await mongoose.startSession();

    session.startTransaction();

    try {
        await User.findByIdAndDelete(userId).session(session);

        // deleting user's channel avatar and cover
        await deleteFileFromCloudinary(req.user.avatar);
        (req.user.coverImage !== "") ? await deleteFileFromCloudinary(req.user.coverImage) : null;

        // finding all videos of user
        const videos = await Video.find({ ownerId: userId });

        if (videos.length > 0) {

            for (const video of videos) {
                // deleting files of each video
                await deleteFileFromCloudinary(video.thumbnail)
                await deleteFileFromCloudinary(video.videoFile)

                // deleting likes on each video of user
                await Like.deleteMany({ video: video._id })

                // finding comments of each video
                const comments = await Comment.find({ videoId: video._id });

                if (comments.length > 0) {
                    for (const comment of comments) {
                        // deleting likes on comments of each video of user
                        await Like.deleteMany({ comment: comment._id }).session(session)
                    }
                }

                // in last deleting all the comments on user videos 
                await Comment.deleteMany({ videoId: video._id }).session(session);
            }
        }

        await Video.deleteMany({ ownerId: userId }).session(session);
        await Like.deleteMany({ likedBy: userId }).session(session);
        await Comment.deleteMany({ ownerId: userId }).session(session);
        await Playlist.deleteMany({ ownerId: userId }).session(session);
        await Subscription.deleteMany({
            $or: [
                { subscriber: userId },
                { channel: userId }
            ]
        }).session(session);

        await session.commitTransaction();
        session.endSession();

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw new ApiError(500, "Failed to delete user and its related data", error);
    }

    return res.status(200)
        .json(new ApiResponse(200, {}, "User and its all related data has been deleted"));
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshTheTokens,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getChannelById,
    getWatchHistory,
    deleteAccount,
}