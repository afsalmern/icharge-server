const path = require("path");
const fs = require("fs");

const deleteFile = async (filename) => {
  if (!filename) return;

  // It's a local file, delete from server storage
  const localFilePath = path.join(__dirname, "..", "uploads", filename);
  console.log("localFilePath", localFilePath);

  if (fs.existsSync(localFilePath)) {
    fs.unlink(localFilePath, (err) => {
      if (err) {
        console.error(`Failed to delete local file: ${localFilePath}`, err);
      } else {
        console.log(`Successfully deleted local file: ${localFilePath}`);
      }
    });
  }
};

module.exports = deleteFile;
