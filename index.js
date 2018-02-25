const steem = require('steem');
const Timer = require('setinterval');
var Store = require("jfs");
var db = new Store("data");
var async = require("async");
var express = require('express');

var path = __dirname + '/views/';
var app = express();
app.use(express.static(__dirname + '/public'));


app.get('/', function(req, res) {
	
	async.series(
	[
	function(callback) {
		db.get("DynamicGlobalProperties", function(err, obj){
			callback(null,obj);
		});
	}
	], function(err, results) {
		res.render(path + "index.ejs", {result: results[0]});

	});
		
});

app.get('/download', function(req, res) {
	var file = __dirname + '/data/DynamicGlobalProperties.json';
	
	res.download(file);
});

var server = app.listen(process.env.PORT || 8080, function(err) {
	if (err) throw err;
});

setInterval(function() {
	async.waterfall (
	[
		function(callback) {
			prop = {}
			steem.api.getDynamicGlobalProperties(function(err, result) {
				if (err) throw err;
				
				reg = /([\d].*) [A-z].*/g
				
				prop.time = result.time;
				prop.current_sbd_supply = Number((result.current_sbd_supply).replace(reg,'$1'));
				prop.virtual_supply = Number((result.virtual_supply).replace(reg,'$1'));
				prop.sbd_print_rate = result.sbd_print_rate;
				prop.current_supply = Number((result.current_supply).replace(reg,'$1'));
				
				console.log(prop)
				callback(null, prop);
			});
		},
		function(prop,callback) {
			steem.api.getCurrentMedianHistoryPrice(function(err, result) {
				reg = /([\d].*) [A-z].*/g
				quote = Number((result.quote).replace(reg,'$1'));
				base = Number((result.base).replace(reg,'$1'));
				prop.medianPrice = base/quote;
				
				ratio = 100*((prop.current_sbd_supply / prop.medianPrice)/ prop.virtual_supply);
				prop.ratio = ratio;
				callback(null, prop);
			});
		},
		function(prop,callback) {
			
			db.get("DynamicGlobalProperties", function(err, obj){
				if(err) {
					array = [];
					array.push(prop);
					callback(null,array);
				}
				else {
					obj.push(prop);
					callback(null,obj);
				}
			})
		},
		function(array, callback) {
			db.save("DynamicGlobalProperties", array, function(err){
				if(err) throw err;
				
				console.log("GlobalProperties saved");
			});
			
		}
		])

},21600000);


process.on('uncaughtException', function (err) {
    console.log('error','UNCAUGHT EXCEPTION - keeping process alive:',  err.message);
});


