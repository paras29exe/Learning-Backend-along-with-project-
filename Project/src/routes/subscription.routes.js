import { verifyJWT } from "../middlewares/auth.middleware";
import { toggleSubscription } from "../controllers/subscription.controller.js";
import { Router } from "express";

const subscriptionRouter = Router();

subscriptionRouter.route("/toggle-subscription/:channelId").post(verifyJWT, toggleSubscription);