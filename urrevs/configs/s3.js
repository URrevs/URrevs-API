/*
  Author: Abdelrahman Hany
  Created on: 24-Jun-2022
*/

const AWS = require('aws-sdk');

module.exports = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});