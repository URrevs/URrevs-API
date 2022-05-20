/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

// Works for "I don't like this", "see more", "full screen"

const config = require("../config");

module.exports = (trackerCollection, resourceCollection, resourceId, user, resourceType)=>{
    return new Promise((resolve, reject)=>{
        resourceCollection.findById(resourceId, {_id: 1})
        .then((resource)=>{
            if(!resource){
                return resolve(404);
            }

            trackerCollection.findOneAndUpdate({user: user, [resourceType]: resource._id}, {$inc: {times: 1}}, {upsert: true})
            .then(()=>{
                return resolve(200);
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