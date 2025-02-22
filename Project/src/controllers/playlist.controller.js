import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/apiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import mongoose from "mongoose";

async function findOwnerOfPlaylist(req) {

    // frontend will associate the video id with each individual video while rendering videos list and then pass it in url when updating thumbnail
    const { playlistId } = req.params;

    if (!playlistId) throw new ApiError(404, "Please provide a playlist id")

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(404, "Invalid Playlist Id provided")
    }

    // finding playlist doc in db
    const playlist = await Playlist.findById(playlistId)

    // extracting the owner of playlist doc and its owner id in string
    const playlistOwner = playlist.ownerId.toString()

    return { playlist, playlistOwner }
}

const createPlaylistAndAddVideos = asyncHandler(async (req, res) => {
    // verify the user with verifyJWT middleware
    // take details from form data such as playlist name, description
    // create a new instance of Playlist model with these details
    // save the playlist in the database
    // return the response with the playlist data
    const { name, description, videoIds } = req.body;

    if (!name || !description) throw new ApiError(400, "Please enter a name and description for this playlist")

    const existingPlaylist = await Playlist.findOne({ name: name })

    if (existingPlaylist) throw new ApiError(409, "Playlist with same name already exists", "name")

    // find the thumbanail of first video and set it as cover image of playlist
    const video = await Video.findById(videoIds[0])
    const coverImage = video.thumbnail

    const playlist = await Playlist.create({
        name,
        description,
        ownerId: req.user._id,
        ownerChannelName: req.user.fullName,
        coverImage: coverImage,
        videos: [...videoIds]
    })

    if (!playlist) throw new ApiError(500, "Couldn't create playlist right now")

    return res.status(200)
        .json(new ApiResponse(200, playlist, "Playlist created successfully"))
})

const addVideosToSelectedPlaylist = asyncHandler(async (req, res) => {
    // verify the user with verifyJWT middleware
    // find the playlist with provided id
    // add the provided video ids to the playlist videos array
    // save the playlist in the database
    // return the response with the updated playlist data

    // const { playlist, playlistOwner } = findOwnerOfPlaylist(req)

    // if (playlistOwner !== req.user?._id.toString()) throw new ApiError(403, "Unauthorized to add videos to this playlist")

    const { playlistIds, videoIds } = req.body;

    // verify if all video ids provided are in array format valid objectIds
    if (!Array.isArray(videoIds) || !videoIds.every(mongoose.Types.ObjectId.isValid)) {
        throw new ApiError(404, "Video IDs must be in array format and all valid objectIds")
    }


    const updatedPlaylist = await Playlist.updateMany(
        { _id: { $in: playlistIds } },
        {
            $addToSet: {
                videos: { $each: videoIds }
            }
        },
        { new: true }
    )

    // if (!updatedPlaylist) throw new ApiError(404, "Playlist with this Id not found")

    return res.status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Videos added to playlist successfully"))
})

const removeVideosFromPlaylist = asyncHandler(async (req, res) => {
    // verify the user with verifyJWT middleware
    // find the playlist with provided id
    // remove the provided video ids from the playlist videos array
    // save the playlist in the database
    // return the response with the updated playlist data

    const { playlist, playlistOwner } = findOwnerOfPlaylist(req)

    const { videoIds } = req.body;

    if (!Array.isArray(videoIds) || !videoIds.every(mongoose.Types.ObjectId.isValid)) {
        throw new ApiError(404, "Video IDs must be in array format and all valid objectIds")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist._id,
        {
            $pull: {
                videos: { $each: videoIds }
            }
        },
        { new: true }
    )

    if (!updatedPlaylist) throw new ApiError(404, "Playlist with this Id not found")

    return res.status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Videos removed from playlist successfully"))
})

const updatePlaylistDetails = asyncHandler(async (req, res) => {
    // verify the user with verifyJWT middleware
    // find the playlist with provided id
    // update the provided playlist details
    // save the playlist in the database
    // return the response with the updated playlist data

    const { playlist, playlistOwner } = findOwnerOfPlaylist(req)

    if (playlistOwner !== req.user?._id.toString()) throw new ApiError(403, "Unauthorized to update this playlist")

    const { name, description } = req.body;

    if (!name && !description) throw new ApiError(400, "No changes provided by user");

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist._id,
        {
            $set: {
                name,
                description
            }
        },
        { new: true }
    )

    if (!updatedPlaylist) throw new ApiError(404, "Playlist with this Id not found")

    return res.status(200)
        .json(new ApiResponse(200, updatedPlaylist, "Playlist details updated successfully"))

})

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(404, "Invalid playlist Id provided");
    }

    const playlist = await Playlist.findById(playlistId).populate({
        path: 'videos',
        select: '_id title thumbnail views ownerId ownerChannelName ownerAvatar  createdAt'
    });

    if (!playlist) throw new ApiError(404, "Playlist with this Id not found");

    // Calculate total views from all videos in the playlist
    const totalViews = playlist.videos.reduce((acc, video) => acc + video.views, 0);

    return res.status(200)
        .json(new ApiResponse(200, { ...playlist.toObject(), totalViews }, "Playlist fetched successfully"));
});

const deletePlaylistById = asyncHandler(async (req, res) => {
    // verify the user with verifyJWT middleware
    // find the playlist with provided id
    // delete the playlist from the database
    // return the response with a success message

    const { playlist, playlistOwner } = findOwnerOfPlaylist(req)

    if (playlistOwner !== req.user?._id.toString()) throw new ApiError(403, "Unauthorized to Delete this playlist")

    const deletePlaylist = await Playlist.findByIdAndDelete(playlist._id)

    if (!deletePlaylist) throw new ApiError(404, "Playlist with this ID not found")  // if playlist not found then throw 404 error  // if playlist found then delete it  // if deleted then return success message  // if not deleted then throw 500 error   // if playlist deleted then return success message  // if not deleted then throw 500 error   // if playlist deleted then return success message  // if not deleted then throw 500 error   // if playlist deleted then return success message  // if not deleted then throw 500 error   // if playlist deleted then return success message  // if not deleted then throw 500 error   // if playlist deleted then return success message  // if not deleted then throw 500 error   // if playlist deleted then return success message  // if not deleted then throw 500 error   // if playlist deleted then return success message  // if not deleted

    return res.status(200)
        .json(new ApiResponse(200, deletePlaylist, "Playlist deleted successfully"))
})

const getAllPlaylists = asyncHandler(async (req, res) => {
    // get username and other sorting and pagination queries for displaying playlists
    // find all playlists of the user
    // return the response with the playlists data
    const { page = 1, limit = 20, sortBy = "-createdAt", order = "desc" } = req.query;
    const { userId } = req.params;

    const sortOrder = (order === "desc" ? -1 : 1)

    const playlists = await Playlist.find({ ownerId: userId })
        .sort({ [sortBy]: sortOrder })
        .skip((page - 1) * limit) // if we are on page 2 then it will skip ( (2-1) * 10 = first 10 playlist )
        .limit(parseInt(limit))
        .select("name ownerChannelName createdAt")

    if (!playlists.length) return res.status(200).json(new ApiResponse(404, {}, "This user has no playlists"))  // return empty array

    // const totalPlaylists = await Playlist.countDocuments({ ownerUsername: username })

    return res.status(200)
        .json(new ApiResponse(200, playlists, "Playlists fetched successfully"))
})

export {
    createPlaylistAndAddVideos,
    addVideosToSelectedPlaylist,
    removeVideosFromPlaylist,
    updatePlaylistDetails,
    getPlaylistById,
    deletePlaylistById,
    getAllPlaylists,
}