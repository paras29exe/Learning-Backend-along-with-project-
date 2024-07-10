import { Router } from "express";
import { registerUser, loginUser, logoutUser, refreshTheTokens, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateAvatar, updateCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const userRouter = Router();

// .post is middleware
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

userRouter.route("/current-user").get(verifyJWT, getCurrentUser);

userRouter.route("/update-account-details").patch(verifyJWT, updateAccountDetails);

userRouter.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar)

userRouter.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)

export default userRouter