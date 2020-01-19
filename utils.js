const path = require("path")
const fs = require('fs')
const NodeGit = require("nodegit")

exports.createSeeta = (filepath) => {
  let resolvedPath = path.resolve(filepath)
  let defaultMetadataContent = {}
  let idx
  let repository
  NodeGit.Repository.init(resolvedPath, 0).then(function (repo) {
    repository = repo
    // create metadata.json
    fs.writeFile(`${resolvedPath}/metadata.json`, `{"version":"0.0"}`, function(err) {
      if(err) {
          return console.log(err);
      }
    }); 
    // create contents directory
    let contentsPath = `${resolvedPath}/contents`
    if (!fs.existsSync(contentsPath)){
      fs.mkdirSync(contentsPath);
    }
    return repo.refreshIndex()
  }).then(function(index){
    idx = index
    return idx.addByPath('metadata.json')
  }).then(function(){
    return idx.write()
  }).then(function(){
    return idx.writeTree()
  }).then(function(oid){
    let s = NodeGit.Signature.now("Seeta", "seetaauthors@gmail.com")
    return repository.createCommit("HEAD", s, s, "Initial Commit", oid, [])
  }).done(function(commitId){
    console.log("New Seeta ready!")
  })
}