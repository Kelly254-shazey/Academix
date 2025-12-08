/**
 * Common Response Utilities
 */

const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const sendError = (res, error, statusCode = 400) => {
  res.status(statusCode).json({
    success: false,
    error: error.message || error,
  });
};

/**
 * Pagination Helper
 */
const getPaginationParams = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Date Utilities
 */
const getCurrentDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const getDateRange = (days = 7) => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
};

module.exports = {
  sendSuccess,
  sendError,
  getPaginationParams,
  getCurrentDate,
  getDateRange,
};
