var http = require("http");


json_whitespace = 3;


send_json = function(response, json, response_code) {
	response_code = (typeof response_code) !== 'undefined' ? response_code : 200;
    response.writeHeader(response_code, {"Content-Type": "application/json"});
    response.write(JSON.stringify(json, null, json_whitespace));
};


send_plain_text = function(response, text, response_code) {
	response_code = (typeof response_code) !== 'undefined' ? response_code : 200;
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


build_drone_result_json = function(drone_id) {
	data = {};
	data.drone_id = drone_id;
	data.location = get_drone_location(drone_id);
	data.no_fly_zones = get_nearby_no_fly_zones(data.location, 20.0);
	data.weather = get_local_weather(data.location);
	return data;
};


server = function(request, response) {
    console.log("Request");
    send_json(response, build_drone_result_json());
    response.end();
};


http.createServer(server).listen(process.env.PORT);
console.log("Server Running on " + process.env.PORT); 
