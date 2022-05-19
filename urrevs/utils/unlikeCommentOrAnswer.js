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

                Promise.all(proms)
                .then(async (result)=>{
                    let resource = result[0];
                    if(!resource){
                        return resolve(404);
                    }

                    if(resourceType == "answer"){
                        // if the resource is answer, deduct user points
                        try{
                            await USER.findByIdAndUpdate(resource.user, {$inc: {comPoints: -parseInt(process.env.ANSWER_LIKE_POINTS || config.process.env.ANSWER_LIKE_POINTS)}});
                            return resolve(200);
                        }
                        catch(err){
                            return reject({e: err, message: "updating user points failed"});
                        }
                    }
                    else{
                        return resolve(200);
                    }
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