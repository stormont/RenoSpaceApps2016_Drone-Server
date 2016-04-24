# RenoSpaceApps2016_Drone-Server
Server for drone app

# Prerequisites

Have [node](https://nodejs.org/) installed.

Add additional packages:

* `npm install request --save`
* `npm install sqlite3 --save`

# Running the server

(The `DEBUG` option can be skipped and will default to `false`.)

(Subsequent instruction assume accessing a server on `localhost` running on port `8080`.)

## On *Nix

Run:

* `PORT=8080 DEBUG={true|false} node server.js`

## On Windows

Run:

* `set PORT=8080`
* `set DEBUG={true|false}`
* `node server.js`

# Getting drone data

From a browser or other client, open (or otherwise run a GET request):

* `http://localhost:8080/drone/{drone_id}`

`{drone_id}` is the unique identifier for your drone.

# Posting drone data

Send a POST request to:

* `http://localhost:8080/drone?id={drone_id}&lat={latitude}&lng={longitude}`
