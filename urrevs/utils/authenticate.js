/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");

const config = require("../config");

const USER = require("../models/user");


const getTheRefCodeOfLatestUser = () => {
    return new Promise((resolve, reject)=>{
        USER.find({}, {_id: 0, refCode: 1}).sort({_id: -1}).then((user)=>{
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
            USER.findOne({firebaseId: decodedToken.uid}).then((user)=>{
                if(user){
                    // user exists
                    // isssue a jwt token
                    let token = jwt.sign({_id: user._id}, secretKey, {expiresIn: expiresIn});
                    return resolve(token);
                }
                else{
                    // user does not exist
                    // create a new user, then issue a jwt token
                    // get the refCode of the latest user
                    getTheRefCodeOfLatestUser().then((latestUser)=>{
                        USER.create({
                            firebaseId: decodedToken.uid,
                            name: decodedToken.name,
                            picture: decodedToken.picture,
                            refCode: "UR" + ((latestUser.length > 0)?(parseInt(latestUser[0].refCode.slice(2))+1):1),
                        }).then((newUser)=>{
                            let token = jwt.sign({_id: newUser._id}, secretKey, {expiresIn: expiresIn});
                            return resolve(token);
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
exports.revoke = (id) => {
    return new Promise((resolve, reject)=>{
        USER.findById(id).then((user)=>{
            if(user){
                admin
                    .auth()
                    .revokeRefreshTokens(user.firebaseId)
                    .then(()=>{
                        return resolve();
                    })
                    .catch((err)=>{
                        return reject(err);
                    });
            }
            else{
                return reject("not found");
            }
        })
        .catch((err)=>{
            return reject(err);
        });
    });
}
