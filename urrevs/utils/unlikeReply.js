/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

module.exports = (parentResourceCollection, parentResourceId, resourceTypeInParent, likeCollection, user, resourceId, resourceType)=>{
    return new Promise((resolve, reject)=>{
        likeCollection.findOneAndDelete({user: user, [resourceType]: resourceId})
        .then((resp)=>{
            if(!resp){
                return resolve(404);
            }
            else{
                parentResourceCollection.findOneAndUpdate({_id: parentResourceId, [resourceTypeInParent+"._id"]: resourceId}, {$inc: {[resourceTypeInParent+".$.likes"]: -1}})
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