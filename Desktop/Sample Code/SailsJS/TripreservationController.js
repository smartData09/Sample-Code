/**
 * TripreservationController
 *
 * @description :: Server-side logic for managing things
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */
var TripreservationController = {

	get_trip_list: function(req, res, next) {
		var request = req.body;
		var staff = req.staff;
		//console.log("Staff is " ,request);
		//console.log("Start Date is " , request.start , "endDate" , request.end );
		var moment = require("moment");
		var today = new Date();

		var datestring = moment(today).format('YYYY-MM-DD');
		// var datestring = today.toISOString().substring(0, 10);
		var todayMoment = new moment(datestring, "YYYY-MM-DD");
		// console.log("Date String", datestring, todayMoment.toDate());

		if (typeof request.start !== "undefined" && typeof request.endday !== "undefined") {
			var selectedDay = new moment(request.start, "YYYY/MM/DD");
			var nextDay1 = new moment(request.endday, "YYYY/MM/DD");
			var nextDayClone = new moment(nextDay1);
			var nextDay = nextDay1.add(86399, 'seconds');
		} else {

			// datestring = "2015-09-18"  ; //datestring.toString();
			//console.log(datestring);
			var timeTOAdd = 86399 /*+ 86400*/ ;
			var selectedDay = new moment(datestring, "YYYY-MM-DD");
			var nextDay1 = new moment(datestring, "YYYY-MM-DD");
			var nextDayClone = new moment(nextDay1);
			var nextDay = nextDay1.add(timeTOAdd, 'seconds');

		}

		var query = {};
		if (!request.ss) {
			query.settle_status = false;
		}
		if (typeof request.trip !== "undefined") {
			if (request.trip == "-") {
				query.trip_status = ["Pending", "Broadcasted", "Aligned"]
			} else {
				query.trip_status = request.trip;
			}
		}
		if (typeof request.vehicle !== "undefined")
			query.vehicle_type = request.vehicle;
		if (typeof request.tript !== "undefined")
			query.trip_for = request.tript;
		if (typeof request.servicet !== "undefined")
			query.service_type = request.servicet;
		if (typeof request.dispatcht !== "undefined")
			query.dispatch_status = request.dispatcht;
		if (typeof request.settle !== "undefined")
			query.settle_status = request.settle;

		if (selectedDay) {
			query.pickup_date = {
				"$gte": selectedDay.toDate(),
				"$lt": nextDay.toDate()
			}
		};
		query.trip_type = "Reservation";
		//condtion to select non deleted trips only.
		query.is_deleted = {
			'!': true
		};
		//console.log("Query", query);
		// console.log("Query", query, "Se", selectedDay.toDate(), nextDay.toDate(), nextDay1.toDate(), request);
		//add date filter in case of date range is selected
		Tripreservation.find(query)
			.populate('payment')
			.populate('customer_id')
			//.populate('driver_id')
			.populate('vehicle_type')
			.populate('driver_share')
			// .populate('assigned_drivers')
			.sort({
				"pickup_date": 1,
				"pickup_time": 1
			}).exec(function(error, trips) {
				if (error) return res.status(400).json({
					"error": error
				});
				var Trips = _.clone(trips);
				var output = [];
				var driversId = [];
				var tripIds = [];
				var onRouteTrips = [];
				//check for flight details 
				var flightTrips = [];
				for (var i = 0; i < Trips.length; i++) {
					var op = Trips[i];
					if (op.trip_notes) {
						if (op.trip_notes.length >= 50) {
							op.trip_notes_large = true;
						}
					}
					op.sort_time = 0;
					if (op.pickup_time) op.sort_time = op.pickup_time;
					if (op.dispatch_notes) {
						if (op.dispatch_notes.length >= 50) {
							op.dispatch_notes_large = true;
						}
					}

					if (op.driver_id) driversId.push(op.driver_id);
					else tripIds.push(op.id);



					if (staff.settings) {
						if (staff.settings.date_format == "24hr") {
							op.formatted_pickup_time = getTime(op.pickup_time);
						} else {
							//AM/PM
							op.formatted_pickup_time = moment("2015-01-01").startOf('day').seconds(op.pickup_time).format('hh:mm A');

						}


					} else {
						op.formatted_pickup_time = getTime(op.pickup_time);
					}

					if (op.pickup_time) op.pickup_time = getTime(op.pickup_time);
					if (op.dropoff_time) op.dropoff_time = getTime(op.dropoff_time);
					if (op.pickup_date) op.pickup_date = moment(op.pickup_date).format("MM/DD/YYYY");
					// console.log("\n\n\n Trips[i]",Trips[i].trip_type ,"==" , Trips[i].service_type, todayMoment.toDate(), "==", selectedDay.toDate(), Trips[i].flight_number, nextDayClone.toDate());
					// console.log("Flight is not coming ", Trips[i].conf_id, todayMoment.isSame(selectedDay), nextDayClone.toDate(), todayMoment.toDate(), "==", selectedDay.toDate(), todayMoment.toDate() == selectedDay.toDate())
					if (Trips[i].trip_type == "Reservation" && Trips[i].service_type == "From Airport" && Trips[i].flight_number && Trips[i].airline && (todayMoment.isSame(selectedDay) && nextDayClone.toDate())) {
						// console.log("Here");
						flightTrips.push(op);
					}

					if (Trips[i].trip_type == "Reservation" &&
						(Trips[i].trip_status == "Checked In" ||
							Trips[i].trip_status == "On Route" ||
							Trips[i].trip_status == "Circling" ||
							Trips[i].trip_status == "On Location" ||
							Trips[i].trip_status == "Loaded"
							/*||i< 100*/
						)) {
						// console.log(   "address" ,  encodeURIComponent(Trips[i].pickup_address) );
						onRouteTrips.push(op);
					}
					output.push(op);


				}

				// console.log("On Route Trips " ,onRouteTrips) ; 
				etaService.calculateEta(onRouteTrips, output, function(error, output) {

					tripReservationService.getinvitationDriver(output, tripIds, function(error, output) {

						if (driversId.length) {
							Driver.find({
									"id": driversId
								})
								.populate('fleet')
								.populate('driver_percentage')
								.exec(function(error, driverData) {

									if (!error && driverData) {
										if (driverData.length) {
											for (var i = 0; i < output.length; i++) {
												for (var j = 0; j < driverData.length; j++) {
													if (output[i].driver_id) {
														if (output[i].driver_id == driverData[j].id) {
															output[i].driver_id = driverData[j];
															output[i].driver_name = driverData[j].nick_name ? driverData[j].nick_name : driverData[j].first_name + " " + driverData[j].last_name;
															// console.log("Here Driver DetailC >>>" , output[i].conf_id , " " ,  output[i].driver_id.id , "output[j].driver_name" , output[j].driver_name ) ; 

															//calculate FOT Share if any 
															if (driverData[j].type == "A" || driverData[j].type == "D") {
																if (output[i].payment[0] && driverData[j].driver_percentage) {
																	if (output[i].driver_share && (typeof output[i].driver_share == "object")) {
																		// output[i].driver_share = 0 ; 
																		if (output[i].driver_id == driverData[j]) {
																			output[i].driver_share = output[i].driver_share.trip_amount;
																		} else {
																			output[i].driver_share = driverService.calculateCost(output[i].payment[0], driverData[j].driver_percentage);
																		}
																	} else {
																		output[i].driver_share = driverService.calculateCost(output[i].payment[0], driverData[j].driver_percentage);
																	}
																}
																output[i].driver_share = convert2digits(output[i].driver_share);
															} else {
																delete output[i].driver_share;

															}
														}
													} else {
														delete output[i].driver_share;
													}
												}
											}
										}
									}
									// console.log("+++Flight Trip Length is " , flightTrips.length) ; 
									//output = fieldSort(output, ["driver_name", "sort_time"]);
									//console.log("Here >>>output in", output);
									if (flightTrips.length) {
										// console.log("Here135");
										var dateString = todayMoment.format('YYYYMMDD');
										flightsData.flightsEta(flightTrips, dateString, function(error, flightResposne) {
											// console.log("flightResposne" , flightResposne) ; 
											return res.json(output);
										});
									} else {
										return res.json(output);
									}
								});

						} else {
							// console.log("+++Flight Trip Length is " , flightTrips.length) ; 
							//output = fieldSort(output, ["driver_name", "sort_time"]);
							//console.log("Here >>>output out", output);
							if (flightTrips.length) {
								// console.log("Here12345");
								var dateString = todayMoment.format('YYYYMMDD');
								flightsData.flightsEta(flightTrips, dateString, function(error, flightResposne) {
									return res.json(output);
								});
							} else {
								return res.json(output);
							}
						}
					});
				});
			});

	},
	get_trip_location: function(req, res, next) {
		var id = req.body.id;
		if (typeof id == "undefined") {

			if (error) return res.status(400).json({
				"error": "missing parameter  id "
			});
		}

		Tripreservation.findOne(id).exec(function(error, tripInfo) {
			//console.log("tripInfo", tripInfo);
			if (error) {
				return res.json({
					"error": error
				});
			}

			if (!tripInfo)
				return res.json({
					"error": "no trip "
				});


			var op = [];
			if (typeof tripInfo.pickup_address_lat !== "undefined" && typeof tripInfo.pickup_address_lng !== "undefined") {
				op.push({
					"type": "pu",
					"lat": tripInfo.pickup_address_lat,
					"lng": tripInfo.pickup_address_lng,
					"address": tripInfo.pickup_address
				})
			}


			if (tripInfo.stop_address) {

				if (tripInfo.stop_address.length) {
					var sa = tripInfo.stop_address;
					for (var i = 0; i < sa.length; i++) {
						if (sa[i].lat && sa[i].lng)
							op.push(sa[i]);
					}
				}
			}

			if (typeof tripInfo.dropoff_address_lat !== "undefined" && typeof tripInfo.dropoff_address_lng !== "undefined") {
				op.push({
					"type": "do",
					"lat": tripInfo.dropoff_address_lat,
					"lng": tripInfo.dropoff_address_lng,
					"address": tripInfo.dropoff_address

				})
			}

			// if(tripInfo.driver_id && typeof tripInfo.driver_id =="object"){
			// 	if(typeof tripInfo.driver_id.lat !=="undefined" && tripInfo.driver_id.lng !=="undefined" ){
			// 		op.push({
			// 			"type": "driver",
			// 			"lat": tripInfo.driver_id.lat,
			// 			"lng": tripInfo.driver_id.lng
			// 		})
			// 	}
			// }	

			if (tripInfo.driver_id) {

				Driver.findOne({
					id: tripInfo.driver_id
				}).populate('fleet').exec(function(error, driverObj) {
					if (error) {
						return res.json({
							"error": error
						});
					}
					var driver = _.clone(driverObj);
					if (driver) {
						if (typeof driver.lat !== "undefined" && driver.lng !== "undefined") {
							op.push({
								"type": "driver",
								"lat": driver.lat,
								"lng": driver.lng
							})
						}

						if (driver.fleet) {

							if (driver.fleet.vehicle_type) {


								Vehicletype.findOne({
									id: driver.fleet.vehicle_type
								}).exec(function(err, vt) {
									if (typeof vt !== "undefined") {
										driver.fleet.vehicle_type = vt.vehicle_type;
										return res.json({
											"pins": op,
											"driver": driver,
											"trip_status": tripInfo.trip_status
										});

									} else {
										return res.json({
											"pins": op,
											"driver": driver,
											"trip_status": tripInfo.trip_status
										});
									}
								})
							}
						}
					} else {
						return res.json({
							"pins": op,
							"trip_status": tripInfo.trip_status
						});
					}
				});
			} else {

				return res.json({
					"pins": op,
					"trip_status": tripInfo.trip_status
				});
			}



		});


	},
	get_trip_log: function(req, res) {
		var id = req.body.id;
		if (typeof id == "undefined") {

		}
		Triplog.find({
				"trip_id": id
			})
			.populate('staff')
			.populate('customer')
			.populate('driver')
			.exec(function(error, logs) {
				if (error)
					return res.status(400).json({
						"error": error
					});
				return res.json(logs);
			});
	},
	trip_update: function(req, res) {
		var id = req.params.trip_id;
		var data = _.pick(req.body, 'customer_discussion_notes');
		//console.log(req.params);
		//console.log(req.body);
		Tripreservation.update({
			"id": id
		}, data).exec(function(error, logs) {
			//console.log(error);
			if (error)
				return res.status(400).json({
					"error": error
				});
			return res.json(logs);
		});
	},
	// method to upload trips in bulk
	upload_trips: function(req, res) {
		var fs = require('fs');
		var validator = require('validator');
		var moment = require("moment");
		// console.log(" Account Id is ", req.body, "==", req.param('account_id'));
		var request = req.body; //  _.pick(req.body , "account_id" , )
		//console.log(request);
		// payment_method
		if (!request.account_id) {
			return res.status(400).json({
				"error": "invalid account id of selected customer"
			});
		}

		if (!request.customer_id) {
			return res.status(400).json({
				"error": "invalid customer_id  of selected customer"
			});
		}

		var account_id = request.account_id;
		var customer_id = request.customer_id;

		if (!request.payment_method) {
			return res.status(400).json({
				"error": "invalid payment method"
			});
		}

		if (request.payment_method == "cc") {
			if (!request.payment_profile_id) {
				return res.status(400).json({
					"error": "Payment Profile Id not found for selected card"
				});
			}
		}


		req.file('file').upload(function(err, uploadedFiles) {
			if (err) return res.send(500, err);
			//console.log(err, uploadedFiles.length);

			if (uploadedFiles.length /*typeof uploadedFiles !=="undefined"*/ ) {

				var fd = uploadedFiles[0].fd;
				fs.readFile(fd, 'utf8', function(err, data) {
					// Print the contents of the file as a string here
					// and do whatever other string processing you want
					//console.log(data);
					var Converter = require("csvtojson").Converter;
					var converter = new Converter({}); //for big csv data 
					converter.fromString(data, function(err, result) {
						Vehicletype.find({
							"enable": "Y"
						}, {
							"vehicle_type": true
						}).exec(function(err, vt) {

							//your code here 
							//console.log("VT ", vt);
							//validate and create Trips from here 

							var TripArray = [];
							var counter = 0;
							for (var i = 0; i < result.length; i++) {
								if (result[i].pickup_address !== "") {

									if (!validator.isDate(result[i].pickup_date)) {
										return res.status(400).json({
											"error": "invalid pickupdate"
										});
									}
									if (result[i].pickup_time == "") {
										return res.status(400).json({
											"error": "invalid pickup time "
										});
									}

									if (result[i].email == "") {
										return res.status(400).json({
											"error": "Email is required"
										});
									}

									var vehicle_type = null;
									for (var j = 0; j < vt.length; j++) {
										if (result[i].vehicle_type == vt[j].vehicle_type)
											vehicle_type = vt[j].id;
									}
									if (!vehicle_type) {
										return res.status(400).json({
											"error": "invalid vehicle type "
										});
									}

									// var pickup = new moment(result[i].pickup_date, "YYYY-MM-DD");
									var pickup = new moment(result[i].pickup_date, "MM-DD-YYYY");
									var pickup_time = moment.duration(result[i].pickup_time, "HH:mm:ss").asSeconds();
									var dropoff_time;
									if (result[i].dropoff_time) {
										var dropoff_time = moment.duration(result[i].dropoff_time, "HH:mm:ss").asSeconds();
									}


									result[i].stop_address = [];
									// if (result[i].routing_type !== "") {
									// 	result[i].stop_address.push({
									// 		"type": result[i].routing_type || null,
									// 		"address": result[i].routing_address || null,
									// 		"lat": result[i].routing_address_lat || null,
									// 		"lng": result[i].routing_address_long || null
									// 	})

									// }

									var payment = {};
									payment = {
											"payment_mode": request.payment_method,
											"credit_card_number": request.credit_card_number || null,
											"expire_month": request.expire_month || null,
											"expire_year": request.expire_year || null,
											"billing_zip_code": request.billing_zip_code || null,
											"card_holder_name": request.card_holder_name || null,
											"payment_profile_id": request.payment_profile_id || null,

											"base_rate": result[i].base_rate || 0,
											// "hourly_unit": result[i].hourly_unit || 0,
											// "hourly_price": result[i].hourly_price || 0,
											// "stop_charges": result[i].stop_charges || 0,
											// "early_fee": result[i].early_fee || 0,
											// "holiday_surcharge": result[i].holiday_surcharge || 0,
											"discount_percentage": result[i].discount_percentage || 0,
											// "discount_dollar": result[i].discount_dollar || 0,
											"gratuity_percentage": result[i].gratuity_percentage || 0,
											// "gratuity_dollar": result[i].gratuity_dollar || 0,
											"booster_seat": result[i].booster_car_seat_charges || 0,
											"forward_seat": result[i].forward_car_seat_charges || 0,
											"rear_seat": result[i].rear_car_seat_charges || 0,
											"other_amount": result[i].other_charges || 0,
											"total": result[i].total || 0
										}
										//console.log("Payment Object is +++>", payment, result[i], result[i].total);

									TripArray.push({
										"trip_type": "Reservation",
										"account_id": account_id,
										"customer_id": customer_id,
										"first_name": result[i].first_name,
										"last_name": result[i].last_name,
										"email": result[i].email,
										"phone_number": result[i].phone_number,
										"company_name": result[i].company_name || null,
										"stop_address": result[i].stop_address,
										"pickup_address": result[i].pickup_address || null,
										"service_type": result[i].service_type || null,
										"vehicle_type": vehicle_type,
										"pickup_date": pickup.toDate(),
										"pickup_time": pickup_time,
										"dropoff_time": dropoff_time || null,
										"pickup_address_lat": result[i].pickup_address_lat || null,
										"pickup_address_lng": result[i].pickup_address_lng || null,
										"dropoff_address": result[i].dropoff_address || null,
										"dropoff_address_lat": result[i].dropoff_address_lat || null,
										"dropoff_address_lng": result[i].dropoff_address_lng || null,
										"trip_notes": result[i].trip_notes,
										"dispatch_notes": result[i].dispatch_notes,
										"number_of_passengers": result[i].number_of_passengers || null,
										"no_of_bags": result[i].number_of_bags || null,
										"booster_car_seat": result[i].booster_car_seat || null,
										"forward_car_seat": result[i].forward_car_seat || null,
										"rear_car_seat": result[i].rear_car_seat || null,
										"payment": payment
									});
									counter++;

								} else if (result[i].pickup_address == "") {
									//push in existing  record
									if (result[i].routing_type !== "") {
										// TripArray[counter - 1].stop_address.push({
										// 	"type": result[i].routing_type || null,
										// 	"address": result[i].routing_address || null,
										// 	"lat": result[i].routing_address_lat || null,
										// 	"lng": result[i].routing_address_long || null
										// });
									}
								}
							}

							//save here in the callback
							var i = 0;
							var op = [];
							var recursive = function(err, succ) {
								if (i > 0) {
									if (err) {
										ids = [];
										var len = op.length;
										for (var counter = 0; counter < len; counter++) {
											ids.push(op[counter].id);
										}
										if (ids.length) {
											Tripreservation.destroy({
												"id": ids
											}).exec();
										}
										return res.status(400).json({
											"error": err
										});

									}
									if (succ) {
										op.push(succ);
									}

								}
								if (i == TripArray.length) {
									return res.json({
										message: uploadedFiles.length + ' file(s) uploaded successfully!',
										files: uploadedFiles,
										result: result,
										tripArray: TripArray,
										output: op
									});
								}
								i++;
								if (i <= TripArray.length)
									saveTrip(TripArray[i - 1], recursive);

							}

							function saveTrip(tripObj, cb) {
								var payment = tripObj.payment;
								delete tripObj.payment;
								Tripreservation.create(tripObj).exec(function(err, succ) {
									//console.log("Err", err);
									if (err) {
										return cb(err);
									}
									payment.trip_id = succ.id;
									Trippaymentdetails.create(payment).exec(function(error, trippayment) {
										//console.log("Err", error);
										if (error) {
											Tripreservation.destroy({
												"id": succ.id
											}).exec();
											return cb(error);
										}
										var succ1 = _.clone(succ);
										succ1.payment = trippayment;
										return cb(null, succ1);
									});
								});
							}
							recursive();
						});

					});
				});
			} else {
				return res.status(400).json({
					"error": "No Input file is received"
				});
			}

		});
	},
	driver_settlement: function(req, res, next) {
		var request = req.body || {};
		var type = request.type;
		var tripId = request.trip_id;
		var driverId = request.driver_id;
		//console.log("type********",type);
		//console.log("tripId********",tripId);
		//console.log("driverId********",driverId);
		if (!type) {
			return res.status(400).json({
				"error": "type is not defined"
			});
		}

		if (!tripId) {
			return res.status(400).json({
				"error": "tripId not found"
			});
		}

		if (!driverId) {
			return res.status(400).json({
				"error": "driver not found"
			});
		}

		if (type == "update") {

			Tripreservation.findOne({
					"id": request.trip_id
				})
				.populate('driver_share')
				.populate('payment')
				.exec(function(err, trip) {

					if (!trip) {
						return res.status(400).json({
							"err": "trip not found"
						});
					}
					if (!trip.driver_id) {
						return res.status(400).json({
							"err": "Driver not aligned"
						});
					}
					//console.log("Trip Share ", trip);

					Driveraffilateaccount.findOne({
							"trip_id": trip.id,
							"driver_id": trip.driver_id
						})
						.exec(function(error, aff) {
							if (error) {
								return res.status(400).json({
									"error": error
								});
							}
							var obj = _.pick(request, "base_rate", "hourly", "extra_stops", "wait_time", "early_late_fee", "greet_meet", "holiday_surcharge", "discount_percentage", "discount_percentage", "discount_dollar", "gratuity_percentage", "gratuity_dollar", "booster_seat", "forward_seat", "rear_seat", "other_amount", "other_costs");
							//console.log(obj);
							obj.reservation_amount = Number(request.reservation_total);
							obj.trip_amount = Number(request.trip_amount);
							obj.driver_id = trip.driver_id;
							obj.trip_id = trip.id;
							if (trip.payment) {
								if (trip.payment[0]) {
									obj.payment = trip.payment[0].id;
								}

							}


							billCronService.checkAndUpdateBill(trip.id, obj.trip_amount, function(err, bill) {
								// if found invoice  update invoice as well as in bill.com  if bill is not paid

								if (!aff) {
									//insert here 
									Driveraffilateaccount.create(obj).exec(function(err, createdObj) {
										if (err) {
											return res.status(400).json({
												"error": err
											});
										}
										trip.driver_share = createdObj.id;
										trip.save();
										return res.json(createdObj);
									});
								} else {
									Driveraffilateaccount.update({
										"id": aff.id
									}, obj).exec(function(err, updatedObj) {
										if (err) {
											return res.status(400).json({
												"error": err
											});
										}
										if (!trip.driver_share) {
											//console.log("Here ");
											trip.driver_share = updatedObj[0].id;

											trip.save(function(e, s) {
												console.log(e, s);

											});
										}

										return res.json(updatedObj[0]);
									});
								}
							});
						});
				});

		} else if (type == "settle") {

			Tripreservation.findOne({
					"id": tripId
				})
				.populate('driver_share')
				.populate('payment')
				.exec(function(error, reservation) {
					// console.log("Reservation >>>>" , reservation );
					if (error || !reservation) {
						return res.status(400).json({
							"error": "Trip not found"
						})
					}

					if (!reservation.driver_share) {
						return res.status(400).json({
							"error": "Driver share should be  saved first"
						})
					}

					if (reservation.settle_status) {
						return res.status(400).json({
							"error": "Trip is already settled"
						});
					}

					if (reservation.settle_status) {
						return res.status(400).json({
							"error": "Trip is already settled"
						});
					}

					if (reservation.trip_status !== "Completed") {
						return res.status(400).json({
							"error": "Trip should be completed"
						});
					}


					reservation.settle_status = true;
					if (!reservation.settle_date) reservation.settle_date = new Date();
					reservation.save();
					return res.json(reservation);
				});

		} else if (type == "reopen") {

			Tripreservation.findOne({
				"id": tripId
			}).exec(function(error, reservation) {
				if (error || !reservation) {
					return res.status(400).json({
						"error": "Trip not found"
					})
				}

				if (!reservation.settle_status) {
					return res.status(400).json({
						"error": "Trip is already reopen"
					});
				}
				//here check  for invoice if it is already paid
				DriverInvoices
					.findOne({
						"trips": tripId
					})
					.sort({
						createdAt: -1
					})
					.exec(function(err, invoice) {
						if (err) {
							return res.status(400).json({
								"error": "Error in checking corresponding bills "
							})
						}

						if (invoice) {
							if (invoice.is_paid) {
								return res.status(400).json({
									"error": "Bill is already paid for this trip to driver,Not permitted to proceed"
								})
							}
						}
						/*else{
											// No Invoice is generated yet just unsettle it 

										}*/
						reservation.settle_status = false;
						reservation.save();
						return res.json(reservation);
					});

			});
		} else {
			return res.status(400).json({
				"error": "Invalid action  performed"
			});

		}

	},
	get_driver_share: function(req, res, next) {
		var request = req.body || {};
		var tripId = request.trip_id;
		var driverId = request.driver_id;

		if (!tripId) {
			res.status(400).json({
				"error": "tripId not found"
			});
		}

		if (!driverId) {
			res.status(400).json({
				"error": "driver not found"
			});
		}

		Driveraffilateaccount.findOne({
			"trip_id": tripId,
			"driver_id": driverId
		}).exec(function(error, driverShare) {
			if (error) {
				return res, status(400).json({
					"error": error
				})
			}
			if (!driverShare) {
				return res.json({
					"count": 0,
					"data": null
				});
			}

			var driver_share = _.clone(driverShare)
				//make proper resposne here and return  in the response
			var pObj = {};
			var amtObj = {};
			if (driver_share.base_rate) {
				pObj.base_rate = driver_share.base_rate.percentage
				amtObj.base_rate = driver_share.base_rate.amount
			}

			if (driver_share.hourly) {
				pObj.hourly = driver_share.hourly.percentage
				amtObj.hourly = driver_share.hourly.amount
			}

			if (driver_share.extra_stops) {
				pObj.extra_stops = driver_share.extra_stops.percentage
				amtObj.extra_stops = driver_share.extra_stops.amount
			}


			if (driver_share.wait_time) {
				pObj.wait_time = driver_share.wait_time.percentage
				amtObj.wait_time = driver_share.wait_time.amount
			}

			if (driver_share.early_late_fee) {
				pObj.early_late_fee = driver_share.early_late_fee.percentage
				amtObj.early_late_fee = driver_share.early_late_fee.amount
			}

			if (driver_share.greet_meet) {
				pObj.greet_meet = driver_share.greet_meet.percentage
				amtObj.greet_meet = driver_share.greet_meet.amount
			}

			if (driver_share.holiday_surcharge) {
				pObj.holiday_surcharge = driver_share.holiday_surcharge.percentage
				amtObj.holiday_surcharge = driver_share.holiday_surcharge.amount
			}

			if (driver_share.discount_percentage) {
				pObj.discount_percentage = driver_share.discount_percentage.percentage
				amtObj.discount_percentage = driver_share.discount_percentage.amount
			}

			if (driver_share.discount_dollar) {
				pObj.discount_dollar = driver_share.discount_dollar.percentage
				amtObj.discount_dollar = driver_share.discount_dollar.amount
			}

			if (driver_share.gratuity_percentage) {
				pObj.gratuity_percentage = driver_share.gratuity_percentage.percentage
				amtObj.gratuity_percentage = driver_share.gratuity_percentage.amount
			}

			if (driver_share.gratuity_dollar) {
				pObj.gratuity_dollar = driver_share.gratuity_dollar.percentage
				amtObj.gratuity_dollar = driver_share.gratuity_dollar.amount
			}

			if (driver_share.booster_seat) {
				pObj.booster_seat = driver_share.booster_seat.percentage
				amtObj.booster_seat = driver_share.booster_seat.amount
			}

			if (driver_share.rear_seat) {
				pObj.rear_seat = driver_share.rear_seat.percentage
				amtObj.rear_seat = driver_share.rear_seat.amount
			}

			if (driver_share.forward_seat) {
				pObj.forward_seat = driver_share.forward_seat.percentage
				amtObj.forward_seat = driver_share.forward_seat.amount
			}

			if (driver_share.other_amount) {
				pObj.other_amount = driver_share.other_amount.percentage
				amtObj.other_amount = driver_share.other_amount.amount
			}
			var responseObj = {};
			responseObj.other_costs = driver_share.other_costs;
			responseObj.reservation_amount = driver_share.reservation_amount;
			responseObj.trip_amount = driver_share.trip_amount;
			responseObj.id = driver_share.id;
			responseObj.driver_id = driver_share.driver_id;
			responseObj.trip_id = driver_share.trip_id;
			responseObj.createdAt = driver_share.createdAt;
			responseObj.percentage = pObj;
			responseObj.amount = amtObj;
			return res.json({
				"count": 1,
				"data": responseObj
			});

		});
	},
	updatedispatchstatus: function(req, res, next) {
		var status = req.body.dispatch_status;
		var id = req.body.trip_id;
		//console.log("status", status);
		//console.log(req.body);
		Tripreservation.update({
			id: id
		}, {
			dispatch_status: status
		}).exec(function(err, data) {
			if (err) {
				console.log("error", err);
				return res.status(400).json({
					"error": "error while updating status "
				});
			} else {
				var socketData = {
						id: id,
						dispatch_status: status
					}
					//console.log("+++++++++TEST+++++++++++", socketData)
				sails.sockets.blast('UpdateDispatchStatus', socketData);
				return res.status(200).json({
					"status_code": "200",
					"message": 'success',
					"userdetails": data
				});
				//console.log("msg success ", data);
				return res.status(200).json({
					"msg": "success "
				});
			}
		})
	},

	//change tripstatus on dispatcher screen
	updatetripstatus: function(req, res, next) {
		var status = req.body.trip_status;
		var id = req.body.trip_id;
		// console.log("===============>>status", status);
		// console.log("================>>>>>>>trip status", req.body);
		Tripreservation.findOne({
			id: id
		}).exec(function(error, trip) {
			if (error || !trip) {
				console.log("error", error);
				return res.status(400).json({
					"error": "Trip not found"
				});
			}

			if (trip.settle_status) {
				// return error from here
				return res.status(400).json({
					"error": "Trip is settled ",
					"trip_details": trip
				});
			} else {
				var currentStatus = trip.trip_status;
				//console.log("currentStatus is " , currentStatus);
				if (currentStatus == "Pending") {
					return res.status(400).json({
						"error": "Please broadcast  trip to driver / affiliate first",
						"trip_details": trip
					});
				}


				if ((currentStatus == "Aligned" ||
						currentStatus == "Checked In" ||
						currentStatus == "On Route" ||
						currentStatus == "Circling" ||
						currentStatus == "On Location" ||
						currentStatus == "Loaded" ||
						currentStatus == "Completed"
					) && (status == "Pending" || status == "Broadcasted")) {
					return res.status(400).json({
						"error": "Please unalign the driver first",
						"trip_details": trip
					});
				}

				if ((status == "Aligned" ||
						status == "Checked In" ||
						status == "On Route" ||
						status == "Circling" ||
						status == "On Location" ||
						status == "Loaded" ||
						status == "Completed"
					) && (currentStatus == "Pending" || currentStatus == "Broadcasted")) {

					if (!trip.driver_id)
						return res.status(400).json({
							"error": "Please align the driver first",
							"trip_details": trip
						});
				}

				trip.trip_status = status;
				if (status == "Aligned") {
					trip.checkin_time = null;
				}
				if (status == "Checked In") {
					var date = new moment();
					trip.checkin_time = date.toDate();
				}

				trip.save();

				var socketData = {
						id: id,
						trip_status: status
					}
					// console.log("+++++++++TESTTripStatus+++++++++++", socketData)
				sails.sockets.blast('UpdateTripStatus', socketData);
				return res.status(200).json({
					"status_code": "200",
					"message": 'success',
					"userdetails": trip
				});

				//console.log("msg success ", data);
				return res.status(200).json({
					"msg": "updated successfully "
				});

			}
		});
	},
	//change triptype on dispatcher screen
	updatetriptype: function(req, res, next) {
		var status = req.body.trip_for;
		var id = req.body.trip_id;
		// console.log("*****>>status", status);
		// console.log("*********trip type", req.body);
		Tripreservation.update({
			id: id
		}, {
			trip_for: status
		}).exec(function(err, data) {
			if (err) {
				//console.log("error", err);
				return res.status(400).json({
					"error": "error while updating trip type "
				});
			} else {
				var socketData = {
						id: id,
						trip_for: status
					}
					//console.log("+++++++++TESTTripType+++++++++++", socketData)
				sails.sockets.blast('UpdateTripType', socketData);
				return res.status(200).json({
					"status_code": "200",
					"message": 'success',
					"userdetails": data
				});
				//console.log("msg success ", data);
				return res.status(200).json({
					"msg": "trip type updated successfully "
				});
			}
		})
	},
	/**
	 *Mehod to get airlines details based on  input text
	 **/
	get_airlines: function(req, res, next) {
		if (!req.body) req.body = {};
		var searchString = req.body.query || req.param('query');
		if (!searchString) return res.json({
			"data": []
		});
		var condition = {
			$or: [{
				iata_code: {
					'like': searchString + '%'
				}
			}, {
				airline_name: {
					'like': searchString + '%'
				}
			}]
		}

		Airlinesinfo.find(condition, {
			"country_name": false
		}).limit(10).exec(function(error, airlines) {
			if (error) return res.json({
				"data": []
			});
			return res.json({
				"data": airlines
			});
		});
	},
	/**
	 *Mehod to  Check holiday for a specific date
	 **/
	check_holiday: function(req, res, next) {
		var request = req.body || {};
		var trip_date = request.trip_date;
		if (!trip_date) {
			return res.status(400).json({
				"error": "invalid request"
			})
		}
		var moment = require('moment');
		var holidayDate = new moment(trip_date, "YYYY-MM-DD");
		var nextDay = new moment(trip_date, "YYYY-MM-DD");
		nextDay.add(86399, 'seconds');

		Companyholiday.findOne({
			"holiday_date": {
				"$gte": holidayDate.toDate(),
				"$lt": nextDay.toDate()
			}
		}).exec(function(error, holiday) {
			if (error) {
				return res.status(400).json({
					"error": error
				});
			}
			if (!holiday) {
				return res.json({
					"count": 0
				})
			}
			return res.json({
				"count": 1
			})
		});
	},

	/**
	 *Mehod to  delete reservation (soft delete) from  reservation modal
	 **/
	delete_trip: function(req, res, next) {
		var request = req.body || {};
		var id = request.id;
		if (!id) {
			return res.status(400).json({
				"error": "Trip not found"
			})
		}

		Tripreservation.findOne(id)
			.populate('payment')
			.exec(function(error, trip) {
				if (error) {
					return res.status(400).json({
						"error": error
					})
				}
				if (!trip) {
					return res.status(400).json({
						"error": "Trip not found"
					})
				}

				if (trip.payment[0].amount_paid > 0) {
					return res.status(400).json({
						"error": "Please refund the money first"
					})
				}

				trip.is_deleted = true;
				trip.save();
				//socket broadcast for removing the trip 
				var socketData = {
					id: id,
					is_deleted: true
				}
				sails.sockets.blast('tripRemoved', socketData);
				return res.json({
					"success": "success",
					"payment": trip.payment[0]
				})
			})
	},
	get_quotes: function(req, res, next) {

		var request = req.body;
		var moment = require("moment");
		var today = new Date();
		var datestring = today.toISOString().substring(0, 10);
		var todayMoment = new moment(datestring, "YYYY-MM-DD");

		if (typeof request.start !== "undefined" && typeof request.endday !== "undefined") {
			var selectedDay = new moment(request.start, "YYYY/MM/DD");
			var nextDay1 = new moment(request.endday, "YYYY/MM/DD");
			var nextDayClone = new moment(nextDay1);
			var nextDay = nextDay1.add(86399, 'seconds');
		} else {
			// datestring = "2015-09-18"  ; //datestring.toString();
			// console.log(datestring);
			var timeTOAdd = 86399 /*+ 86400*/ ;
			var selectedDay = new moment(datestring, "YYYY-MM-DD");
			var nextDay1 = new moment(datestring, "YYYY-MM-DD");
			var nextDayClone = new moment(nextDay1);
			var nextDay = nextDay1.add(timeTOAdd, 'seconds');

		}

		var query = {};
		// if (selectedDay) {
		// 	query.pickup_date = {
		// 		"$gte": selectedDay.toDate(),
		// 		"$lt": nextDay.toDate()
		// 	}
		// };
		query.trip_type = "Quote";
		query.is_deleted = {
			'!': true
		};
		// console.log("Query", query, "Se", selectedDay.toDate(), nextDay.toDate(), nextDay1.toDate(), request);
		//add date filter in case of date range is selected
		Tripreservation.find(query)
			.populate('payment')
			.populate('customer_id')
			.populate('driver_id')
			.populate('vehicle_type')
			.sort({
				"pickup_date": 1,
				"pickup_time": 1
			})
			.exec(function(error, trips) {
				if (error) return res.status(400).json({
					"error": error
				});
				var Trips = _.clone(trips);
				var output = [];
				//check for flight details 
				for (var i = 0; i < Trips.length; i++) {
					var op = Trips[i];
					if (op.pickup_time) op.pickup_time = getTime(op.pickup_time);
					if (op.dropoff_time) op.dropoff_time = getTime(op.dropoff_time);
					if (op.pickup_date) op.pickup_date = moment(op.pickup_date).format("YYYY/MM/DD");
					output.push(op);
				}
				return res.json(output);
			});
	},
	managepagination: function(req, res) {
		var data = req.body || {};
		// console.log("data*******************", data);
		var skipNo = (req.body.page - 1) * req.body.count;
		// console.log("++++++++++++", skipNo);
		var query = {};
		query.trip_type = "Quote";
		query.is_deleted = {
			'!': true
		};
		Tripreservation.find(query)
			.populate('payment')
			.populate('customer_id')
			.populate('driver_id')
			.populate('vehicle_type')
			.skip(skipNo)
			.limit(req.body.count)
			.sort({
				"pickup_date": -1,
				"pickup_time": 1
			})
			.exec(function(error, trips) {
				if (error) return res.status(400).json({
					"error": error
				});
				else {
					var Trips = _.clone(trips);
					var output = [];
					//check for flight details 
					Tripreservation.count(query).exec(function(error, tripsCount) {
						if (error) {
							res.status(400).json({
								error: error
							})
						}
						for (var i = 0; i < Trips.length; i++) {
							var op = Trips[i];
							if (op.pickup_time) op.pickup_time = getTime(op.pickup_time);
							if (op.dropoff_time) op.dropoff_time = getTime(op.dropoff_time);
							if (op.pickup_date) op.pickup_date = moment(op.pickup_date).format("MM/DD/YYYY");
							output.push(op);
						}
						// console.log("*****************",output);
						return res.json({
							'data': output,
							'total': tripsCount
						});
					})
				}
			});


	},
	/*to list deleted trips*/
	// deleted_trips: function(req, res) {
	// 	Tripreservation.find({
	// 			is_deleted: true
	// 		}).populate('customer_id')
	// 		.populate('driver_id')
	// 		.populate('vehicle_type').exec(function(err, trips) {
	// 			if (err) {
	// 				res.status(400).json({
	// 					err: err
	// 				})
	// 			} else {
	// 				res.status(200).json({
	// 					"status_code": "200",
	// 					"message": "Success",
	// 					"trips": trips
	// 				})
	// 			}
	// 		})
	// },
	deleted_trips_listing: function(req, res) {
		var data = req.body;
		//console.log('req.body', req.body);
		var page = req.body.page || 1,
			count = req.body.count || 50;
		var skipNo = (page - 1) * count;
		var search = req.body.search || "";
		//console.log('search', search);
		var query = {};
		//var count = 50;

		query.is_deleted = true;

		if (search) {
			query.$or = [{
				conf_id: search
			}]

		}
		//console.log('query', query);
		Tripreservation.count(query).exec(function(err, total) {
			if (err) {
				return res.status(400).jsonx({
					success: false,
					error: err
				});
			} else {
				Tripreservation.find(query).sort({
						"pickup_date": -1,
						"pickup_time": 1
					}).skip(skipNo).limit(count).populate('customer_id')
					.populate('driver_id')
					.populate('vehicle_type').exec(function(err, trips) {
						if (err) {
							return res.status(400).jsonx({
								success: false,
								error: err
							});
						} else {
							trips.forEach(function(trip, index) {

									trip.pickup_time = getTime(trip.pickup_time);
									console.log("trip *********", trip.pickup_time);
								})
								//console.log('customers', customers);
							return res.jsonx({
								success: true,
								data: {
									trips: trips
								},
								total: total
							});
						}
					})
			}

		})
	},
}
module.exports = TripreservationController;

function getTime(seconds) {

	// multiply by 1000 because Date() requires miliseconds
	var date = new Date(seconds * 1000);
	var hh = date.getUTCHours();
	var mm = date.getUTCMinutes();
	var ss = date.getSeconds();
	// If you were building a timestamp instead of a duration, you would uncomment the following line to get 12-hour (not 24) time
	// if (hh > 12) {hh = hh % 12;}
	// These lines ensure you have two-digits
	if (hh < 10) {
		hh = "0" + hh;
	}

	if (mm < 10) {
		mm = "0" + mm;
	}

	if (ss < 10) {
		ss = "0" + ss;
	}
	// This formats your string to HH:MM:SS
	var t = hh + ":" + mm /*+ ":" + ss*/ ;
	return t;
}

function convert2digits(num) {
	num = String(num);
	if (num.indexOf('.') !== -1) {
		var numarr = num.split(".");
		if (numarr.length == 1) {
			return Number(num);
		} else {
			return Number(numarr[0] + "." + numarr[1].charAt(0) + numarr[1].charAt(1));
		}
	} else {
		return Number(num);
	}
}

function fieldSort(arr, fields) {
	return arr.slice().sort(function(a, b) {
		return fields.reduce(function(c, d, e, f) {
			var _a = a[d] || 0,
				_b = b[d] || 0
			return c + (f.length - e) * (_a > _b ? 1 : _a < _b ? -1 : 0)
		}, 0)
	})
}