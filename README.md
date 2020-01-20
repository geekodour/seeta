# Seeta 🥑 
A very simple and incomplete protocol to share files in a P2P network.

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
After bootstrap server is run, add this environment variable to seeds and fetchers.
```
export DTH_BOOTSTRAP_PORT=<port_no>
```