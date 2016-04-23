# RenoSpaceApps2016_Drone-Server
Server for drone app

# Prerequisites

Have [node](https://nodejs.org/) installed.

# Running the server

(The `DEBUG` option can be skipped and will default to `false`.)

## On *Nix

Run:

* `PORT=8080 DEBUG={true|false} node server.js`

## On Windows

Run:

* `set PORT=8080`
* `set DEBUG={true|false}`
* `node server.js`

# Getting drone data

From a browser or other client, open:

* `http://localhost:8080/drone/{drone_id}`

(Assuming the server is running locally at `localhost`.)

`{drone_id}` is the unique identifier for your drone.
