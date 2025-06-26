const multer = require("multer");
const path = require("path");
const { v4: uuidv4 } = require('uuid'); 

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const fileExtension = path.extname(file.originalname);
    cb(null, `${uniqueId}${fileExtension}`); 
  },
});
const upload = multer({ storage }).fields([
  { name: "images", maxCount: 15 },
  { name: "video", maxCount: 1 },
  { name: "avatar", maxCount: 1 },
  { name: "cccdFrontImage", maxCount: 1 },
  { name: "cccdBackImage", maxCount: 1 },
  { name: "licensePlateImage", maxCount: 1 }
]);

module.exports = upload;