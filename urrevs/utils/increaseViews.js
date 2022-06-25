/*
  Author: Abdelrahman Hany
  Created on: 5-May-2022
*/

const USER = require("../models/user");

module.exports = (resourceCollection, resourceId, review=false) => {
    return new Promise((resolve, reject) => {
        resourceCollection.findByIdAndUpdate(resourceId, {$inc: {views:1}})
        .then(async(resource)=>{
            if(!resource){
                return resolve(404);
            }

            if(review){
                try{
                    await USER.findByIdAndUpdate(resource.user, {$inc: {totalViews:1}});
                    return resolve(200);
                }
                catch(err){
                    console.log("Error in increasing total views for user using increase views: ", err);
                    return resolve(200);
                }
            }
            else{
                return resolve(200);
            }
        })
        .catch((error)=>{
            return reject({e: error, message: "Error in increasing views"});
        });
    });
}