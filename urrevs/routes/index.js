/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

var express = require('express');
var router = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit");

//--------------------------------------------------------------------

// Endpoints Implementation


/* GET home page. */
router.get('/', rateLimit.regular, cors.cors, function(req, res, next) {
  res.json({"status": "deployed successfully"});
});

module.exports = router;
