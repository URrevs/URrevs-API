/*
  Author: Abdelrahman Hany
  Created on: 24-Jun-2022
*/

const multer = require("multer");
const multerS3 = require("multer-s3");
const s3 = require("../configs/s3");



const imgFilter = (allowedTypes) => {
    return (req, file, cb) => {
        if (file.originalname.match(allowedTypes)) {
          cb(null, true);
        } else {
          req.wrongFormat = true;
          cb(null, false);
        }
    };
}



module.exports = (key, allowedTypes, bucket, filePrefix)=>{
    return multer({
        fileFilter: imgFilter(allowedTypes),
        storage: multerS3({
            acl: "public-read",
            s3: s3,
            bucket: bucket,
            metadata: (req, file, cb) => {cb(null, { fieldName: file.fieldname });},
            key: (req, file, cb) => {cb(null, filePrefix + file.originalname);}
        })
    }).single(key);
}