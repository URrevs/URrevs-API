/*
  Author: Abdelrahman Hany
  Created on: 22-Apr-2022
*/


//const redisStore = require("rate-limit-redis").RedisStore;
//const client = require("../configs/redisConfig");
// const Redis = require('ioredis');
// const client = new Redis();

// const rateLimitter = require("express-rate-limit-redis");

// module.exports = rateLimitter({
//   client,
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS),
//   max: parseInt(process.env.RATE_LIMIT_MAX),
//   message: {success: false, status: "too many requests"}, 
//   headers: true
// });


const redis = require('redis');
const moment = require('moment');
const redisClient = redis.createClient();



