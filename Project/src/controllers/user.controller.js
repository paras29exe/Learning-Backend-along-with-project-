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
        "-password -refreshToken" // minus "-" sign means these values will not be displayed in created user
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
            .json(new ApiResponse(200, { changes: userAccount }, "Account details updated successfully!"))
    }

})

// const updateAvatarOrCover = asyncHandler(async (req, res) => {

//     let avatarLocalPath;
//     let coverImageLocalPath;

//     if (req.files && Array.isArray(req.files.avatar) && req.files.avatar.length > 0) {
//         avatarLocalPath = req.files.avatar[0].path
//     } else {
//         console.log("Avatar file was missing")
//     }

//     if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
//         coverImageLocalPath = req.files.coverImage[0].path
//     } else {
//         console.log("CoverImage file was missing")
//     }

//     let avatar;
//     let coverImage;

//     if (!avatarLocalPath && !coverImageLocalPath) {

//         return res.status(400)
//         .json(new ApiResponse(400, {}, "No avatar or cover image file given by user"));

//     } else {
//         // Upload avatar to Cloudinary
//         if (avatarLocalPath) {
//             try {
//                 avatar = await fileUploadOnCloudinary(avatarLocalPath);
//             } catch (err) {
//                 throw new ApiError(500, {}, "Failed to upload avatar to Cloudinary");
//             }
//         }

//         // Upload cover image to Cloudinary
//         if (coverImageLocalPath) {
//             try {
//                 coverImage = await fileUploadOnCloudinary(coverImageLocalPath);
//             } catch (err) {
//                 throw new ApiError(500, {}, "Failed to upload cover image to Cloudinary");
//             }
//         }

//         const changes = (avatar && coverImage) ? "avatar coverImage" : avatar ? "avatar" : "coverImage";

//         const user = await User.findByIdAndUpdate(req.user?._id,
//             {
//                 $set: {
//                     avatar: avatar || req.user.avatar,
//                     coverImage: coverImage || req.user.coverImage
//                 }
//             },
//             { new: true }
//         ).select(changes)

//         return res.status(200)
//             .json(
//                 new ApiResponse(200, user, "Avatar and / or cover image updated successfully!")
//             )
//     }
// })

const updateAvatar = asyncHandler(async (req, res) => {
    // take avatar file from user
    // upload new avatar to cloudinary
    // find the user and make changes in avatar in db
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "File was not given by user")
    }

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

    return res.status(200)
    .json(new ApiResponse(200, {Changes: changes}, "Avatar has been updated!"))
})

const updateCoverImage = asyncHandler(async (req, res) => {
    // take cover file from user
    // upload new cover to cloudinary
    // find the user and make changes in cover in db
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "File was not given by user")
    }

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

    return res.status(200)
    .json(new ApiResponse(200, {Changes: changes}, "Cover image has been updated!"))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshTheTokens,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage
}