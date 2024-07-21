import { Router } from "express";
import { registerUser, loginUser, logoutUser, changeCurrentPassword, updateAvatar, updateCoverImage } from "../controllers/user.controller.js";
import { refreshTheTokens, getCurrentUser, updateAccountDetails, getChannelById, getWatchHistory, deleteAccount } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const userRouter = Router();

userRouter.route("/register").post(upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]),
    registerUser
)

userRouter.route("/login").post(loginUser);

userRouter.route("/logout").post(verifyJWT, logoutUser);

userRouter.route("/refresh-access-token").post(refreshTheTokens);

userRouter.route("/change-password").post(verifyJWT, changeCurrentPassword);

userRouter.route("/get-current-user").get(verifyJWT, getCurrentUser);

userRouter.route("/update-account-details").patch(verifyJWT, updateAccountDetails);

userRouter.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)

userRouter.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)

userRouter.route("/get-channel/:channelId").get(getChannelById)

userRouter.route("/get-watch-history").get(verifyJWT, getWatchHistory)

userRouter.route("/delete-account").delete(verifyJWT, deleteAccount)

export default userRouter