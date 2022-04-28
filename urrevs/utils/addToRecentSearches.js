/*
  Author: Abdelrahman Hany
  Created on: 28-Apr-2022
*/

module.exports = (typeCollection, id, type, onModel, u) => {
    return new Promise((resolve, reject) => {
        typeCollection.findOne({_id: id}).then((item)=>{
            if(item){
                u.recentSearches.unshift({
                    _id: id,
                    type: type,
                    onModel: onModel
                  });
                  if(u.recentSearches.length > 5){
                    u.recentSearches.pop();
                  }
                  u.save().then((u)=>{
                    return resolve();
                  })
                  .catch((err)=>{
                    return reject(err);
                  });
            }
            else{
              return reject(404);
            }
          })
          .catch((err)=>{
            return reject(err);
          });
    });
}