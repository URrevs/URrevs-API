const COMPETITION = require("../models/competition");

module.exports = ()=>{
    return new Promise((resolve, reject)=>{
        COMPETITION.findOne({}, {deadline: 1, _id: 0}).sort({createdAt: -1})
        .then((competition)=>{
            if(!competition){
                return resolve(false);
            }

            if(Date.parse(competition.deadline) > Date.now()){
                return resolve(true);
            }
            else{
                return resolve(false);
            }
        })
        .catch((err)=>{
            console.log("Error in isThereAcompetition: ", err);
            return reject(true);
        });
    })
}