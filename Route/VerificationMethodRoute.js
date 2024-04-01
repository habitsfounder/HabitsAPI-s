const express = require("express");
const router = express.Router();
const VerifyMethods = require("../Controller/VerifyMethods");

router.post("/createVerificationMethod", VerifyMethods.createVerificationMethod);
router.get("/getAllVerificationMethod", VerifyMethods.getAllVerificationMethod);
router.get("/getVerificationMethod/:id", VerifyMethods.getVerificationMethodById);

module.exports = router;
