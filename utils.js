const path = require("path")
const sodium = require("sodium-universal")
const fs = require('fs')
const NodeGit = require("nodegit")

const genKeyPair = () => {
  let publicKey = Buffer.allocUnsafe(sodium.crypto_sign_PUBLICKEYBYTES)
  let secretKey = Buffer.allocUnsafe(sodium.crypto_sign_SECRETKEYBYTES)
  sodium.crypto_sign_keypair(publicKey, secretKey)
  return {
    publicKey: publicKey,
    secretKey: secretKey
  }
}

exports.createSeeta = (filepath) => {
  let resolvedPath = path.resolve(filepath)
  let idx
  let repository
  NodeGit.Repository.init(resolvedPath, 0).then(function (repo) {
    repository = repo
    // create metadata.json
    fs.writeFile(`${resolvedPath}/metadata.json`, `{"name":"small data set"}`, function(err) {
      if(err) {
          return console.log(err);
      }
    })
    // create contents directory
    let contentsPath = `${resolvedPath}/contents`
    if (!fs.existsSync(contentsPath)){
      fs.mkdirSync(contentsPath);
    }
    // Create private and public keys
    let keys = genKeyPair()
    // create metadata.json
    fs.writeFile(`${resolvedPath}/S.key`, `${keys.secretKey.toString('hex')}`, function(err) {
      if(err) {
          return console.log(err);
      }
    })
    fs.writeFile(`${resolvedPath}/P.key`, `${keys.publicKey.toString('hex')}`, function(err) {
      if(err) {
          return console.log(err);
      }
    })

    return repo.refreshIndex()
  }).then(function(index){
    idx = index
    idx.addByPath('P.key')
    idx.addByPath('S.key')
    idx.addByPath('contents')
    return idx.addByPath('metadata.json')
  }).then(function(){
    return idx.write()
  }).then(function(){
    return idx.writeTree()
  }).then(function(oid){
    let s = NodeGit.Signature.now("Seeta", "seetaauthors@gmail.com")
    return repository.createCommit("HEAD", s, s, "Initial Commit", oid, [])
  }).done(function(commitId){
    console.log(`New Seeta ready at ! ${resolvedPath}`)
  })
}

exports.seedSeeta = () => {
  let repository
  let oid
  // verify running in a Seeta repository
  let checkFiles = [".git","contents","metadata.json","S.key","P.key"]
  checkFiles.forEach((f)=>{
    if (!fs.existsSync(f)) {
      console.log(`Seeta corrupted. ${f} not found.`)
      process.exit()
    }
  })
  // check if any pending changes
  NodeGit.Repository.open(path.resolve(".git")).then(function(repo){
      repository = repo
      return repo.getStatus().then(function(statuses) {
        return statuses.some((f)=>(f.isNew || f.isModified))
      })
  }).then((isChanged)=>{
    if(isChanged){ console.log("New changes were detected") }
    return repository.refreshIndex()
  }).then(function(index){
    idx = index
    idx.addByPath('contents')
    return idx.addByPath('metadata.json')
  }).then(function(){
    return idx.write()
  }).then(function(){
    return idx.writeTree()
  }).then(function(oidres){
    oid = oidres
    return NodeGit.Reference.nameToId(repository, 'HEAD')
  }).then((head)=>{
    return repository.getCommit(head)
  }).then((parent)=>{
    let s = NodeGit.Signature.now("Seeta", "seetaauthors@gmail.com")
    return repository.createCommit("HEAD", s, s, "Seeding Commit", oid, [parent])
  }).done(function(commitId){
    console.log(`Repository committed, ready to be announced.`)
  })
}