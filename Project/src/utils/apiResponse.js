class ApiResponse {
    // This class will create an API response object with statusCode, data, message, and success properties.
    constructor(statusCode, data, message = "Success",) {

        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        this.success = statusCode < 400;

    }
}

export { ApiResponse }