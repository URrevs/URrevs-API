/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

module.exports = (parentResourceCollection, parentResourceId, resourceTypeInParent, resourceId, user, likeCollection, resourceType)=>{
    return new Promise((resolve, reject)=>{
        
        let idInParent = resourceTypeInParent + "._id";
        let userInParent = resourceTypeInParent + ".user";

        // check if the user has already liked the resource
        likeCollection.findOne({user: user, [resourceType]: resourceId}, {_id: 1})
        .then((like)=>{
            if(like){
                return resolve(403);
            }

            // check resource existence + increment the likes by 1
            parentResourceCollection.findOneAndUpdate({_id: parentResourceId, [idInParent]: resourceId, [userInParent]: {$ne: user}}, 
            {$inc: {[resourceTypeInParent+".$.likes"]: 1}})
            .then((resoruce)=>{
                if(!resoruce){
                    return resolve(404);
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
                return reject({e: error, message: "finding and the resource failed"});
            });
        })
        .catch((error)=>{
            return reject({e: error, message: "finding the like document failed"});
        });
    });
}