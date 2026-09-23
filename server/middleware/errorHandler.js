// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.status || (res.statusCode >= 400 ? res.statusCode : 500);
  if (err.name === 'ValidationError') status = 422;
  if (err.name === 'CastError') status = 400;
  if (err.code === 11000) status = 409;
  if (status >= 500) console.error(err);
  res.status(status).json({
    message: status >= 500 ? 'An unexpected server error occurred. Please try again.' : err.code === 11000 ? 'That record already exists.' : err.message,
  });
};

export default errorHandler;
