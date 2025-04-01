const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadFolder = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true }); // Create folder if it doesn't exist
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage: storage }).fields([
  { name: "photo", maxCount: 1 },
  { name: "proof_back", maxCount: 1 },
  { name: "proof_front", maxCount: 1 },
  { name: "image", maxCount: 1 },
  { name: "avatar", maxCount: 1 },
  { name: "kyc_photo", maxCount: 1 },
]);

// complaints
const complaintsDir = path.join(uploadFolder, "complaints");
if (!fs.existsSync(complaintsDir)) {
  fs.mkdirSync(complaintsDir, { recursive: true });
}

const complaintsStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, complaintsDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + "-" + Date.now() + path.extname(file.originalname));
  },
});

const uploadComplaints = multer({ storage: complaintsStorage }).single("attachment");
module.exports = { upload, uploadComplaints };
