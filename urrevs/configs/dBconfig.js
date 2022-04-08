/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
 */

  var Mongoose = require("mongoose");
  
  
  const url = process.env.DB_URI;
  exports.connect = Mongoose.connect(url).then((db) => {
      console.log("DB Connected Successfully!");
    })
    .catch((err) => {
      console.log(err);
    });