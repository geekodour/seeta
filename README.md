# Seeta 🥑 
A very simple and incomplete protocol to share files in a P2P network.

- Control Port No. `6666`
- Data Port No. `6969`

### TODO
- [ ] Add File Sharing
- [ ] Add Encryption Before Sharing Data

### RPC Actions
Response 0 for success and 1 for fail.
- `FETCH 0`: Fetch Metadata
- `FETCH 1`: Fetch Content, Keys and Version History


## Installation
```
npm i @geekodour/seeta -g
```
This will make the seeta cli available in your path.

## Basic usage
```
Usage: seeta [options]

Options:
  -c, --create <filepath>  Create a Seeta
  -s, --seed               Seed a Seeta
  -f, --fetch <url>        Fetch Seeta Resource
  -b, --bootstrap          Bootstrap DHT Peers
  -h, --help               output usage information
```

## Bootstrapping DHTs
Start by bootstrapping DHTs by running the following command:
```
seeta -b
```
output:
```
🌱 Seeta BootstrapDHT listening for announcements. localhost:56304

    Run the following command before seeding/fetching:

    export DTH_BOOTSTRAP_PORT=56304
```

## Creating a Seeta
Create a Seeta and corresponding keys using the `-c` flag.
```
seeta -c <repo_name>
```
```
New Seeta ready at ! /home/geekodour/OwnProjects/seeta/newseeta
```

## Seeding a Seeta
Now you can go into the directory and fillin the contents directory with file contents. To seed the contents you can use the `-s` flag.
```
seeta -s
```
output:
```
Repository committed, ready to be announced.
listening to other peers on this Seeta:52799

Share this Seeta Phal 🥑 with your friends:
seeta://d0fc562bd5f5dfd33426a9e3c99b785a4ddbe78b3a627b5dc8eb16edd9c2afdc
```