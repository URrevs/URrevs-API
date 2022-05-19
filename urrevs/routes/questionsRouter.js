/*
  Author: Abdelrahman Hany
  Created on: 18-May-2022
*/

const express = require("express");
const questionRouter = express.Router();

const cors = require("../utils/cors");
const rateLimit = require("../utils/rateLimit/regular");
const authenticate = require("../utils/authenticate");
const addReply = require("../utils/addReply");
const likeAnswer = require("../utils/likeCommentOrAnswer");
const unlikeAnswer = require("../utils/unlikeCommentOrAnswer");
const likeReply = require("../utils/likeReply");
const unlikeReply = require("../utils/unlikeReply");

const USER = require("../models/user");
const PHONE = require("../models/phone");
const COMPANY = require("../models/company");
const PQUES = require("../models/phoneQuestion");
const PANS = require("../models/phoneAnswer");
const CQUES = require("../models/companyQuestion");
const CANS = require("../models/companyAnswer");
const PHONE_QUES_LIKES = require("../models/phoneQuesLike");
const PHONE_QUES_UNLIKES = require("../models/phoneQuesUnlike");
const COMPANY_QUES_LIKES = require("../models/companyQuesLike");
const COMPANY_QUES_UNLIKES = require("../models/companyQuesUnlike");
const CONSTANT = require("../models/constants");
const OWNED_PHONE = require("../models/ownedPhone");
const PQUES_ANSWERS_LIKES = require("../models/phoneQuesAnswersLikes");
const CQUES_ANSWERS_LIKES = require("../models/companyQuesAnsLikes");
const PQUES_REPLIES_LIKES = require("../models/phoneQuestionRepliesLike");
const CQUES_REPLIES_LIKES = require("../models/companyQuestionRepliesLike");

const config = require("../config");



// preflight
questionRouter.options("*", cors.cors, (req, res, next)=>{
    res.sendStatus(200);
});


// add a phone question
/*
  steps:
    1- extract body
    2- check if the content is not empty or only spaces
    3- check if the phone exists
    4- create question
    5- return the question as a response
*/
questionRouter.post("/phone", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  let {phone, content} = req.body;

  if(!phone || !content){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  if(!typeof(content) === "string"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  if(content.trim() == ""){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  PHONE.findOne({_id: phone}, {name: 1}).then((phone)=>{
    if(!phone){
      return res.status(404).json({
        success: false,
        status: "phone not found"
      })
    }

    // create the question
    PQUES.create({
      user: req.user._id,
      phone: phone._id,
      content: content
    })
    .then((q)=>{
      let question = {
        _id: q._id,
        type: "phone",
        userId: q.user,
        userName: req.user.name,
        picture: req.user.picture,
        createdAt: q.createdAt,
        phoneId: q.phone,
        phoneName: phone.name,
        content: q.content,
        upvotes: q.upvotes,
        ansCount: q.ansCount,
        shareCount: q.shareCount
      }

      return res.status(200).json({
        success: true,
        question: question
      });
    })
    .catch((err)=>{
      console.log("Error from /questions/phone: ", err);
      return res.status(500).json({
        success: false,
        status: "internal server error",
        err: "creating the question failed"
      })
    })
  })
  .catch((err)=>{
    console.log("Error from /questions/phone: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "finding the phone failed"
    })
  })
});






// add a company question
/*
  steps:
    1- extract body
    2- check if the content is not empty or only spaces
    3- check if the company exists
    4- create question
    5- return the question as a response
*/
questionRouter.post("/company", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  let {company, content} = req.body;

  if(!company || !content){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  if(!typeof(content) === "string"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  if(content.trim() == ""){
    return res.status(400).json({
      success: false,
      status: "bad request"
    })
  }

  COMPANY.findOne({_id: company}, {name: 1}).then((company)=>{
    if(!company){
      return res.status(404).json({
        success: false,
        status: "company not found"
      })
    }

    // create the question
    CQUES.create({
      user: req.user._id,
      company: company._id,
      content: content
    })
    .then((q)=>{
      let question = {
        _id: q._id,
        type: "company",
        userId: q.user,
        userName: req.user.name,
        picture: req.user.picture,
        createdAt: q.createdAt,
        companyId: q.company,
        companyName: company.name,
        content: q.content,
        upvotes: q.upvotes,
        ansCount: q.ansCount,
        shareCount: q.shareCount
      }

      return res.status(200).json({
        success: true,
        question: question
      });
    })
    .catch((err)=>{
      console.log("Error from /questions/company: ", err);
      return res.status(500).json({
        success: false,
        status: "internal server error",
        err: "creating the question failed"
      })
    })
  })
  .catch((err)=>{
    console.log("Error from /questions/company: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "finding the company failed"
    })
  })
});





// add a phone question answer
/* 
  steps:
    1- extract the request body
    2- check if the content is string and not empty nor only spaces
    3- check if thr user owns the phone which the question is about
    4- check if the question exists and increase its ansCount
    5- create the answer
*/
questionRouter.post("/phone/:quesId/answers", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  
  let {content, phoneId} = req.body;

  if(!content || !phoneId){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(typeof(content) != "string"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(content.trim() == ""){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  OWNED_PHONE.findOne({user: req.user._id, phone: phoneId}, {ownedAt: 1, _id: 0})
  .then((own)=>{
    if(!own){
      return res.status(403).json({
        success: false,
        status: "not owned"
      });
    }

    PQUES.findOneAndUpdate({_id: req.params.quesId, phone: phoneId}, {$inc: {ansCount: 1}})
    .then((question)=>{
      if(!question){
        return res.status(404).json({
          success: false,
          status: "question not found"
        })
      }

      PANS.create({
        user: req.user._id,
        question: question._id,
        content: content,
        ownedAt: own.ownedAt
      })
      .then((answer)=>{
        return res.status(200).json({
          success: true,
          answer: answer._id,
          ownedAt: own.ownedAt
        })
      })
      .catch((err)=>{
        console.log("Error from POST /questions/phone/answers: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "creating the answer failed"
        });
      });
    })
    .catch((err)=>{
      console.log("Error from POST /questions/phone/answers: ", err);
      return res.status(500).json({
        success: false,
        status: "internal server error",
        err: "finding the question failed"
      });
    });
  })
  .catch((err)=>{
    console.log("Error from POST /questions/phone/answers: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "finding the ownership failed"
    })
  });
});





// add reply to phone question answer
/*
  steps:
    1- extract the request body
    2- check if the content is string and not empty nor only spaces
    3- call add reply
*/
questionRouter.post("/phone/answers/:ansId/replies", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  
  let content = req.body.content;

  if(!content){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(typeof(content) != "string"){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  if(content.trim() == ""){
    return res.status(400).json({
      success: false,
      status: "bad request"
    });
  }

  addReply(PANS, req.params.ansId, "replies", req.user._id, "content", content)
  .then((replyId)=>{
    if(replyId == 404){
      return res.status(404).json({
        success: false,
        status: "answer not found"
      });
    }

    return res.status(200).json({
      success: true,
      reply: replyId
    });
  })
  .catch((err)=>{
    console.log("Error from POST /questions/phone/answers/:ansId/replies: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  })
});




// like a phone question answer
questionRouter.post("/phone/answers/:ansId/like", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  likeAnswer(PANS, req.user._id, req.params.ansId, PQUES_ANSWERS_LIKES, "answer")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true,
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "answer not found or you own it"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "already liked"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /questions/phone/answers/:ansId/like: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
})



// unlike a phone answer
questionRouter.post("/phone/answers/:ansId/unlike", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  unlikeAnswer(PANS, PQUES_ANSWERS_LIKES, req.user._id, req.params.ansId, "answer")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/company/comments/:commentId/unlike: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});



// like a phone question answer reply
questionRouter.post("/phone/answers/:ansId/replies/:replyId/like", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  likeReply(PANS, req.params.ansId, "replies", req.params.replyId, req.user._id, PQUES_REPLIES_LIKES, "reply")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true,
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "reply not found or you own it"
      });
    }
    else if(result == 403){
      return res.status(403).json({
        success: false,
        status: "already liked"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /questions/phone/answers/:ansId/replies/:replyId/like: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
})



// unlike a phone question answer reply
questionRouter.post("/phone/answers/:ansId/replies/:replyId/unlike", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  unlikeReply(PANS, req.params.ansId, "replies", PQUES_REPLIES_LIKES, req.user._id, req.params.replyId, "reply")
  .then((result)=>{
    if(result == 200){
      return res.status(200).json({
        success: true
      });
    }
    else if(result == 404){
      return res.status(404).json({
        success: false,
        status: "not found"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /reviews/phone/comments/:commentId/unlike: ", err.e);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: err.message
    });
  });
});





// mark an answer as accepted for phone question
/*
  steps:
    1- extract the request body (questionId, answerId)
    2-  check if both exist, 
        the request owner is the author of question, 
        the answer belongs to this question
    3- check if the question doesn't already have the answer as accepted 
    4- if the question doesn't have an accepted answer, 
          add the answerId as an accepted answer
          if there is a document indicating that the question has got its accepted answer removed, 
              delete it
              create a document that implies that this question got its accepted answer changed
          if there is not a document indicating that the question has got its accepted answer removed,
              create a document indicating that this question got an accepted answer
          give points to the answer author
    5- if the question has already another accepted answer,
          replace the old accepted answer with the new accepted answer
          if there isn't a document indicating that this question got an accepted answer in this time slot,
              check if there is a document indicating that the question has its accepted answer changed
                if not,  create a document indicating that the question has its accepted answer changed
          deduct points from the author of the old answer and give points to the author of the new answer
*/














// unmark an answer from being accepted for a phone question
/*
  steps:
    1- extract the request body (questionId, answerId)
    2-  check if both exist, 
        the request owner is the author of question, 
        the answer belongs to this question
    3- check if the question has already this answer as an accepted answer
    4- remove this answer from being accepted for this question
    5- deduct points from the author of the answer
    6- if there is a document indicating that the question got an accepted answer, remove it then return
    7- if there is a document indicating that the question has its accepted answer changed, remove it then return
    8- otherwise, create a document indicating that the question has its accepted answer removed then return
*/










// get a certain phone question
questionRouter.get("/phone/:quesId", cors.cors, rateLimit, authenticate.verifyFlexible, (req, res, next)=>{
  
  PQUES.findById(req.params.quesId).populate("phone", {name: 1})
  .then(async(question)=>{

    if(!question){
      return res.status(404).json({
        success: false,
        status: "question not found"
      });
    }

    let acceptedAns_ = null
    let repliesObj = {};
    let repliesIds = [];
    if(question.acceptedAns){
      try{
        let acceptedAnsDoc_ = await PANS.findById(question.acceptedAns).populate("user", {name: 1, picture: 1}).populate("replies.user", {name: 1, picture: 1});
        if(acceptedAnsDoc_){
          let answer_replies = [];
          
          for(let [index, reply] of acceptedAnsDoc_.replies.entries()){
            repliesObj[reply._id] = index;

            repliesIds.push(reply._id);

            answer_replies.push({
              _id: reply._id,
              userId: reply.user._id,
              userName: reply.user.name,
              picture: reply.user.picture,
              content: reply.content,
              likes: reply.likes,
              liked: false,
              createdAt: reply.createdAt
            });
          }

          acceptedAns_ = {
            _id: acceptedAnsDoc_.id,
            userId: acceptedAnsDoc_.user._id,
            userName: acceptedAnsDoc_.user.name,
            picture: acceptedAnsDoc_.user.picture,
            content: acceptedAnsDoc_.content,
            upvotes: acceptedAnsDoc_.likes,
            createdAt: acceptedAnsDoc_.createdAt,
            ownedAt: acceptedAnsDoc_.ownedAt,
            upvoted: false,
            replies: answer_replies
          }
        }
      }
      catch(err){
        console.log("Error from GET /questions/phone/:quesId: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "finding the acceptedAnswer failed"
        });
      }
    }

    let result = {
      _id: question._id,
      type: "phone",
      userId: question.user._id,
      userName: question.user.name,
      picture: question.user.picture,
      createdAt: question.createdAt,
      targetId: question.phone._id,
      targetName: question.phone.name,
      content: question.content,
      upvotes: question.upvotes,
      ansCount: question.ansCount,
      shares: question.shareCount,
      upvoted: false,
      acceptedAns: acceptedAns_
    };


    if(req.user){
      // check liked state
      let proms = [];
      proms.push(PHONE_QUES_LIKES.findOne({user: req.user._id, question: question._id}));
      proms.push(PQUES_ANSWERS_LIKES.findOne({user: req.user._id, answer: question.acceptedAns}));
      proms.push(PQUES_REPLIES_LIKES.find({user: req.user._id, reply: {$in: repliesIds}}));
      Promise.all(proms)
      .then((likes)=>{
        let quesLike = likes[0];
        let ansLike = likes[1];
        let replyLikes = likes[2];

        if(quesLike){
          result.upvoted = true;
        }

        if(ansLike){
          result.acceptedAns.upvoted = true;
        }

        for(let like of replyLikes){
          let id = like.reply;
          result.acceptedAns.replies[repliesObj[id]].liked = true;
        }

        return res.status(200).json({
          success: true,
          question: result
        });
      })
      .catch((err)=>{
        console.log("Error from GET /questions/phone/:quesId: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "finding the likes failed"
        });
      });
    }
    else{
      return res.status(200).json({
        success: true,
        question: result
      });
    }


  })
  .catch((err)=>{
    console.log("Error from GET /questions/phone/:quesId: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "finding the question failed"
    });
  })
});

















// likes and unlikes
/*
  Initially, the user didn't like the question before.
    1- the user likes the question ---> a new like document is created
    2- the user unlikes the question ---> the like document is updated
    3- the user likes the question again ---> the like document is updated
    4- the user unlikes the question again ---> an error is returned
  After one day
    1- the user unlikes the question ---> the like document is updated and a new unlike document is created
    2- the user likes the question ---> the like document is updated and the unlike document is deleted
    3- the user unlikes the question ---> the like document is updated and the unlike document is created
  After one day
    1- the user likes the question ---> the like document is updated
    2- the user unlikes the question ---> the like document is updated and a new unlike document is created
    3- the user likes the question ---> the like document is updated and the unlike document is deleted
*/

// like a phone question
/*
  steps:
    1- check if the user already liked the question
    2- if the user already liked the question, return an error
    3- if the user has liked the question any time in the past:
      3.1- check if the unliked state of the like document is false, if it is true, return error
      3.2- check if the question in not made by the user
      3.3- increase the number of likes by 1 for that question
      3.4- get the date of the latest query
      3.5- if the updatedAt for the like document is older than or equal to the date of the latest query, delete any unlike document for this user on this question later than the date of the latest query
      3.6- modify the unliked state of the like document to false indicating that the user has liked the question
      3.7- give points to the question author
    4- if the user didn't like the question before:
      4.1- check if the question in not made by the user
      4.2- increase the number of likes by 1 for that question
      4.3- create a new like document
      4.4- give points to the question author
*/
questionRouter.post("/phone/:quesId/like", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{

  // checking if the user already liked the question
  PHONE_QUES_LIKES.findOne({user: req.user._id, question: req.params.quesId}).then((like)=>{
    if(like){
      if(like.unliked == false){
        return res.status(403).json({
          success: false,
          status: "already liked"
        });
      }

      let proms1 = [];
      // increasing number of upvotes for the question - getting the date of the last query
      proms1.push(PQUES.findOneAndUpdate({_id: req.params.quesId, user: {$ne: req.user._id}}, {$inc: {upvotes: 1}}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      Promise.all(proms1).then((results)=>{
        let ques = results[0];
        let lastQueryDoc = results[1];
        let lastQuery;

        if(!ques){
          return res.status(404).json({
            success: false,
            status: "question not found or you own it"
          });
        }

        if(!lastQueryDoc){
          lastQuery = new Date((process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT));
        }
        else{
          lastQuery = lastQueryDoc.date;
        }

        let proms2 = [];
        // if the updatedAt of the like document is newer than the last query, delete the unlike document that is created later than the date of the last query
        if(like.updatedAt >= lastQuery){
          proms2.push(PHONE_QUES_UNLIKES.findOneAndRemove({user: req.user._id, question: req.params.quesId, createdAt: {$gte: lastQuery}}));
        }
        // updating the like document to have the unliked = false
        proms2.push(PHONE_QUES_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: false}}));
        // giving points to the user
        proms2.push(USER.findOneAndUpdate({_id: ques.user}, {$inc: {comPoints: parseInt((process.env.QUES_LIKE_POINTS|| config.QUES_LIKE_POINTS))}}));
        Promise.all(proms2).then((result2)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from /question/phone/:quesId/like: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Updating the like or giving points to user failed"
          });
        });

      })
      .catch((err)=>{
        console.log("Error from /phone/:quesId/like: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the question or acquiring the date of last query failed"
        });
      });
    }
    else{
      // creating the like
      // create the like document - give points to the question author
      PQUES.findOneAndUpdate({_id: req.params.quesId, user: {$ne: req.user._id}}, {$inc: {upvotes: 1}})
      .then((ques)=>{
        if(!ques){
          return res.status(404).json({
            success: false,
            status: "question not found or you own it"
          });
        }

        let proms = [];
        proms.push(PHONE_QUES_LIKES.create({user: req.user._id, question: req.params.quesId}));
        proms.push(USER.findOneAndUpdate({_id: ques.user}, {$inc: {comPoints: parseInt((process.env.QUES_LIKE_POINTS|| config.QUES_LIKE_POINTS))}}))
        
        Promise.all(proms).then((result3)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from POST /questions/phone/:quesId/like: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Giving points to the question author or creating the like document failed"
          });
        });
      })
      .catch((err)=>{
        console.log("Error from /phone/:quesId/like: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the question failed"
        });
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /questions/phone/:quesId/like: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the like failed"
    });
  });
});






// unlike a phone question
/* 
  steps:
    1- get the question
    2- check if the question exists and is not made by the user
    3- check if the likes count for the question is greater than 0
    4- get the like document for this user on this question
    5- if the like document doesn't exist, return an error indicating that the user didn't like the question before
    6- if the like document exists:
      6.1- if the unliked state is true, return an error indicating that the user has already unliked the question
      6.2- get the date of the last query
      6.3- decrease the number of likes for this question by 1
      6.4- check if the question exists and is not made by the user
      6.5- check if the likes count for the question is greater than or equals to 0. if this is not fulfilled, increase the likes count for the question by 1, then return an error indicating that there are no likes for the question
      6.6- if((like.createdAt < lastQuery && like.updatedAt < lastQuery) || 
        (like.updatedAt > lastQuery && like.createdAt < lastQuery)) {create a new unlike document}
      6.7- modify the like document to have the unliked = true
      6.8- remove points from the user
*/
questionRouter.post("/phone/:quesId/unlike", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  let proms = [];
  proms.push(PHONE_QUES_LIKES.findOne({user: req.user._id, question: req.params.quesId}));
  proms.push(PQUES.findOne({_id: req.params.quesId, user: {$ne: req.user._id}}));
  
  Promise.all(proms).then((firstResults)=>{
    let like = firstResults[0];
    let ques = firstResults[1];

    if(!ques){
      return res.status(404).json({
        success: false,
        status: "question not found or you own it"
      });
    }
    
    if(ques.upvotes <= 0){
      return res.status(403).json({
        success: false,
        status: "no likes"
      });
    }

    if(like){
      if(like.unliked == true){
        return res.status(403).json({
          success: false,
          status: "already unliked"
        });
      }

      let proms1 = [];
      // decreasing number of likes for the question - getting the date of the last query
      proms1.push(PQUES.findOneAndUpdate({_id: req.params.quesId, user: {$ne: req.user._id}}, {$inc: {upvotes: -1}}, {new: true}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      
      Promise.all(proms1).then(async(results)=>{
        let ques = results[0];
        let lastQueryDoc = results[1];
        let lastQuery;

        if(!ques){
          return res.status(404).json({
            success: false,
            status: "question not found or you own it"
          });
        }

        if(ques.upvotes < 0){
          try{
            await PQUES.findOneAndUpdate({_id: req.params.quesId, user: {$ne: req.user._id}}, {$inc: {upvotes: 1}});
            return res.status(403).json({
              success: false,
              status: "no likes"
            });
          }
          catch(err){
            console.log("Error from /question/phone/:quesId/unlike: ", err);
            return res.status(500).json({
              success: false,
              status: "internal server error",
              err: "queserting number of likes for the question failed"
            });
          }
        }

        if(!lastQueryDoc){
          lastQuery = new Date((process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT));
        }
        else{
          lastQuery = lastQueryDoc.date;
        }

        let proms = [];
        // modify the like to be unliked - remove points from the question author - create an unlike document
        if((like.createdAt < lastQuery && like.updatedAt < lastQuery) || 
        (like.updatedAt > lastQuery && like.createdAt < lastQuery)){
          proms.push(PHONE_QUES_UNLIKES.create({user: req.user._id, question: req.params.quesId}));
        }
        proms.push(PHONE_QUES_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: true}}));
        proms.push(USER.findOneAndUpdate({_id: ques.user}, {$inc: {comPoints: -parseInt((process.env.QUES_LIKE_POINTS|| config.QUES_LIKE_POINTS))}}));
      
        Promise.all(proms).then((result)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from /question/phone/:quesId/unlike: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Updating the like or giving points to user failed or creating the unlike document failed"
          });
        });
      })
      .catch((err)=>{
        console.log("Error from /question/phone/:quesId/unlike: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the question or acquiring the date of last query failed"
        });
      });
    }
    else{
      return res.status(403).json({
        success: false,
        status: "you didn't like this question"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /questions/phone/:quesId/unlike: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the like or the question failed"
    });
  });
});







// like a company question
/*
  steps:
    1- check if the user already liked the question
    2- if the user already liked the question, return an error
    3- if the user has liked the question any time in the past:
      3.1- check if the unliked state of the like document is false, if it is true, return error
      3.2- check if the question in not made by the user
      3.3- increase the number of likes by 1 for that question
      3.4- get the date of the latest query
      3.5- if the updatedAt for the like document is older than or equal to the date of the latest query, delete any unlike document for this user on this question later than the date of the latest query
      3.6- modify the unliked state of the like document to false indicating that the user has liked the question
      3.7- give points to the question author
    4- if the user didn't like the question before:
      4.1- check if the question in not made by the user
      4.2- increase the number of likes by 1 for that question
      4.3- create a new like document
      4.4- give points to the question author
*/
questionRouter.post("/company/:quesId/like", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{

  // checking if the user already liked the question
  COMPANY_QUES_LIKES.findOne({user: req.user._id, question: req.params.quesId}).then((like)=>{
    if(like){
      if(like.unliked == false){
        return res.status(403).json({
          success: false,
          status: "already liked"
        });
      }

      let proms1 = [];
      // increasing number of upvotes for the question - getting the date of the last query
      proms1.push(CQUES.findOneAndUpdate({_id: req.params.quesId, user: {$ne: req.user._id}}, {$inc: {upvotes: 1}}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      Promise.all(proms1).then((results)=>{
        let ques = results[0];
        let lastQueryDoc = results[1];
        let lastQuery;

        if(!ques){
          return res.status(404).json({
            success: false,
            status: "question not found or you own it"
          });
        }

        if(!lastQueryDoc){
          lastQuery = new Date((process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT));
        }
        else{
          lastQuery = lastQueryDoc.date;
        }

        let proms2 = [];
        // if the updatedAt of the like document is newer than the last query, delete the unlike document that is created later than the date of the last query
        if(like.updatedAt >= lastQuery){
          proms2.push(COMPANY_QUES_UNLIKES.findOneAndRemove({user: req.user._id, question: req.params.quesId, createdAt: {$gte: lastQuery}}));
        }
        // updating the like document to have the unliked = false
        proms2.push(COMPANY_QUES_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: false}}));
        // giving points to the user
        proms2.push(USER.findOneAndUpdate({_id: ques.user}, {$inc: {comPoints: parseInt((process.env.QUES_LIKE_POINTS|| config.QUES_LIKE_POINTS))}}));
        Promise.all(proms2).then((result2)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from /question/company/:quesId/like: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Updating the like or giving points to user failed"
          });
        });

      })
      .catch((err)=>{
        console.log("Error from /company/:quesId/like: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the question or acquiring the date of last query failed"
        });
      });
    }
    else{
      // creating the like
      // create the like document - give points to the question author
      CQUES.findOneAndUpdate({_id: req.params.quesId, user: {$ne: req.user._id}}, {$inc: {upvotes: 1}})
      .then((ques)=>{
        if(!ques){
          return res.status(404).json({
            success: false,
            status: "question not found or you own it"
          });
        }

        let proms = [];
        proms.push(COMPANY_QUES_LIKES.create({user: req.user._id, question: req.params.quesId}));
        proms.push(USER.findOneAndUpdate({_id: ques.user}, {$inc: {comPoints: parseInt((process.env.QUES_LIKE_POINTS|| config.QUES_LIKE_POINTS))}}))
        
        Promise.all(proms).then((result3)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from POST /questions/company/:quesId/like: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Giving points to the question author or creating the like document failed"
          });
        });
      })
      .catch((err)=>{
        console.log("Error from /company/:quesId/like: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the question failed"
        });
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /questions/company/:quesId/like: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the like failed"
    });
  });
});






// unlike a company question
/* 
  steps:
    1- get the question
    2- check if the question exists and is not made by the user
    3- check if the likes count for the question is greater than 0
    4- get the like document for this user on this question
    5- if the like document doesn't exist, return an error indicating that the user didn't like the question before
    6- if the like document exists:
      6.1- if the unliked state is true, return an error indicating that the user has already unliked the question
      6.2- get the date of the last query
      6.3- decrease the number of likes for this question by 1
      6.4- check if the question exists and is not made by the user
      6.5- check if the likes count for the question is greater than or equals to 0. if this is not fulfilled, increase the likes count for the question by 1, then return an error indicating that there are no likes for the question
      6.6- if((like.createdAt < lastQuery && like.updatedAt < lastQuery) || 
        (like.updatedAt > lastQuery && like.createdAt < lastQuery)) {create a new unlike document}
      6.7- modify the like document to have the unliked = true
      6.8- remove points from the user
*/
questionRouter.post("/company/:quesId/unlike", cors.cors, rateLimit, authenticate.verifyUser, (req, res, next)=>{
  let proms = [];
  proms.push(COMPANY_QUES_LIKES.findOne({user: req.user._id, question: req.params.quesId}));
  proms.push(CQUES.findOne({_id: req.params.quesId, user: {$ne: req.user._id}}));
  
  Promise.all(proms).then((firstResults)=>{
    let like = firstResults[0];
    let ques = firstResults[1];

    if(!ques){
      return res.status(404).json({
        success: false,
        status: "question not found or you own it"
      });
    }
    
    if(ques.upvotes <= 0){
      return res.status(403).json({
        success: false,
        status: "no likes"
      });
    }

    if(like){
      if(like.unliked == true){
        return res.status(403).json({
          success: false,
          status: "already unliked"
        });
      }

      let proms1 = [];
      // decreasing number of likes for the question - getting the date of the last query
      proms1.push(CQUES.findOneAndUpdate({_id: req.params.quesId, user: {$ne: req.user._id}}, {$inc: {upvotes: -1}}, {new: true}));
      proms1.push(CONSTANT.findOne({name: "AILastQuery"}, {date: 1, _id: 0}));
      
      Promise.all(proms1).then(async(results)=>{
        let ques = results[0];
        let lastQueryDoc = results[1];
        let lastQuery;

        if(!ques){
          return res.status(404).json({
            success: false,
            status: "question not found or you own it"
          });
        }

        if(ques.upvotes < 0){
          try{
            await CQUES.findOneAndUpdate({_id: req.params.quesId, user: {$ne: req.user._id}}, {$inc: {upvotes: 1}});
            return res.status(403).json({
              success: false,
              status: "no likes"
            });
          }
          catch(err){
            console.log("Error from /question/company/:quesId/unlike: ", err);
            return res.status(500).json({
              success: false,
              status: "internal server error",
              err: "queserting number of likes for the question failed"
            });
          }
        }

        if(!lastQueryDoc){
          lastQuery = new Date((process.env.AI_LAST_QUERY_DEFAULT || config.AI_LAST_QUERY_DEFAULT));
        }
        else{
          lastQuery = lastQueryDoc.date;
        }

        let proms = [];
        // modify the like to be unliked - remove points from the question author - create an unlike document
        if((like.createdAt < lastQuery && like.updatedAt < lastQuery) || 
        (like.updatedAt > lastQuery && like.createdAt < lastQuery)){
          proms.push(COMPANY_QUES_UNLIKES.create({user: req.user._id, question: req.params.quesId}));
        }
        proms.push(COMPANY_QUES_LIKES.findByIdAndUpdate(like._id, {$set: {unliked: true}}));
        proms.push(USER.findOneAndUpdate({_id: ques.user}, {$inc: {comPoints: -parseInt((process.env.QUES_LIKE_POINTS|| config.QUES_LIKE_POINTS))}}));
      
        Promise.all(proms).then((result)=>{
          return res.status(200).json({
            success: true
          });
        })
        .catch((err)=>{
          console.log("Error from /question/company/:quesId/unlike: ", err);
          return res.status(500).json({
            success: false,
            status: "internal server error",
            err: "Updating the like or giving points to user failed or creating the unlike document failed"
          });
        });
      })
      .catch((err)=>{
        console.log("Error from /question/company/:quesId/unlike: ", err);
        return res.status(500).json({
          success: false,
          status: "internal server error",
          err: "Updating the question or acquiring the date of last query failed"
        });
      });
    }
    else{
      return res.status(403).json({
        success: false,
        status: "you didn't like this question"
      });
    }
  })
  .catch((err)=>{
    console.log("Error from POST /questions/company/:quesId/unlike: ", err);
    return res.status(500).json({
      success: false,
      status: "internal server error",
      err: "Finding the like or the question failed"
    });
  });
});















module.exports = questionRouter