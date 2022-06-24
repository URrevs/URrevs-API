/*
  Author: Abdelrahman Hany
  Created on: 24-Jun-2022
*/

const fs = require('fs');
const s3 = require('../configs/s3');

module.exports = (filePath, filePathS3, bucketName) => {
    return new Promise((resolve, reject) => {
        let blob = fs.readFileSync(filePath);
        let params = {
            Bucket: bucketName,
            Key: filePathS3,
            Body: blob,
            ACL:'public-read'
        }
        s3.upload(params).promise().then((data) => {
            resolve(data.Location);
        })
        .catch((err) => {
            reject(err);
        });
    });
}