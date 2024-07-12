import { Router } from "express";
import { uploadVideo, updateVideoDetails, deleteVideo, togglePublishStatus } from "../controllers/video.controller.js";
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
]), uploadVideo )

videoRouter.route("/:videoId/update-video-details").patch(verifyJWT, upload.single("thumbnail"), updateVideoDetails)

videoRouter.route("/:videoId/delete-video").delete(verifyJWT, deleteVideo )

videoRouter.route("/:videoId/toggle-publish-status").patch(verifyJWT, togglePublishStatus)


export default videoRouter;