class ApiError extends Error {
    constructor(
        statusCode,
        message = null,
        source = null,
        errors = [],
        stack = [],
    ){
        super();
        this.statusCode = statusCode;
        this.message = message;
        this.data = null;
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