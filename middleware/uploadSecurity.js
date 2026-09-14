const path = require('path');

const uploadLimits = { fileSize: Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024), files: 30 };
const allowedExtensions = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.mp3', '.wav', '.m4a']);
const blockedExtensions = new Set(['.exe', '.js', '.mjs', '.cjs', '.sh', '.bat', '.cmd', '.ps1', '.php', '.html', '.htm', '.svg']);

const secureFileFilter = (req, file, callback) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (blockedExtensions.has(extension) || !allowedExtensions.has(extension)) {
    return callback(new Error('File type is not allowed by the security policy.'));
  }
  callback(null, true);
};

module.exports = { uploadLimits, secureFileFilter };
