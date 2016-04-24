var http = require("http");
var https = require("https");
var url = require('url');
var fs = require("fs");
var sqlite3 = require("sqlite3");


var db_file = "drones.db";
var db_existed = fs.existsSync(db_file);
var db = new sqlite3.Database(db_file);

var weather_file = '';
var weather_token = '';

var no_fly_zone_file = 'no_fly_zones.json';
var no_fly_zones = {};

var dummy_file = 'dummy_json.json';
var dummy_zones = {};

var json_whitespace = 3;


Array.prototype.clean = function(deleteValue) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] == deleteValue) {         
			this.splice(i, 1);
			i--;
		}
	}

	return this;
};


function value_or_default(value, default_value) {
	return (typeof value) !== 'undefined' ? value : default_value;
};


function get_query_variable(query_string, variable) {
	if ((typeof query_string) !== 'undefined' && query_string !== null && query_string !== '') {
		var vars = query_string.split('&');
	
		for (var i = 0; i < vars.length; i++) {
			var pair = vars[i].split('=');
		
			if (decodeURIComponent(pair[0]) === variable) {
				return decodeURIComponent(pair[1]);
			}
		}
	
		console.log('Query variable %s not found', variable);
		return 'undefined';
	}
	
	return;
}


function send_json(response, json, response_code) {
	var response_code = value_or_default(response_code, 200);
    response.writeHeader(response_code, {"Content-Type": "application/json"});
    response.write(JSON.stringify(json, null, json_whitespace));
};


function send_plain_text(response, text, response_code) {
	var response_code = value_or_default(response_code, 200);
    response.writeHeader(response_code, {"Content-Type": "text/plain"});
    response.write(text);
};


function get_drone_location(drone_id, callback) {
	var location = { "lat": 0.0, "lng": 0.0 };
	
	db.all("SELECT * FROM drones WHERE drone_id='" + drone_id + "'", function(err, rows) {
		if (process.env.DEBUG === 'true') {
			console.log('Returning details about drone_id=' + drone_id);
		}
		
		if ((typeof rows) !== 'undefined' && rows.length > 0) {
			location.lat = rows[0].lat;
			location.lng = rows[0].lng;
		}
		
		callback(location);
	});
};


function get_nearby_no_fly_zones(gps, distance, callback) {
	// Very rough region estimate around non-rectangular GPS data.
	// "Good enough" for our purposes, as +/- 1 degree will almost always
	// be at least 5 miles (the constraint on No Fly Zones).
	var client_upper_left = {
		"lat": gps.lat + 1.0,
		"lng": gps.lng - 1.0
	};
	var client_lower_right = {
		"lat": gps.lat - 1.0,
		"lng": gps.lng + 1.0
	};
	var nearby_no_fly_zones = [];
	
	for (var i = 0; i < no_fly_zones.regions.length; ++i) {
		var nfz = no_fly_zones.regions[i];
		
		if (nfz.lower_right.lat > client_upper_left.lat ||
			nfz.upper_left.lat < client_lower_right.lat ||
			nfz.lower_right.lng < client_upper_left.lng ||
			nfz.upper_left.lng > client_lower_right.lng) {
			continue;
		}
		
		for (var j = 0; j < nfz.no_fly_zones.length; ++j) {
			nearby_no_fly_zones.push(nfz.no_fly_zones[j]);
		}
	}
	
	callback(nearby_no_fly_zones);
};


function get_local_weather(gps, callback) {
	var host = 'api.forecast.io';
	var path = '/forecast/' + weather_token + '/' + gps.lat + ',' + gps.lng;

	https.get({
        host: host,
        path: path
    }, function(response) {
        var body = '';
        
        if (process.env.DEBUG === 'true') {
        	console.log('Requesting from: ' + host + path);
        }
        
        response.on('data', function(d) {
            body += d;
        });
        
        response.on('end', function() {
            var json = JSON.parse(body);
            var hazards = [];
            
            if ((typeof json.alerts) !== 'undefined') {
				for (var i = 0; i < json.alerts.length; ++i) {
					hazards.append({
						"desc": json.alerts[i].description,
						"url": json.alerts[i].uri
					});
				}
            }

			var weather = {
				"time": json.currently.time,
				"desc": json.currently.summary,
				"temp": json.currently.temperature,
				"wind_speed": json.currently.windSpeed,
				"wind_direction": json.currently.windBearing,
				"wind_gust": 0.0,
				"precip": json.hourly.data[0].precipIntensity,
				"visibility": json.currently.visibility,
				"hazards": hazards};
			callback(weather);
        });
    });
};


function build_drone_result_json(drone_id, distance, callback) {
	var distance = value_or_default(distance, 20.0);
	var data = {};
	data.drone_id = drone_id;
	
	get_drone_location(drone_id, function(result) {
		data.location = result;
		for (var key in dummy_zones) {
			var obj = dummy_zones [key];
			if (obj.location.lat == data.location.lat && obj.location.lng == data.location.lng) {
				data.weather = obj.weather;
				data.no_fly_zones = obj.no_fly_zones;
			}
			callback(data);
		}
		get_nearby_no_fly_zones(data.location, distance, function(result) {
			data.no_fly_zones = result;
			get_local_weather(data.location, function(result) {
				data.weather = result;
				callback(data);
			});
		});
	});
};


function get_drone_data(drone_id, query, callback) {
	var dist = get_query_variable(query, 'nfzd');
	build_drone_result_json(drone_id, dist, function(data) {
		result = {};
		result.data = data;
		result.code = 200;
		callback(result);
	});
};


function post_drone_data(drone_id, query) {
	var id = get_query_variable(query, 'id');
	var lat = get_query_variable(query, 'lat');
	var lng = get_query_variable(query, 'lng');
	
	if ((typeof id) !== 'undefined' && (typeof lat) !== 'undefined' && (typeof lng) !== 'undefined') {
		db.all("SELECT * FROM drones WHERE drone_id='" + id + "'", function(err, rows) {
			if ((typeof rows) !== 'undefined' && rows.length > 0) {
				if (process.env.DEBUG === 'true') {
					console.log('Updating DB');
				}
				
				db.run('UPDATE drones SET lat=' + lat + ', lng=' + lng + " WHERE drone_id='" + id + "'");
			} else {
				if (process.env.DEBUG === 'true') {
					console.log('Inserting into DB');
				}
				
				db.run("INSERT INTO drones(drone_id, lat, lng) VALUES ('" + id + "', " + lat + ', ' + lng + ')');
			}
		});
	}
};


function route_get_request(paths, query, callback) {
	switch (paths[0]) {
		case "drone":
			get_drone_data(paths[1], query, callback);
	}
};


function route_post_request(paths, query) {
	switch (paths[0]) {
		case "drone":
			return post_drone_data(paths[1], query);
		default:
			return;
	}
};


function server(request, response) {
    var url_parts = url.parse(request.url);
    var paths = url_parts.pathname.split('/').clean('');

	if (process.env.DEBUG === 'true') {
	    console.log("Request");
	    console.log(url_parts);
    	console.log(paths);
    }
    
    if (request.method === 'GET') {
		if (process.env.DEBUG === 'true') {
			console.log('Received GET request');
		}

		response.setHeader("Access-Control-Allow-Origin", "*");
	    route_get_request(paths, url_parts.query, function(json_response) {
			if ((typeof json_response) !== 'undefined') {
				send_json(response, json_response.data, json_response.code);
			}
			response.end();
	    });
	} else if (request.method === 'POST') {
		if (process.env.DEBUG === 'true') {
			console.log('Received POST request');
		}
		
		route_post_request(paths, url_parts.query);
		response.end();
	}
};


function read_weather_file(weather_file, callback) {
	fs.readFile(weather_file, 'utf8', function (err, data) {
		if (err) {
			return console.log(err);
		}
	
		weather_token = data;
		callback();
	});
};


function read_no_fly_zone_file(no_fly_zone_file, callback) {
	fs.readFile(no_fly_zone_file, 'utf8', function (err, data) {
		if (err) {
			return console.log(err);
		}
	
		no_fly_zones = JSON.parse(data);
		callback();
	});
};

function read_dummy_file(dummy_file, callback) {
	fs.readFile(dummy_file, 'utf8', function (err, data) {
		if (err) {
			return console.log(err);
			return console.log(err);
		}
	
		dummy_zones = JSON.parse(data);
		callback();
	});
};


function create_db() {
	db.serialize(function() {
		if (!db_existed) {
			db.run("CREATE TABLE drones (drone_id TEXT, lat REAL, lng REAL)");
		}
	});
};


function start_server() {
	http.createServer(server).listen(process.env.PORT);
	console.log("Server running on " + process.env.PORT);
};


create_db();

 read_dummy_file(dummy_file, function() {
	read_no_fly_zone_file(no_fly_zone_file, start_server);
 });
