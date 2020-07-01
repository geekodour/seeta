const path = require("path");
const net = require("net");
const jayson = require("jayson");
const DHT = require("bittorrent-dht");
const fs = require("fs");
const NodeGit = require("nodegit");
const crypto = require("./crypto");

const CONTROL_PORT = 6666;
const DATA_PORT = 6969;

exports.createSeeta = (filepath) => {
  let resolvedPath = path.resolve(filepath);
  let idx;
  let repository;
  NodeGit.Repository.init(resolvedPath, 0)
    .then(function (repo) {
      repository = repo;
      // create metadata.json
      fs.writeFile(
        `${resolvedPath}/metadata.json`,
        `{"name":"small data set"}`,
        function (err) {
          if (err) {
            return console.log(err);
          }
        }
      );
      // create contents directory
      let contentsPath = `${resolvedPath}/contents`;
      if (!fs.existsSync(contentsPath)) {
        fs.mkdirSync(contentsPath);
      }
      // Create private and public keys
      let keys = crypto.genKeyPair();
      // create metadata.json
      fs.writeFile(
        `${resolvedPath}/S.key`,
        `${keys.secretKey.toString("hex")}`,
        function (err) {
          if (err) {
            return console.log(err);
          }
        }
      );
      fs.writeFile(
        `${resolvedPath}/P.key`,
        `${keys.publicKey.toString("hex")}`,
        function (err) {
          if (err) {
            return console.log(err);
          }
        }
      );

      return repo.refreshIndex();
    })
    .then(function (index) {
      idx = index;
      idx.addByPath("P.key");
      idx.addByPath("S.key");
      idx.addByPath("contents");
      return idx.addByPath("metadata.json");
    })
    .then(function () {
      return idx.write();
    })
    .then(function () {
      return idx.writeTree();
    })
    .then(function (oid) {
      let s = NodeGit.Signature.now("Seeta", "seetaauthors@gmail.com");
      return repository.createCommit("HEAD", s, s, "Initial Commit", oid, []);
    })
    .done(function (commitId) {
      console.log(`New Seeta ready at ! ${resolvedPath}`);
    });
};

exports.seedSeeta = () => {
  let repository;
  let oid;
  // verify running in a Seeta repository
  let checkFiles = [".git", "contents", "metadata.json", "S.key", "P.key"];
  checkFiles.forEach((f) => {
    if (!fs.existsSync(f)) {
      console.log(`Seeta corrupted. ${f} not found.`);
      process.exit();
    }
  });
  // check if any pending changes
  NodeGit.Repository.open(path.resolve(".git"))
    .then(function (repo) {
      repository = repo;
      return repo.getStatus().then(function (statuses) {
        return statuses.some((f) => f.isNew || f.isModified);
      });
    })
    .then((isChanged) => {
      if (isChanged) {
        console.log("New changes were detected");
      }
      return repository.refreshIndex();
    })
    .then(function (index) {
      idx = index;
      idx.addByPath("contents");
      return idx.addByPath("metadata.json");
    })
    .then(function () {
      return idx.write();
    })
    .then(function () {
      return idx.writeTree();
    })
    .then(function (oidres) {
      oid = oidres;
      return NodeGit.Reference.nameToId(repository, "HEAD");
    })
    .then((head) => {
      return repository.getCommit(head);
    })
    .then((parent) => {
      let s = NodeGit.Signature.now("Seeta", "seetaauthors@gmail.com");
      return repository.createCommit("HEAD", s, s, "Seeding Commit", oid, [
        parent,
      ]);
    })
    .done(function (commitId) {
      console.log(`Repository committed, ready to be announced.`);

      repository.getReferenceCommit("master").then((c) => {
        //let shaHash = c.sha()
        pubKey = crypto.getRepoPublicKey().toString();

        // Accounce it to the DHT
        let bootstrapDHTPort = process.env.DTH_BOOTSTRAP_PORT;
        if (!bootstrapDHTPort) {
          console.log("Could not find bootstrapper.");
          process.exit();
        }
        let seedDHT = new DHT({ bootstrap: "127.0.0.1:" + bootstrapDHTPort });
        seedDHT.announce(pubKey, () => {
          console.log(
            `listening to other peers on this Seeta:${seedDHT.address().port}`
          );
          console.log(
            ` Share this Seeta Phal 🥑 with your friends: seeta://${pubKey}`
          );
        });

        // Start JSON RPC
        // response 0 for success
        // response 1 for fail
        const META_DATA = 0;
        const CONTENT_DATA = 1;
        const server = jayson.server({
          ret_data: function (args, callback) {
            switch (args[0]) {
              case META_DATA:
                console.log("MetaData was requested.");
                callback(null, 0); // success
                break;
              case CONTENT_DATA:
                console.log("ContentData was requested.");
                callback(null, 0); // success
                break;
              default:
                break;
            }
          },
        });
        server.http().listen(CONTROL_PORT);
        sendMetaDataFile();
        // TODO: Dgram Services should live elsewhere.
      });
    });
};

// currently works for local testing
exports.bootstrapDHT = () => {
  let dht1 = new DHT({ bootstrap: false });
  dht1.listen(() => {
    console.log(
      `🌱 Seeta BootstrapDHT listening for announcements. localhost:${
        dht1.address().port
      }`
    );
    console.log(`
    Run the following command before seeding/fetching:

    export DTH_BOOTSTRAP_PORT=${dht1.address().port}`);

    // log on new announcements
    dht1.on("announce", function (peer) {
      console.log("new peer just announced:", peer);
      console.log("Current DHT", dht1.toJSON());
    });

    maindht = dht1;
  });
};

const foundPeer = (peer, infoHash, from) => {
  console.log("🎉 found peer");
  console.log(`Will try to fetch metadata from ${peer.host} ${peer.port} now.`);
  const client = jayson.client.http({ port: CONTROL_PORT });
  // Get Metadata
  client.request("ret_data", [0], function (err, response) {
    if (err) throw err;
    if (response.result != 0) {
      console.log("Remote server did not return success");
    }
    recieveMetaDataFile(peer.host);
  });
};

// fetching
exports.fetchSeeta = (url) => {
  let bootstrapDHTPort = process.env.DTH_BOOTSTRAP_PORT;
  let fetchDHT = new DHT({ bootstrap: "127.0.0.1:" + bootstrapDHTPort });
  fetchDHT.on("peer", foundPeer);

  const hash = url.split("seeta://")[1];

  fetchDHT.lookup(hash, (e, d) => {
    if (e !== null) {
      console.log("DHT Lookup error.");
    }
    console.log(
      `Recursive DHT lookup has terminated, Found ${d} peers having this Seeta Phal 🥑`
    );
    fetchDHT.on("peer", function (peer, infoHash, from) {
      console.log("found potential peer ");
    });
  });
};

const sendMetaDataFile = () => {
  let istream = fs.createReadStream("./metadata.json");
  let server = net.createServer((socket) => {
    socket.pipe(process.stdout);
    istream.on("readable", function () {
      let data;
      while ((data = this.read())) {
        socket.write(data);
      }
    });
    istream.on("end", function () {
      socket.end();
    });
    socket.on("end", () => {
      server.close(() => {
        console.log("\nTransfer is done!");
      });
    });
  });
  server.listen(DATA_PORT, "0.0.0.0");
};

const recieveMetaDataFile = (remote_server) => {
  let socket = remote_server
    ? net.connect(DATA_PORT, remote_server)
    : net.connect(DATA_PORT);
  let ostream = fs.createWriteStream("./metadata.json");
  //let date = new Date(), size = 0, elapsed;
  socket.on("data", (chunk) => {
    //size += chunk.length;
    //elapsed = new Date() - date;
    //socket.write(`\r${(size / (1024 * 1024)).toFixed(2)} MB of data was sent. Total elapsed time is ${elapsed / 1000} s`)
    //process.stdout.write(`\r${(size / (1024 * 1024)).toFixed(2)} MB of data was sent. Total elapsed time is ${elapsed / 1000} s`);
    ostream.write(chunk);
  });
  socket.on("end", () => {
    //console.log(`\nFinished getting file. speed was: ${((size / (1024 * 1024)) / (elapsed / 1000)).toFixed(2)} MB/s`);
    console.log("file recieved.");
    process.exit();
  });
};
