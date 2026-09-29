const multer = require("multer");
const ApiError = require("../utils/ApiError");
const { SUPPORTED_MIME_TYPES } = require("../utils/fileType");

const MAX_FILES = 6;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 14 * 1024 * 1024;

const answerSheetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: MAX_FILES, fields: 5, fieldSize: 256 * 1024 },
  fileFilter: (req, file, cb) => {
    if (SUPPORTED_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest(`"${file.originalname}" isn't supported. Upload JPG, PNG, WEBP or PDF files.`));
  },
}).array("files", MAX_FILES);

module.exports = { answerSheetUpload, MAX_FILES, MAX_FILE_BYTES, MAX_TOTAL_BYTES };
