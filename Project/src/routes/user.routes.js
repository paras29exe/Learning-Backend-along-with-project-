import { Router } from "express";
import { registerUser, loginUser, logoutUser, changeCurrentPassword } from "../controllers/user.controller.js";
import { refreshTheTokens, getCurrentUser, updateAccountDetails, getChannelById, getWatchHistory, deleteAccount } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

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

userRouter.route("/refresh-the-tokens").post(refreshTheTokens);

userRouter.route("/change-password").patch(verifyJWT, changeCurrentPassword);

userRouter.route("/get-current-user").get(verifyJWT, getCurrentUser);

userRouter.route("/update-account-details").put(verifyJWT, upload.fields([
    {
        name: "avatar",
        maxCount: 1
    },
    {
        name: "coverImage",
        maxCount: 1
    }
]), updateAccountDetails);

userRouter.route("/get-channel/:username").get(getChannelById)

userRouter.route("/get-watch-history").get(verifyJWT, getWatchHistory)

userRouter.route("/delete-account").delete(verifyJWT, deleteAccount)

export default userRouter