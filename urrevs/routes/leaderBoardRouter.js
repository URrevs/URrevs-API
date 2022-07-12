/*
  Author: Abdelrahman Hany
  Created on: 21-May-2022
*/

const express = require("express");
const leaderBoardRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit/regular");

const COMPETITION = require("../models/competition");
const USER = require("../models/user");
const authenticate = require("../utils/authenticate");
const config = require("../config");


// preflight
leaderBoardRouter.options("*", cors.cors, (req, res, next)=>{
    res.sendStatus(200);
});



// Add competition
leaderBoardRouter.post("/", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
    let {deadline, prize, prizePic, numWinners} = req.body;

    if(!deadline || !prize || !prizePic || !numWinners){
        return res.status(400).json({
            success: false,
            status: "Bad request"
        });
    }

    if(!Date.parse(deadline)){
        return res.status(400).json({
            success: false,
            status: "Invalid date"
        });
    }

    if(Date.parse(deadline) < Date.now()){
        return res.status(400).json({
            success: false,
            status: "Invalid date"
        });
    }

    if(typeof(numWinners) != "number"){
        return res.status(400).json({
            success: false,
            status: "Invalid number of winners"
        });
    }

    if(numWinners < 1 || Number.isInteger(numWinners) == false){
        return res.status(400).json({
            success: false,
            status: "Invalid number of winners"
        });
    }

    if(!(typeof(prize) == "string" && typeof(prizePic) == "string")){
        return res.status(400).json({
            success: false,
            status: "Invalid prize"
        });
    }

    if(prize.trim() == "" || prizePic.trim() == ""){
        return res.status(400).json({
            success: false,
            status: "Invalid prize"
        });
    }

    // finding the latest competition
    COMPETITION.findOne({}, {deadline: 1}).then((comp)=>{
        if(comp){
            if(Date.parse(comp.deadline) > Date.now()){
                return res.status(403).json({
                    success: false,
                    status: "already running competition",
                });
            }
        }

        // creating new competition
        let proms = [];
        proms.push(COMPETITION.create({
            deadline: deadline,
            prize: prize,
            prizePic: prizePic,
            numWinners: numWinners
        }));


        Promise.all(proms).then((results)=>{
            res.status(200).json({
                success: true,
                _id: results[0]._id
            });

            // resetting all users' points
            USER.updateMany({}, {$set: {comPoints: 0}}).exec();
        })
        .catch((err)=>{
            console.log("Error from POST /competitions: ", err);
            res.status(500).json({
                success: false,
                status: "Internal server error",
                err: "Error creating competition"
            });
        });

    })
    .catch((err)=>{
        console.log("Error from POST /competitions: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "find competition error"
        });
    });

});




// delete a competition
leaderBoardRouter.delete("/:compId", cors.cors, rateLimit, authenticate.verifyUser, authenticate.verifyAdmin, (req, res, next)=>{
    COMPETITION.findByIdAndDelete(req.params.compId)
    .then((comp)=>{
        if(!comp){
            return res.status(404).json({
                success: false,
                status: "not found"
            });
        }

        res.status(200).json({
            success: true
        });
    })
    .catch((err)=>{
        console.log("Error from DELETE /competitions: ", err);
        res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Error deleting competition"
        });
    });
});



// get the info of the latest competition
leaderBoardRouter.get("/latest", cors.cors, rateLimit, (req, res, next)=>{
    COMPETITION.findOne({}).sort({createdAt: -1}).then((comp)=>{
        if(!comp){
            return res.status(404).json({
                success: false,
                status: "not yet"
            });
        }

        let result = {
            _id: comp._id,
            deadline: comp.deadline,
            prize: comp.prize,
            prizePic: comp.prizePic,
            numWinners: comp.numWinners,
            createdAt: comp.createdAt
        };

        res.status(200).json({
            success: true,
            competition: result
        });
    })
    .catch((err)=>{
        console.log("Error from GET /competitions/latest: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "find competition error"
        });
    });
});







// get the top users
leaderBoardRouter.get("/top", cors.cors, rateLimit, (req, res, next)=>{
    let topUsers = parseInt(process.env.TOP_USERS || config.TOP_USERS);

    // get the latest competition
    COMPETITION.findOne({}).sort({createdAt: -1})
    .then(async(comp)=>{
        let top;
        if(!comp || Date.parse(comp.deadline) < Date.now()){
            // no competition or competition is over
            // sort by absPoints
            try{
                let topDocs = await USER.find({}, {name: 1, picture: 1, absPoints: 1}).sort({absPoints: -1}).limit(topUsers);
                top = topDocs.map((user)=>{
                    return {
                        _id: user._id,
                        name: user.name,
                        picture: user.picture,
                        points: user.absPoints
                    };
                });
            }
            catch(err){
                console.log("Error from GET absPoints /competitions/top: ", err);
                return res.status(500).json({
                    success: false,
                    status: "internal server error",
                    err: "find users error"
                });
            }
        }
        else{
            // competition is running
            // sort by comPoints
            try{
                let topDocs = await USER.find({}, {name: 1, picture: 1, comPoints: 1}).sort({comPoints: -1}).limit(topUsers);
                top = topDocs.map((user)=>{
                    return {
                        _id: user._id,
                        name: user.name,
                        picture: user.picture,
                        points: user.comPoints
                    };
                });
            }
            catch(err){
                console.log("Error from GET comPoints /competitions/top: ", err);
                return res.status(500).json({
                    success: false,
                    status: "internal server error",
                    err: "find users error"
                });
            }
        }

        return res.status(200).json({
            success: true,
            users: top
        });
    })
    .catch((err)=>{
        console.log("Error from GET /competitions/top: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "find competition error"
        });
    });
});





// get the top users of the latest competition (valid until a new competition is created)
leaderBoardRouter.get("/top/latest", cors.cors, rateLimit, (req, res, next)=>{
    let topUsers = parseInt(process.env.TOP_USERS || config.TOP_USERS);
    // sort by comPoints
    USER.find({}, {name: 1, picture: 1, comPoints: 1}).sort({comPoints: -1}).limit(topUsers)
    .then((topDocs)=>{
        let top = topDocs.map((user)=>{
            return {
                _id: user._id,
                name: user.name,
                picture: user.picture,
                points: user.comPoints
            };
        });

        return res.status(200).json({
            success: true,
            users: top
        });
    })
    .catch((err)=>{
        console.log("Error from GET comPoints /competitions/top: ", err);
        return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "find users error"
        });
    }); 
});






// get my rank
leaderBoardRouter.get("/rank", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
    // get the latest competition
    COMPETITION.findOne({}).sort({createdAt: -1})
    .then(async(comp)=>{
        let result;
        let points;
        if(!comp || Date.parse(comp.deadline) < Date.now()){
            // no competition or competition is over
            // sort by absPoints
            points = req.user.absPoints;
            try{
                result = await USER.find({}).sort({absPoints: -1}).find({$or:[{absPoints: {$gt: req.user.absPoints}}, {absPoints: req.user.absPoints, _id: {$lte: req.user._id}}]}).count();
            }
            catch(err){
                console.log("Error from GET absPoints /competitions/rank: ", err);
                return res.status(500).json({
                    success: false,
                    status: "internal server error",
                    err: "find users error"
                });
            }
        }
        else{
            // competition is running
            // sort by comPoints
            points = req.user.comPoints;
            try{
                result = await USER.find({}).sort({comPoints: -1}).find({$or:[{comPoints: {$gt: req.user.comPoints}}, {comPoints: req.user.comPoints, _id: {$lte: req.user._id}}]}).count();
            }
            catch(err){
                console.log("Error from GET comPoints /competitions/rank: ", err);
                return res.status(500).json({
                    success: false,
                    status: "internal server error",
                    err: "find users error"
                });
            }
        }

        res.status(200).json({
            success: true,
            user: {
                _id: req.user._id,
                name: req.user.name,
                picture: req.user.picture,
                points: points,
                rank: result
            }
        });
    })
    .catch((err)=>{
        console.log("Error from GET /competitions/rank: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "find competition error"
        });
    })
});





module.exports = leaderBoardRouter;