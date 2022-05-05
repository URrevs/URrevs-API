/*
  Author: Abdelrahman Hany
  Created on: 23-Apr-2022
*/

// Algorithm: Sliding Window Counter
/* 
It is recommended to make the window size in terms of minutes, seconds, or both 
and make the window size as small as possible in order to optimizie memory usage. 
Because cached records are cleared more frequently when using small windows, 
we can achieve small memory consumption.
*/
const rateLimitter = require('express-rate-limit').rateLimit;

module.exports = rateLimitter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(process.env.RATE_LIMIT_MAX),
  message: {success: false, status: "too many requests"}, 
  headers: true
}); 