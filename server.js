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


function value_or_default(value, default_value) {
	return (typeof value) !== 'undefined' ? value : default_value;
};


function get_query_variable(query_string, variable) {
	if ((typeof query_string) !== 'undefined') {
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
	
	return 'undefined';
}


function send_json(response, json, response_code) {
	response_code = value_or_default(response_code, 200);
    response.writeHeader(response_code, {"Content-Type": "application/json"});
    response.write(JSON.stringify(json, null, json_whitespace));
};


function send_plain_text(response, text, response_code) {
	response_code = value_or_default(response_code, 200);
    response.writeHeader(response_code, {"Content-Type": "text/plain"});
    response.write(text);
};


function get_drone_location(drone_id) {
	location = { "lat": 12.1234, "lng": -90.1234 };
	return location;
};


function get_nearby_no_fly_zones(gps, distance) {
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


function get_local_weather(gps) {
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


function build_drone_result_json(drone_id, distance) {
	distance = value_or_default(distance, 20.0);
	data = {};
	data.drone_id = drone_id;
	data.location = get_drone_location(drone_id);
	data.no_fly_zones = get_nearby_no_fly_zones(data.location, distance);
	data.weather = get_local_weather(data.location);
	return data;
};


function route_request(paths, query) {
	dist = get_query_variable(query, 'nfzd')
	result = {}
	result.data = build_drone_result_json(paths[1], dist);
	result.code = 200;
	return result;
};


function server(request, response) {
    var url_parts = url.parse(request.url);
    var paths = url_parts.pathname.split('/').clean('');

	if (process.env.DEBUG === 'true') {
	    console.log("Request");
	    console.log(url_parts);
    	console.log(paths);
    }
    
    json_response = route_request(paths);
    send_json(response, json_response.data, json_response.code);
    response.end();
};


http.createServer(server).listen(process.env.PORT);
console.log("Server running on " + process.env.PORT); 
