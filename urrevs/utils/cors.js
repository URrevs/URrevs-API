/*
  Author: Abdelrahman Hany
  Created on: 22-Apr-2022
*/

const cors = require("cors");

let whiteList = (process.env.FRONT_DOMAIN || "").split(",");
console.log(whiteList);
const corsOptionsDelegate = (req,callback)=>{
  var corsOptions;

  if(whiteList.indexOf(req.header('Origin')) != -1){  // if the element is not in the array the output will be -1
      corsOptions = {origin : true};
  }else{
      corsOptions = {origin : false};
  }
  callback(null , corsOptions);   // the params represent err, corsOptions
};

// only allow our front domain to access the api
exports.cors = cors(corsOptionsDelegate); // "" to avoid undefined error in ci cd pipelines