import { verifyJWT } from "../middlewares/auth.middleware.js";
import { toggleSubscription, subscribedChannels, subscribersList, subscribedVideos } from "../controllers/subscription.controller.js";
import { Router } from "express";

const subscriptionRouter = Router();

subscriptionRouter.route("/toggle-subscription/:channelId").post(verifyJWT, toggleSubscription);

subscriptionRouter.route("/subscribed-channels/current-user").get(verifyJWT, subscribedChannels);

subscriptionRouter.route("/subscribers-list/current-user").get(verifyJWT, subscribersList);

subscriptionRouter.route("/subscribed-videos/current-user").get(verifyJWT, subscribedVideos);

export default subscriptionRouter;