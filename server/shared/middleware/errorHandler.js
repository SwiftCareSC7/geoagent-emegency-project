/**
 * Centralized error handling middleware.
 * Catches all unhandled errors and returns a safe JSON response.
 */
const errorHandler = (err, req, res, next) => {
  // Log the error securely on the server-side for debugging
  console.error(`[Error] ${err.name}: ${err.message}`);
  
  if (process.env.NODE_ENV === 'development') {
    // Only in development we might log the stack, but we STILL don't send it to the client
    console.error(err.stack);
  }

  // Handle specific known errors (e.g., invalid JSON from body-parser)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload provided'
    });
  }

  // Preserve explicit status code from operational error or response
  const statusCode = err.status || err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  
  res.status(statusCode).json({
    success: false,
    message: err.isOperational ? err.message : 'Something went wrong'
  });
};


/**
 * 404 Route Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  res.status(404);
  const error = new Error(`Route not found - ${req.originalUrl}`);
  error.isOperational = true; // Mark as an operational error
  next(error);
};

export { errorHandler, notFoundHandler };
