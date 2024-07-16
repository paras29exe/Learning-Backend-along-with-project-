import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { toggleLikeOnVideo, toggleLikeOnComment } from "../controllers/like.controller.js";

const likeRouter = Router();

likeRouter.route("/toggle-like-on-video/:videoId").post(verifyJWT, toggleLikeOnVideo);

likeRouter.route("/toggle-like-on-comment/:commentId").post(verifyJWT, toggleLikeOnComment);

export default likeRouter;