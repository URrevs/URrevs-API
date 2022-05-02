/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

var express = require('express');
var router = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit");

//--------------------------------------------------------------------


router.options("*", cors.cors, (req, res, next)=>{
  res.sendStatus(200);
});



// Endpoints Implementation


/* GET home page. */
router.get('/', cors.cors, rateLimit.regular, function(req, res, next) {
  res.json({"status": "deployed successfully"});
});

module.exports = router;