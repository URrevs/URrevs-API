/*
  Author: Abdelrahman Hany
  Created on: 8-Apr-2022
*/

var express = require('express');
var router = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit");

router.use(cors.cors);
router.use(rateLimit);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({"status": "deployed successfully"});
});

module.exports = router;
