/*
  Author: Abdelrahman Hany
  Created on: 22-Apr-2022
*/

const rateLimitter = require('express-rate-limit').rateLimit;

module.exports = rateLimitter({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
  max: parseInt(process.env.RATE_LIMIT_MAX),
  message: {success: false, status: "too many requests"}, 
  headers: true
});