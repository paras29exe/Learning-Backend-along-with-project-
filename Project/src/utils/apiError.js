class ApiError extends Error {
    constructor(
        statusCode,
        message = "Something went wrong",
        source = null,
        errors = [],
        stack = [],
    ){
        super(message);
        this.statusCode = statusCode;
        this.data = null;
        this.message = message;
        this.source = source;
        this.success = false;
        this.errors = (errors.length > 0)? errors : Error;

        if(stack.length > 0){
            this.stack = stack
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiError}