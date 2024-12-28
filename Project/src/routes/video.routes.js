import { Router } from "express";
import {
    uploadVideo,
    updateVideoDetails,
    deleteVideo,
    getChannelVideos,
    getHomeVideos,
    getSearchVideos,
    getVideoById,
    playVideo,
} from "../controllers/video.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js"

const videoRouter = Router()

videoRouter.route("/upload-video").post(verifyJWT, upload.fields([
    {
        name: "thumbnail",
        maxCount: 1
    },
    {
        name: "videoFile",
        maxCount: 1
    }
]), uploadVideo)

videoRouter.route("/update-video-details/:videoId").patch(verifyJWT, upload.single("thumbnail"), updateVideoDetails)

videoRouter.route("/delete-video/:videoId").delete(verifyJWT, deleteVideo)

videoRouter.route("/get-channel-videos/:username").get(getChannelVideos)

videoRouter.route("/get-videos").get(getHomeVideos)

videoRouter.route("/get-searched-videos").get(getSearchVideos)

videoRouter.route("/get-video/:videoId").get(getVideoById)

videoRouter.route("/play-video/:videoId").get(playVideo)

export default videoRouter;