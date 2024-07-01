const asyncHandler = (requestHandler) => {
    // using promises
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => next(err));
    } 
}

export {asyncHandler}

/*
make a asyncHandler function with try catch

const asyncHandler = (requestHandler) => (req,res,next) => {
    try {
        requestHandler(req,res,next)
    } catch (error) {
        next(error)
        throw error.message
    }  
}
*/