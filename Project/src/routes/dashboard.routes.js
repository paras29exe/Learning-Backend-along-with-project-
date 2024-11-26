import { Router } from "express";
import { getChannelStats, getUserVideos } from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"

const dashboardRouter = Router();

dashboardRouter.route("/channel-stats").get(verifyJWT, getChannelStats);

dashboardRouter.route("/user-videos").get(verifyJWT, getUserVideos);

export default dashboardRouter;