import { verifyJWT } from "../middlewares/auth.middleware.js";
import { toggleSubscription, subscribedChannels, subscribersList, subscribedChannelVideos } from "../controllers/subscription.controller.js";
import { Router } from "express";

const subscriptionRouter = Router();

subscriptionRouter.route("/toggle-subscription/:channelId").post(verifyJWT, toggleSubscription);

subscriptionRouter.route("/subscribed-channels/current-user").get(verifyJWT, subscribedChannels);

subscriptionRouter.route("/subscribers-list/current-user").get(verifyJWT, subscribersList);

subscriptionRouter.route("/subscribed-channel-videos/current-user").get(verifyJWT, subscribedChannelVideos);

export default subscriptionRouter;