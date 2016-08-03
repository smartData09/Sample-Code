/*Service to calculate ETA*/
exports.findEta = function(next) {
	//console.log('***************************************************insideETA****************************');
	var moment = require("moment");
	var today = new Date();
	var datestring = today.toISOString().substring(0, 10);
	var todayMoment = new moment(datestring, "YYYY-MM-DD");
	var timeTOAdd = 86399 + 86400 ;
	var selectedDay = new moment(datestring, "YYYY-MM-DD");
	var nextDay1 = new moment(datestring, "YYYY-MM-DD");
	var nextDayClone = new moment(nextDay1);
	var nextDay = nextDay1.add(timeTOAdd, 'seconds');
	var query = {};
	query.settle_status = false;
	//console.log('selectedDay.toDate()',selectedDay.toDate())
	//console.log('nextDay.toDate()',nextDay.toDate())
	query.pickup_date = {
		"$gte": selectedDay.toDate(),
		"$lt": nextDay.toDate()
	}
	query.trip_type = "Reservation";
	query.is_deleted = {'!': true};
	query.trip_status = ["Checked In", "On Route" , "Circling" , "On Location", "Loaded"];
		Tripreservation.find(query)
			// .populate('payment')
			.populate('customer_id')
			.populate('driver_id')
			// .populate('vehicle_type')
			// .populate('driver_share')
			// .populate('assigned_drivers')
			.sort({
				"pickup_date": 1,
				"pickup_time": 1
			}).exec(function(error, trips) {
				if(error){
						return next(error);
				}
				 //console.log("Trips Lenght is " , trips.length , selectedDay.toDate() , nextDay.toDate() );	
				etaService.getEtaFromGoogle(trips, trips,moment , next);
			});
};

exports.getEtaFromGoogle = function(onRouteTrips, trips, moment ,cb) {
	var googleServerKey = "AIzaSyAdzEw0TN9tNwnvcYWUds69MffiKvhFJQM" ;//"AIzaSyBapJv-RG4-wNDo1UJHp2p_bvSZAnkdk_M" ; 
	var origins = "";
	var destinations = "";
	var requestObj = require("request");
	var urlArr = [];
	var tripArr = [];
	var tripOnRoutes = [];
	var url = "";
	// ZERO_RESULTS / OK
	var j = 0;

	for (var i = 0; i < onRouteTrips.length; i++) {

		//change lat long of driver here when complete also check  driver_id
		if (typeof onRouteTrips[i].driver_id == "object") {
				 //console.log("ONDUTYSTATUS" , onRouteTrips[i].driver_id  ,  onRouteTrips[i].driver_id.onduty_status , "Lat " , onRouteTrips[i].driver_id.lat  , onRouteTrips[i].driver_id.lng );
			if (onRouteTrips[i].driver_id.onduty_status && onRouteTrips[i].driver_id.lat && onRouteTrips[i].driver_id.lng) {
				j++;

				tripArr.push({
					trip_id: onRouteTrips[i].id
				});
					// eta based on Driver to pickup location 
				if (onRouteTrips[i].trip_status == "Checked In" || onRouteTrips[i].trip_status == "On Route"  || onRouteTrips[i].trip_status == "Circling" /* ||  onRouteTrips[i].trip_status == "On Location"*/) {
					origins += (onRouteTrips[i].driver_id.lat + "," + onRouteTrips[i].driver_id.lng);
					if (onRouteTrips[i].pickup_address_lat && onRouteTrips[i].pickup_address_lng) {
						destinations += (onRouteTrips[i].pickup_address_lat + "," + onRouteTrips[i].pickup_address_lng)
						//console.log('Checked in,onroute,Circling: lat lng found',destinations);
					} else {
						destinations += encodeURIComponent(onRouteTrips[i].pickup_address);
						//console.log('Checked in,onroute,Circling: lat lng not found',destinations);
					}
				} else {
					// Eta based on  driver to dropoff address 
					origins += (onRouteTrips[i].driver_id.lat + "," + onRouteTrips[i].driver_id.lng);
					if (onRouteTrips[i].dropoff_address_lat && onRouteTrips[i].dropoff_address_lng) {
						destinations += (onRouteTrips[i].dropoff_address_lat + "," + onRouteTrips[i].dropoff_address_lng);
						//console.log('loaded,on location: lat lng found',destinations);
					} else {
						destinations += encodeURIComponent(onRouteTrips[i].dropoff_address);
						//console.log('loaded,on location: lat lng not found',destinations);
					}
				}
				

		//console.log("Trip " , onRouteTrips[i].conf_id , " Source ", origins , "destinations" , destinations) ;  
				// As Google return only eta max of 10 addresses at a moment to create  batches of 10 routings
				if (j % 10 == 0 || i == (onRouteTrips.length - 1)) {
					// console.log("HERE inthe loop ", j, "I is ", i)
					var url = "https://maps.googleapis.com/maps/api/distancematrix/json?";
					url += "origins=" + origins;
					url += "&destinations=" + destinations;
					url += "&departure_time=" + moment().unix();
					url +="&key="+googleServerKey ;
					urlArr.push(url);
					origins = destinations = "";
					tripOnRoutes.push(tripArr);
					tripArr = [];
				}

				if ( /*i > 0  && */ i < (onRouteTrips.length - 1)) {
					// console.log()
					origins += "|";
					destinations += "|";
				}
			}
		}
	}

	var op = [];
	//callback here to handle the batch  ETA Calling 
	function callGoogleEta(url, counter, tripIds, cb) {
		//console.log("URL IS " , url );
		// return cb(null ,  tripIds) ; 
		//call the http to get the desired results here
		requestObj(url, function(err, response, body) {
			// console.log("Err" , err , "Respo" , response , "Body " , body  , typeof body);
			try {
				var response = JSON.parse(body);
				// console.log("Res==" , response)
				// if(response.status!=="OK"){
				// 	return  cb(null ,  tripIds) ; 
				// }
				var resp = response.rows;
				//console.log("HHHHEERRREE", tripIds.length, "Response Lenght ", response.rows.length);
				// console.log("RESPONSE ETA IS" , response.rows);

				if (response.rows.length) {
					if (response.rows[0].elements) {
						for(var j=0 ; j<response.rows.length ; j++ ){

						for (var i = 0; i < response.rows[j].elements.length; i++) {
							if (response.rows[j].elements[i] && i==j) {
								if (response.rows[j].elements[i].status == "OK") {
									if (typeof response.rows[j].elements[i].duration_in_traffic == "object") {
										tripIds[i].eta_seconds = response.rows[j].elements[i].duration_in_traffic.value;
										tripIds[i].eta_text = response.rows[j].elements[i].duration_in_traffic.text;
										// console.log("TIME", response.rows[i].elements[0].duration_in_traffic.value  , response.rows[i].elements[0].duration_in_traffic.text);
									} else {
										tripIds[i].eta_seconds = response.rows[j].elements[i].duration.value;
										tripIds[i].eta_text = response.rows[j].elements[i].duration.text;
										// console.log("TIME", response.rows[i].elements[0].duration.value  , response.rows[i].elements[0].duration.text);
									}
								}
							} else {

							}
						}
						}
					} else {
					}
				}
				// for (var i = 0; i < response.rows.length; i++) {
				// 	if (response.rows[i].elements) {
				// 		if (response.rows[i].elements[0]) {
				// 			if (response.rows[i].elements[0].status == "OK") {
				// 				if (typeof response.rows[i].elements[0].duration_in_traffic == "object") {
				// 					tripIds[i].eta_seconds = response.rows[i].elements[0].duration_in_traffic.value;
				// 					tripIds[i].eta_text = response.rows[i].elements[0].duration_in_traffic.text;
				// 					// console.log("TIME", response.rows[i].elements[0].duration_in_traffic.value  , response.rows[i].elements[0].duration_in_traffic.text);
				// 				} else {
				// 					tripIds[i].eta_seconds = response.rows[i].elements[0].duration.value;
				// 					tripIds[i].eta_text = response.rows[i].elements[0].duration.text;
				// 					// console.log("TIME", response.rows[i].elements[0].duration.value  , response.rows[i].elements[0].duration.text);
				// 				}
				// 			}
				// 		} else {

				// 		}
				// 	} else {

				// 	}
				// }
				return cb(null, tripIds);
			} catch (e) {
				return cb(e);
			}

		});
	}
	var i = 0;
	var recursive = function(err, succ) {
		if (i > 0) {
			if(succ){
				for(var k=0 ; k< succ.length ; k++ ){
					op.push(succ[k]);
				}
			}
		}
		if (i == urlArr.length) {
			// return from here 
			// console.log("CB is " , op , onRouteTrips.length );
			//save and update in db here 
			Tripeta.destroy({}).exec(function(e, s) {
				if (op.length) {
					var outputArr = [];
					for(var k=0 ; k< op.length ; k++){
						//console.log(op) ;
						if(op[k].eta_text )outputArr.push(op[k]);
					}
					if(!outputArr.length) return cb(null); 
					
					Tripeta.create(outputArr).exec(function(err, etaTrips) {
						return cb(null, etaTrips);
					})
				} else {
					//return error from here 
					return cb(null);
				}
			});
		}
		i++;
		if (i <= urlArr.length)
			callGoogleEta(urlArr[i - 1], i , tripOnRoutes[i-1] , recursive);
	}
	recursive();
	// console.log("URLS ", tripOnRoutes ,  urlArr.length, urlArr);	
};

exports.calculateEta = function(onRouteTrips, trips, cb) {
	var moment = require('moment');
	if (!onRouteTrips.length) return cb(null, trips);
	var j = 0;
	var ids = [];
	for (var i = 0; i < onRouteTrips.length; i++) {
		j++;
		ids.push(onRouteTrips[i].id);
	}

	Tripeta.find({
		trip_id: ids
	}).exec(function(err, etaTrips) {
		if (err || !etaTrips) {
			if (!onRouteTrips.length) return cb(null, trips);
		}
		for (var i = 0; i < etaTrips.length; i++) {
			var dt = new moment(etaTrips[i].createdAt);
			dt.add(etaTrips[i].eta_seconds, 'seconds');
			for (var j = 0; j < trips.length; j++) {
				if (trips[j].id == etaTrips[i].trip_id) {
					trips[j].eta_time = dt.format("hh:mm A");
					trips[j].eta_text = etaTrips[i].eta_text;
					//also need to check early and late  
					if (trips[j].trip_status == "Checked In" || trips[j].trip_status == "On Route" || trips[j].trip_status == "Circling" || trips[j].trip_status == "On Location") {
						//need to compare  with trip date and time 
						var tripDate = new moment(trips[j].pickup_date/*, "YYYY-MM-DD"*/);
						var pickupTime = moment.duration(trips[j].pickup_time, "HH:mm:ss").asSeconds()
						tripDate.add(pickupTime, 'seconds');
						var diff = tripDate.diff(dt, 'minutes');
						//console.log("Diff is ==>> " , diff , tripDate.toDate() , dt.toDate() );
						if (diff <= 0) {
							//late
							trips[j].eta_early = "late"
						} else {
							//early
							trips[j].eta_early = "early";
						}
					}
				}
			}
		}
			return cb(null, trips);
	});
};