/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

// Works for "I don't like this", "see more", "full screen"

const config = require("../config");

module.exports = (constantCollection, trackerCollection, resourceCollection, resourceId, user, resourceType)=>{
    return new Promise((resolve, reject)=>{
        let proms = [];
        proms.push(resourceCollection.findById(resourceId, {_id: 1}));
        proms.push(constantCollection.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
        Promise.all(proms).then((results)=>{
            let resource = results[0];
            let lastQuery = results[1].date;

            if(!resource){
                return resolve(404);
            }

            if(!lastQuery){
                lastQuery = process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT;
            }

            trackerCollection.findOne({user: user, [resourceType]: resource._id, createdAt: {$gte: lastQuery}}, 
                {_id: 1})
            .then((tracker)=>{
                if(tracker){
                    return resolve(403);
                }

                // create new tracker
                trackerCollection.create({
                    user: user,
                    [resourceType]: resource._id
                }).then((t)=>{
                    return resolve(200);
                })
                .catch((error)=>{
                    return reject({e: error, message: "Error in creating tracker"});
                });
            })
            .catch((error)=>{
                return reject({e: error, message: "Error in finding the tracker"});
            });
        })
        .catch((error)=>{
            return reject({e: error, message: "Error in finding resource"});
        });
    });
}