/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

module.exports = (parentResourceCollection, parentResourceId, resourceCollection, user, parentResourceType, resourceContentType, resourceContent, resourceTypeS)=>{
    return new Promise((resolve, reject)=>{
        
        // check if the parent resource exists
        parentResourceCollection.findOne({_id: parentResourceId, hidden: false}, {$inc: {[`${resourceTypeS}Count`]: 1}})
        .then((parentResource)=>{
            if(!parentResource){
                return resolve(404);
            }

            // create the resource document
            resourceCollection.create({
                user: user,
                [parentResourceType]: parentResource._id,
                [resourceContentType]: resourceContent
            }).
            then((resource)=>{
                return resolve(resource._id);
            })
            .catch((error)=>{
                return reject({e: error, message: 'Error in creating resource'});
            });
        })
        .catch((error)=>{
            return reject({e: error, message: 'Error in finding parent resource'});
        });
    });
}