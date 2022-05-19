/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

const USER = require("../models/user");
const config = require("../config");

module.exports = (resourceCollection, likeCollection, user, resourceId, resourceType)=>{
    return new Promise((resolve, reject)=>{
        likeCollection.findOneAndDelete({user: user, [resourceType]: resourceId})
        .then((resp)=>{
            if(!resp){
                return resolve(404);
            }
            else{
                let proms = [];
                proms.push(resourceCollection.findOneAndUpdate({_id: resourceId}, {$inc: {likes: -1}}))
                if(resourceType == "answer"){
                    // if the resource is answer, deduct user points
                    proms.push(USER.findByIdAndUpdate(user, {$inc: {comPoints: -parseInt(process.env.ANSWER_LIKE_POINTS || config.process.env.ANSWER_LIKE_POINTS)}}));
                }

                Promise.all(proms)
                .then(()=>{
                    return resolve(200);
                })
                .catch((error)=>{
                    return reject({e: error, message: "reverting number of likes failed"});
                });
            }
        })
        .catch((error)=>{
            reject({e: error, message: "deleting the like document failed"});
        });
    });
}