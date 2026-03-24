const fs = require("fs")
const path = require("path")

const STORAGE_PATH = "storage"

function buildPath(fileId, ext){

  const dir = fileId.substring(0,2)

  const folder = path.join(STORAGE_PATH, dir)

  if(!fs.existsSync(folder)){
    fs.mkdirSync(folder,{recursive:true})
  }

  return path.join(folder, fileId + ext)
}

module.exports = { buildPath }