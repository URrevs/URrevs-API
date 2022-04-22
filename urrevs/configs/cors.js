/*
  Author: Abdelrahman Hany
  Created on: 22-Apr-2022
*/

const cors = require("cors");

// only allow our front domain to access the api
exports.corsUsOnly = cors({origin: [(process.env.FRONT_DOMAIN)]});