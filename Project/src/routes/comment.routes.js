import { Router } from "express"
import { addComment, getComments, editComment, deleteComment } from "../controllers/comment.controller.js"
import { verifyJWT } from "../middlewares/auth.middleware.js"

const commentRouter = Router()

commentRouter.route("/add-comment/:videoId").post(verifyJWT, addComment)

commentRouter.route("/get-comments/:videoId").get( getComments)

commentRouter.route("/edit-comment/:commentId").patch(verifyJWT, editComment)

commentRouter.route("/delete-comment/:commentId").delete(verifyJWT, deleteComment)

export default commentRouter