import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js"
import { createPlaylist, addVideosToPlaylist, removeVideosFromPlaylist, updatePlaylistDetails, getPlaylistById, getAllPlaylists,  } from "../controllers/playlist.controller.js"

const playlistRouter = Router()

playlistRouter.route("/create-playlist").post(verifyJWT, createPlaylist)

playlistRouter.route("/add-videos-to-playlist/:playlistId").post(verifyJWT, addVideosToPlaylist)

playlistRouter.route("/remove-videos-from-playlist/:playlistId").post(verifyJWT, removeVideosFromPlaylist)

playlistRouter.route("/update-playlist-details/:playlistId").patch(verifyJWT, updatePlaylistDetails)

playlistRouter.route("/get-playlist/:playlistId").get(getPlaylistById)

playlistRouter.route("/get-all-playlists/:userId").get( getAllPlaylists)


export default playlistRouter