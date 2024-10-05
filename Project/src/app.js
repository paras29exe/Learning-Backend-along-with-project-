import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/apiError.js";

const app = express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

// MIDDLEWARE - Plugins of express
app.use(express.json({limit: "20kb"}))
app.use(express.urlencoded({extended: true, limit: "20kb"}))
app.use(express.static("public"))
app.use(cookieParser())

// routes imported 
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import commentRouter from "./routes/comment.routes.js";
import playlistRouter from "./routes/playlist.routes.js";
import subscriptionRouter from "./routes/subscription.routes.js";
import likeRouter from "./routes/like.routes.js";
import dashboardRouter from "./routes/dashboard.routes.js";

// we can't use app.get here because "controller functions" are in separate files and now we are routing in this file
app.use("/api/v1/users", userRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/playlists", playlistRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/dashboard", dashboardRouter)

app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            status: err.statusCode,
            success: err.success,
            message: err.message,
            errors: err.errors,
        });
    } else {
        // Handle other errors (or create a default ApiError if you prefer)
        return res.status(500)
        .json(new ApiError(500, err.message, err));
    }
});

export {app}