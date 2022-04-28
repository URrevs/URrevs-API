const admin = require("firebase-admin");
const serviceAccount = require(process.env.FIREBASE_ADMIN_KEY);

module.exports = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
