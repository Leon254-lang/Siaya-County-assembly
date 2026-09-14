const fs = require('fs');
const { execFile } = require('child_process');

const scanPath = (filePath) => new Promise((resolve, reject) => {
  if (!process.env.CLAMSCAN_PATH) return resolve(true);
  execFile(process.env.CLAMSCAN_PATH, ['--no-summary', filePath], (error) => {
    if (!error) return resolve(true);
    if (error.code === 1) return resolve(false);
    reject(error);
  });
});

const scanUploadedFiles = async (req, res, next) => {
  const files = req.file ? [req.file] : Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();
  try {
    for (const file of files) {
      if (!(await scanPath(file.path))) {
        if (file.path) fs.rmSync(file.path, { force: true });
        return res.status(400).json({ message: 'Upload rejected by malware scanning policy.' });
      }
    }
    next();
  } catch (error) {
    next(new Error(`Upload malware scan failed: ${error.message}`));
  }
};

module.exports = { scanUploadedFiles };
