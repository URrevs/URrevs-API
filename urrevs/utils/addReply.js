/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

module.exports = (parentResourceCollection, parentResourceId, resourceTypeInParent, user, resourceContentType, resourceContent)=>{
    return new Promise((resolve, reject)=>{

        // preparing the resource
        let resource = {
            user: user,
            [resourceContentType]: resourceContent
        }

        // check if the parent resource exists and if exists, add the resource to the parent resource
        parentResourceCollection.findByIdAndUpdate(parentResourceId, {$push: {[resourceTypeInParent]: resource}}, {new: true})
        .then((parent)=>{
            if(!parent){
                return resolve(404);
            }
            else{
                return resolve(parent[resourceTypeInParent][parent[resourceTypeInParent].length-1]._id);
            }
        })
        .catch((error)=>{
            return reject({e: error, message: 'Error in finding parent resource'});
        });
    });
}