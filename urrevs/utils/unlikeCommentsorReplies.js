/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

module.exports = (likeCollection, user, resourceId, resourceType)=>{
    return new Promise((resolve, reject)=>{
        likeCollection.findOneAndDelete({user: user, [resourceType]: resourceId})
        .then((resp)=>{
            if(!resp){
                return resolve(404);
            }
            return resolve(200);
        })
        .catch((error)=>{
            reject({e: error, message: "deleting the like document failed"});
        });
    });
}