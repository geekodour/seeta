const seeta = require('commander');
const utils = require('./utils')

seeta
  .option('-c, --create <filepath>', 'Create a Seeta')
  .option('-s, --seed', 'Seed a Seeta')
  .option('-f, --fetch <url>', 'Fetch Seeta Resource')
  .option('-b, --bootstrap', 'Bootstrap DHT Peers');

seeta.parse(process.argv);

if (seeta.create) utils.createSeeta(seeta.create);
if (seeta.seed) console.log('- small pizza size');
if (seeta.fetch) console.log(`- ${seeta.fetch}`);