const fs = require("fs").promises;
const path = require("path");

const deleteFile = async (relativePath) => {
  if (!relativePath) return;

  const localFilePath = path.join(process.cwd(), relativePath);

  try {
    await fs.access(localFilePath); // check existence
    await fs.unlink(localFilePath);
    console.log(`Successfully deleted file: ${localFilePath}`);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log(`File does not exist: ${localFilePath}`);
    } else {
      console.error(`Failed to delete file: ${localFilePath}`, err);
    }
  }
};

module.exports = deleteFile;
