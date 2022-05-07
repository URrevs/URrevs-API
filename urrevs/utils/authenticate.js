/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");

const config = require("../config");

const USER = require("../models/user");
const UPRODUCTS = require("../models/uproducts");


const getTheRefCodeOfLatestUser = () => {
    return new Promise((resolve, reject)=>{
        USER.find({}, {_id: 0, refCode: 1}).sort({_id: -1}).limit(1).then((user)=>{
            return resolve(user);
        })
        .catch((err)=>{
            return reject(err);
        })
    })
}

// login or signup
exports.authorize = (req) => {
    let secretKey = (process.env.JWT_SECRET || config.JWT_SECRET);
    let expiresIn = (process.env.JWT_EXPIRES_IN || config.JWT_EXPIRES_IN);
    return new Promise((resolve, reject)=>{
            // checking if there is a token
    let idToken;
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
    ) {
        idToken = req.headers.authorization.split("Bearer ")[1];
    } else {
        return reject("invalid");
    }

    let checkRevoked = true;
    admin
        .auth()
        .verifyIdToken(idToken, checkRevoked)
        .then((decodedToken) => {
            // user is authenticated
            // checking if user exists
            let n = decodedToken.name;
            let p = decodedToken.picture;
            let u = decodedToken.uid;
            USER.findOneAndUpdate({uid: u}, {$set: {picture: p, name: n}}).then((user)=>{
                if(user){
                    // user exists
                    // isssue a jwt token
                    let token = jwt.sign({_id: user._id}, secretKey, {expiresIn: expiresIn});
                    return resolve({t: token, a: user.admin});
                }
                else{
                    // user does not exist
                    // create a new user, then issue a jwt token
                    // get the refCode of the latest user
                    getTheRefCodeOfLatestUser().then((latestUser)=>{
                        USER.create({
                            uid: u,
                            name: n,
                            picture: p,
                            refCode: "UR" + ((latestUser.length > 0)?(parseInt(latestUser[0].refCode.slice(2))+1):1),
                        }).then((newUser)=>{
                            UPRODUCTS.create({_id: newUser._id}).then(()=>{
                                let token = jwt.sign({_id: newUser._id}, secretKey, {expiresIn: expiresIn});
                                return resolve({t: token, a: newUser.admin});
                            })
                            .catch((err)=>{
                                USER.findByIdAndDelete(newUser._id).then(()=>{
                                    return reject(err);
                                })
                                .catch((err2)=>{
                                    return reject(err2);
                                });
                            });
                        })
                        .catch((err)=>{
                            return reject(err);
                        })
                    })
                    .catch((err)=>{
                        return reject(err);
                    })
                }
            })
            .catch((err)=>{
                return reject(err);
            });
        })
        .catch((err) => {
            // token is expired
            if (err.code === "auth/id-token-expired") {
                return reject("expired");
            }
            else if(err.code === "auth/id-token-revoked"){
                // token is revoked
                return reject("revoked");
            }
            else{
                // process error
                return reject(err);
            }
        });
    });
}


// revoke all access and refresh tokens for a certain user
exports.revoke = (uid) => {
    return new Promise((resolve, reject)=>{
        admin
            .auth()
            .revokeRefreshTokens(uid)
            .then(()=>{
                return resolve();
            })
            .catch((err)=>{
                return reject(err);
            });
    });
}

//--------------------------------------------------------------------------------------

// Middlewars

// proceed only if the user is authenticated
exports.verifyUser = (req, res, next)=>{
    let secretKey = (process.env.JWT_SECRET || config.JWT_SECRET);
    if(req.headers.authorization && req.headers.authorization.startsWith("bearer ")){
        try{
            let token = req.headers.authorization.split("bearer ")[1];
            let decoded = jwt.verify(token, secretKey);
            USER.findById(decoded._id, {admin: 1, uid: 1}).then((user)=>{
                if(user){
                    req.user = {_id: user._id, admin: user.admin, uid: user.uid};
                    return next();
                }
                else{
                    res.statusCode = 401;
                    res.setHeader("Content-Type", "application/json");
                    res.json({success: false, status: "you do not exist in the system"});
                }
            })
            .catch((err)=>{
                console.log("Error from verifyUser: ", err);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.json({success: false, status: "process failed"});
            });
        }
        catch(err){
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "invalid token"});
        }
    }
    else{
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "invalid token"});
    }
}


// proceed only if the user is an admin (requires verifyUser)
exports.verifyAdmin = (req, res, next)=>{
    if(req.user && req.user.admin){
        return next();
    }
    else{
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.json({success: false, status: "you are not an admin"});
    }
};


// proceed anyways, but add the user (if exists) to the request via req.user
exports.verifyFlexible = (req, res, next)=>{
    let secretKey = (process.env.JWT_SECRET || config.JWT_SECRET);
    if(req.headers.authorization && req.headers.authorization.startsWith("bearer ")){
        try{
            let token = req.headers.authorization.split("bearer ")[1];
            let decoded = jwt.verify(token, secretKey);
            USER.findById(decoded._id, {admin: 1}).then((user)=>{
                if(user){
                    req.user = {_id: user._id};
                    return next();
                }
                else{
                    res.statusCode = 401;
                    res.setHeader("Content-Type", "application/json");
                    res.json({success: false, status: "you do not exist in the system"});
                }
            })
            .catch((err)=>{
                console.log("Error from verifyUser: ", err);
                res.statusCode = 500;
                res.setHeader("Content-Type", "application/json");
                res.json({success: false, status: "process failed"});
            });
        }
        catch(err){
            res.statusCode = 401;
            res.setHeader("Content-Type", "application/json");
            res.json({success: false, status: "invalid token"});
        }
    }
    else{
        req.user = null;
        return next();
    }
}



exports.verifyAPIkey = (apiKeyHeader)=>{
    return (req, res, next)=>{
        if(req.header(apiKeyHeader) === (process.env.API_KEY_AI || config.API_KEY_AI)){
            return next();
        }
        else{
            return res.status(401).json({success: false, status: "invalid API key"});
        }
    }
}