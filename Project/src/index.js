import dotenv from "dotenv"
import connectDb from "./db/index.js";
import {app} from "./app.js"

dotenv.config({ // made configurable from package.json "dev" script
    path: "./env"
})

connectDb()
.then(() =>{
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server is listening on  port ${process.env.PORT || 3000}`)
    })
    app.on("error", (err) => {
        console.log("Server is not listening", err)
        throw err
    })
})
.catch((err) => {
    console.error("MONGO DB connection failed", err)
})

 /*//this is not a production standard code
import express from "express";
const app = express()

// this is an "iffy" ()() which invokes a function as soon as is it created
    ; (async () => {
        try {
            await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
            app.on("error", (error) => {
                console.log("ERROR", error)
                throw error
            })

            app.listen(process.env.PORT, () => {
                console.log(`App is listenting on Port ${process.env.PORT}`)
            })

        } catch (error) {
            console.error("ERROR", error)
            throw error
        }
    })() */