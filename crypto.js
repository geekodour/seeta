const sodium = require("sodium-universal")
const fs = require('fs')

exports.genKeyPair = () => {
  let publicKey = Buffer.allocUnsafe(sodium.crypto_sign_PUBLICKEYBYTES)
  let secretKey = Buffer.allocUnsafe(sodium.crypto_sign_SECRETKEYBYTES)
  sodium.crypto_sign_keypair(publicKey, secretKey)
  return {
    publicKey: publicKey,
    secretKey: secretKey
  }
}

exports.getRepoPublicKey = () => {
    return fs.readFileSync('./P.key')
}