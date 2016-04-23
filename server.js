var http = require("http");
var url = require('url');


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


value_or_default = function(value, default_value) {
	return (typeof value) !== 'undefined' ? value : default_value;
};


send_json = function(response, json, response_code) {
	response_code = value_or_default(response_code, 200);
    response.writeHeader(response_code, {"Content-Type": "application/json"});
    response.write(JSON.stringify(json, null, json_whitespace));
};


send_plain_text = function(response, text, response_code) {
	response_code = value_or_default(response_code, 200);
    response.writeHeader(response_code, {"Content-Type": "text/plain"});
    response.write(text);
};


get_drone_location = function(drone_id) {
	location = { "lat": 12.1234, "lng": -90.1234 };
	return location;
};


get_nearby_no_fly_zones = function(gps, distance) {
	no_fly_zones = [
		{
			"type": "polygon",
			"comment": "Expected to form a closed shape around the No Fly Zone",
			"coords":
			[
				{
					"lat": 12.1234,
					"lng": -90.1234
				},
				{
					"lat": 12.1234,
					"lng": -90.1234
				},
				{
					"lat": 12.1234,
					"lng": -90.1234
				}
			]
		},
		{
			"type": "airport",
			"comment": "Expected to have a single coordinate centered on an airport, with a 5-mile No Fly Zone",
			"coords":
			[
				{
					"lat": 12.1234,
					"lng": -90.1234
				}
			]
		}];
	return no_fly_zones;
};


get_local_weather = function(gps) {
	weather = {
		"time": "23 Apr 14:15 pm EDT",
		"temp": 29.2,
		"wind_speed": 1.5,
		"wind_direction": 1,
		"wind_gust": 4.5,
		"precip": 0.5,
		"visibility": 10.1,
		"hazards":
		[
			{
				"desc": "This is a hazard.",
				"url": "http://www.weather.gov/hazard_url"
			}
		]};
	return weather;
};


build_drone_result_json = function(drone_id, distance) {
	distance = value_or_default(distance, 20.0);
	data = {};
	data.drone_id = drone_id;
	data.location = get_drone_location(drone_id);
	data.no_fly_zones = get_nearby_no_fly_zones(data.location, distance);
	data.weather = get_local_weather(data.location);
	return data;
};


route_request = function(paths) {
	result = {}
	result.data = build_drone_result_json(paths[1]);
	result.code = 200;
	return result;
};


server = function(request, response) {
    var url_parts = url.parse(request.url);
    var paths = url_parts.pathname.split('/').clean('');

	if (process.env.DEBUG === 'true') {
	    console.log("Request");
    	console.log(paths);
    }
    
    json_response = route_request(paths);
    send_json(response, json_response.data, json_response.code);
    response.end();
};


http.createServer(server).listen(process.env.PORT);
console.log("Server running on " + process.env.PORT); 
