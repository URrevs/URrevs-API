/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

module.exports = (resourceCollection, user, resourceId, likeCollection, resourceType)=>{
    return new Promise((resolve, reject)=>{
        // check if the comment exists and not made by the user
        resourceCollection.findOne({_id: resourceId, user: {$ne: user}}, {_id: 1}).then((resource)=>{
            if(!resource){
                return resolve(404);
            }

            // check if the user has already liked the resource
            likeCollection.findOne({user: user, [resourceType]: resourceId}, {_id: 1})
            .then((like)=>{
                if(like){
                    return resolve(403);
                }

                // create the like
                likeCollection.create({user: user, [resourceType]: resourceId})
                .then((l)=>{
                    return resolve(200);
                })
                .catch((error)=>{
                    return reject({e: error, message: "creating the like document failed"});
                });
            })
            .catch((error)=>{
                reject({e: error, message: "finding the like document failed"});
            });
        })
        .catch((error)=>{
            reject({e: error, message: "finding the resource failed"});
        });
    });
}