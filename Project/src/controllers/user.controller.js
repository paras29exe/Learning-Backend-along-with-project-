import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/apiError.js"
import { User } from "../models/user.model.js"
import { fileUploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"

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

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, username, password } = req.body

    const fields = [fullName, email, username, password].map((field) => field && String(field).trim())

    // Check if any field is empty or null by using "some" method which return true if any field is empty
    if (fields.some((field) => field === "")) {
        throw new ApiError(400, "All fields are required")
    }
    if (!email.trim().includes("@")) {
        throw new ApiError(400, "Invalid email")
    }

    // Check if email or username already exists in the database
    const existedUser = await User.findOne({
        $or: [{ email: email }, { username: username }]
    })

    if (existedUser) {
        throw new ApiError(409, "Email or username already exists")
    }

    // logics for avatar and cover image
    let avatarLocalPath;
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
        avatarLocalPath = req.files.avatar[0].path
    } else {
        throw new ApiError(400, "Avatar is required")
    }

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    } else {
        console.log("coverImageLocalPath : Warning! You didn't provided a coverImage")
    }

    const avatar = await fileUploadOnCloudinary(avatarLocalPath)

    // as coverImage is not required necessary so we are handling it if it is given
    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await fileUploadOnCloudinary(coverImageLocalPath)
    }

    const user = await User.create({
        fullName,
        email,
        username: username.toLowerCase(),
        password,
        avatar: avatar,
        coverImage: coverImage || ""
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken" // here select method is different and it return all other values other then selected one with minus "-" sign
    )
    console.log("user created :", createdUser)

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User created successfully")
    )
})

const loginUser = asyncHandler(async (req, res) => {
    // take data from req.body
    // take username or email to login
    // find user from db
    // validate password
    // send access token and refresh token
    // send cookies

    const { username, email, password } = req.body
    console.log(req.body);


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

    const isPassValid = await user.isPasswordCorrect(password)

    if (!isPassValid) {
        throw new ApiError(401, "Invalid Password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

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

const refreshAccessToken = asyncHandler(async (req, res, next) => {
    // get the refresh token from cookies
    try {
        const savedRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

        if (!savedRefreshToken) {
            throw new ApiError(401, "Access token is required")
        }

        // token is sent to user in encoded form so decode it first to get the user Id
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
            .json(new ApiResponse(200, { user: loggedUser, accessToken, refreshToken }, "Access token refreshed successfully"))
    } catch (error) {
        throw new ApiError("Failed to refresh access token", error)
    }
})
export { registerUser, loginUser, logoutUser, refreshAccessToken }