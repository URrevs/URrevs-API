/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

const config = require("../config");
const USER = require("../models/user");

const isThereAcompetition = require("../utils/isThereAcompetition");

module.exports = (resourceCollection, user, resourceId, likeCollection, resourceType)=>{
    return new Promise((resolve, reject)=>{

        // check if the user has already liked the resource
        likeCollection.findOne({user: user, [resourceType]: resourceId}, {_id: 1})
        .then((like)=>{
            if(like){
                return resolve(403);
            }

            // check resource existence + increment the likes by 1
            resourceCollection.findOne({_id: resourceId, hidden: false}, {user: 1, likes: 1})
            .then(async(resoruce)=>{
                if(!resoruce){
                    return resolve(404);
                }

                if(resoruce.user.equals(user)){
                    return reject(403);
                }

                resoruce.likes = resoruce.likes + 1;

                let proms = [];
                // create the like
                proms.push(likeCollection.create({user: user, [resourceType]: resourceId}));
                proms.push(resoruce.save());
                
                if(resourceType == "answer"){
                    // check if there is a currently running competition or not
                    let isCompetition = false;
                    try{
                    isCompetition = await isThereAcompetition();
                    }
                    catch(result){
                    isCompetition = result;
                    }
                    // if the resource is answer, give the answer author points
                    proms.push(USER.findByIdAndUpdate(resoruce.user, {$inc: {comPoints: (isCompetition)?parseInt(process.env.ANSWER_LIKE_POINTS || config.ANSWER_LIKE_POINTS):0, absPoints: parseInt(process.env.ANSWER_LIKE_POINTS || config.ANSWER_LIKE_POINTS)}}))
                }
                
                Promise.all(proms)
                .then((l)=>{
                    return resolve(200);
                })
                .catch((error)=>{
                    return reject({e: error, message: "creating the like document failed"});
                });
            })
            .catch((error)=>{
                return reject({e: error, message: "finding and the resource failed"});
            });
        })
        .catch((error)=>{
            return reject({e: error, message: "finding the like document failed"});
        });
    });
}