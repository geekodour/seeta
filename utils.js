const path = require("path")
const DHT = require('bittorrent-dht')
const fs = require('fs')
const NodeGit = require("nodegit")
const crypto = require('./crypto')

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
    let keys = crypto.genKeyPair()
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

exports.seedSeeta = (bootstrapDHTPort) => {
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

    repository.getReferenceCommit('master').then((c)=>{
      //let shaHash = c.sha()
      pubKey = crypto.getRepoPublicKey().toString()

      // Accounce it to the DHT
      let seedDHT = new DHT({ bootstrap: '127.0.0.1:' + bootstrapDHTPort })
      seedDHT.announce(pubKey, () => {
        console.log(`listening to other peers on this Seeta:${seedDHT.address().port}`)
      })

    })


  })
}

// currently works for local testing
exports.bootstrapDHT = () => {
  let dht1 = new DHT({ bootstrap: false })
  dht1.listen(() => {
    //let dht2 = new DHT({ bootstrap: '127.0.0.1:' + dht1.address().port })
    console.log(`DHT1 Listening for announcements. localhost: ${dht1.address().port}`)

    // log on new announcements
    dht1.on('announce', function (peer) {
      console.log("new peer just announced:", peer)
    })
  })
}