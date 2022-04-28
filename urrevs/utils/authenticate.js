/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");

const config = require("../config");

// login or signup
exports.authorize = (req) => {
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
            let token = jwt.sign({_id: decodedToken.uid}, (process.env.JWT_SECRET || config.JWT_SECRET), 
                        {expiresIn: (process.env.JWT_EXPIRES_IN || config.JWT_EXPIRES_IN)});
            return resolve(token);
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
                return reject("error");
            }
        });
    });
}


// revoke all access and refresh tokens for a certain user
exports.revoke = (firebase_uid) => {
    return new Promise((resolve, reject)=>{
        admin
        .auth()
        .revokeRefreshTokens(firebase_uid).then(()=>{
            resolve();
        })
        .catch((err)=>{
            // process error
            reject(err);
        })
    });
}
