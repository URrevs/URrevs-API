/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

module.exports = (resourceCollection, resourceId) => {
    return new Promise((resolve, reject) => {
        resourceCollection.findByIdAndUpdate(resourceId, {$inc: {shares:1}})
        .then((resource)=>{
            if(!resource){
                return resolve(404);
            }

            return resolve(200);
        })
        .catch((error)=>{
            return reject({e: error, message: "Error in increasing shares"});
        });
    });
}