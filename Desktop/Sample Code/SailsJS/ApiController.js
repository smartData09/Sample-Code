/**
 * ApiController
 *
 * @description :: Server-side logic for managing things
 * @help        :: See http://sailsjs.org/#!/documentation/concepts/Controllers
 */

var ApiController = {

	//Method to login the driver /Affilate
	login: function(req, res, next) {
		var _ = require('lodash');
		var bcrypt = require('bcryptjs');
		var driver = _.pick(req.body, 'username', 'password', 'gcm_id', 'device_type', 'device_token', 'facebook_id', 'google_id');
		var validator = require('validator');
		var isEmail = validator.isEmail(driver.username),
			query = {};
		if (!driver.facebook_id && !driver.google_id) {

			if (isEmail) {
				query.email = driver.username;
			} else {
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n('Error.Driver.Email.Invalid')
				});
			}

			if (!driver.password) {
				res.status(400).json({
					"status_code": "400",
					"message": res.i18n('Error.Driver.Password.Missing')
				});
				//token missing
			}
		} else {
			//fb or google
			query.social_signup_type = driver.facebook_id ? 'facebook' : 'google';
			query.social_signup_id = driver.facebook_id ? driver.facebook_id : driver.google_id;
			query.is_social_signup = true;


		}
		Driver.findOne(query).populate('login').populate('fleet').exec(function(err, user) {

			if (err) return res.status(500).json({
				"status_code": "500",
				"message": res.i18n("Error.Driver.DbError")
			});
			if (!user) return res.status(400).json({
				"status_code": "400",
				"message": res.i18n('Error.Driver.Missing')
			});
			if (user.enable !== "Y") {
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n('Error.Driver.Disabled')
				});
			}
			if (user.is_social_signup) {

				if (user.login) {
					if (user.login.device_token != driver.device_token) {
						return res.status(400).json({
							status_code: "400",
							message: res.i18n('Error.Driver.AlreadyLoginWithDevice')
						});
					}
					if (user.type == "D") {
						user.onduty_status = true;
						user.save();
					}
					user.login.gcm_id = driver.gcm_id || null;
					user.login.save();

					driverService.responseDriver(user, function(result) {
						return res.status(200).json({
							status_code: "200",
							message: 'success',
							userdetails: result
						});
					});
				} else {
					var authenticate = sailsTokenAuth.issueToken({
						sid: user.id
					});
					driver.access_token = authenticate;

					driver.driver = user.id;
					delete driver.username;
					delete driver.password;
					Logindrivers.create(driver).exec(function(errror, create) {
						user.login = create;
						if (user.type == "D") {
							user.onduty_status = true;
						}
						user.save(function(error, updatedUser) {

							driverService.responseDriver(user, function(result) {
									return res.status(200).json({
										status_code: "200",
										message: 'success',
										userdetails: result
									});
								})
						})
					});
				}


			} else {

				bcrypt.compare(driver.password, user.password, function(errorPassword, match) {
					if (errorPassword) return res.status(500).json({
						"status_code": 500,
						"error": res.i18n("Error.Driver.DbError")
					});
					if (match) { // password match
						if (user.login) {

							if (user.login.device_token != driver.device_token) {
								return res.status(400).json({
									status_code: "400",
									message: res.i18n("Error.Driver.AlreadyLoginWithDevice")
								});
							}
							if (user.type == "D") {
								user.onduty_status = true;
								user.save();
							}
							user.login.gcm_id = driver.gcm_id || null;
							user.login.save();

							driverService.responseDriver(user, function(result) {
								return res.status(200).json({
									status_code: "200",
									message: 'success',
									userdetails: result
								});

							});


						} else {
							var authenticate = sailsTokenAuth.issueToken({
								sid: user.id
							});
							driver.access_token = authenticate;
							if (!driver.email) driver.email = driver.username;
							driver.driver = user.id;
							delete driver.username;
							delete driver.password;
							Logindrivers.create(driver).exec(function(errror, create) {
								user.login = create;
								if (user.type == "D") {
									user.onduty_status = true;
								}
								user.save(function(error, updatedUser) {

									driverService.responseDriver(user, function(result) {
										return res.status(200).json({
											status_code: "200",
											message: 'success',
											userdetails: result
										});

									})

								})
							});
						}

					} else {
						// invalid password
						return res.status(400).json({
							status_code: "400",
							message: res.i18n('Error.Driver.InvalidPassword')
						});
					}
				});

			}

		});
	},
	// Method for logout  from the app
	logout: function(req, res, next) {
		var _ = require('lodash');
		var driver = req.driver;

		Driver.findOne({
			"id": driver.id
		}).populate('login').exec(function(err, user) {
			if (user.login) {

				// if (user.login.access_token == driver.access_token) {
				//remove the token  from  login drivers collection
				Logindrivers.destroy({
					"driver": user.id
				}).exec(function(error, sucess) {
					delete user.login;
					user.save(function(err, suc) {
						res.status(200).json({
							"status_code": "200",
							"message": res.i18n('Driver.SuccessMessage')
						});
					});
				});
				// }
				/*else {
				 res.status(401).json({
				 "status_code": "401",
				 "message": "access token is not valid "
				 });
				 }*/
			} else {
				res.status(200).json({
					"status_code": "200",
					"message": res.i18n('Driver.SuccessMessage')
				});
			}


		});


	},
	//Method for signup the driver /Affilate
	signup: function(req, res, next) {
		var fs = require('fs');
		var request = _.pick(req.body, 'user_type', 'userdetails', 'car_details');
		var userdetails = request.userdetails || {},
			social_signup_type, social_signup_id, is_social_signup, driver = {},
			personal = userdetails.personal || {},
			car_details = userdetails.car_details || {},
			documents = userdetails.documents || {},
			query = {};
		//validation for user_type
		if (!request.user_type || (request.user_type !== "D" && request.user_type !== "A")) {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.InvalidUserType")
			});
		}

		if ((!userdetails || typeof userdetails !== "object") || userdetails instanceof Array) {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.InvalidUserDetails")
			});
		}
		if ((!car_details || typeof car_details !== "object") || car_details instanceof Array) {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.InvalidVehicleDetails")
			});
		}


		//check for social login
		if (userdetails.social_signup) {
			if (typeof userdetails.social_signup !== "object" || userdetails.social_signup instanceof Array == false) {
				if (userdetails.social_signup.facebook_id || userdetails.social_signup.google_id) {
					driver.social_signup_type = userdetails.social_signup.facebook_id ? 'facebook' : 'google'
					driver.social_signup_id = userdetails.social_signup.facebook_id ? userdetails.social_signup.facebook_id : userdetails.social_signup.google_id;
					driver.is_social_signup = true;
				}
			} else {
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n('Error.Driver.InvalidUserDetails.SocialSignup')
				});
			}
		}

		if (userdetails.account) {



			if (userdetails.account.username && userdetails.account.password) {
				driver.username = userdetails.account.username;
				driver.password = userdetails.account.password;
				query.email = userdetails.account.username;

			} else {

				if (driver.social_signup_id) {

					query.social_signup_id = driver.social_signup_id;
				} else {


					return res.status(400).json({
						"status_code": "400",
						"message": res.i18n("Error.Driver.InvalidUserDetails.Accounts")
					});
				}

			}

			if (userdetails.account.username) driver.email = userdetails.account.username;

		} else {

			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.MissingUserDetails.Accounts")
			});
		}

		if (personal.first_name) driver.first_name = personal.first_name;
		if (personal.last_name) driver.last_name = personal.last_name;
		if (personal.phone) driver.phone = personal.phone;
		if (personal.secondary_email) driver.secondary_email = personal.secondary_email;
		if (personal.home_address) driver.home_address = personal.home_address;
		if (personal.bank_name) driver.bank_name = personal.bank_name;
		if (personal.branch_name) driver.branch_name = personal.branch_name;
		if (personal.branch_address) driver.branch_address = personal.branch_address;
		if (personal.routing_number) driver.routing_number = personal.routing_number;
		if (personal.nick_name) driver.nick_name = personal.nick_name;
		if (personal.company) driver.company = personal.company;

		if (request.user_type) driver.type = request.user_type; //== "D" ? "D" : "A";


		Driver.findOne(query)
			  .populate('login').populate('fleet').exec(function(error, success) {

			//create a new entry
			if (typeof success == "undefined") {
				Driver.validate(driver, function(driverError, validDriver) {
					if (driverError) {
						return res.status(400).json({
							"status_code": "400",
							"message": driverError.invalidAttributes
						});

					}

					var fleet_details = {};
					if ((car_details.backward_facing_seat && car_details.backward_facing_seat !== "") || typeof car_details.backward_facing_seat == "number") fleet_details.backward_facing_seat = car_details.backward_facing_seat;
					if ((car_details.booster_seat && car_details.booster_seat !== "") || typeof car_details.booster_seat == "number") fleet_details.booster_seat = car_details.booster_seat;
					if ((car_details.forward_facing_seat && car_details.forward_facing_seat !== "") || typeof car_details.forward_facing_seat == "number") fleet_details.forward_facing_seat = car_details.forward_facing_seat;

					if (car_details.capacity) fleet_details.capacity = car_details.capacity;
					if (car_details.color) fleet_details.color = car_details.color;
					if (car_details.number_plate) fleet_details.number_plate = car_details.number_plate;
					if (car_details.vehicle_make) fleet_details.vehicle_make = car_details.vehicle_make;
					if (car_details.vehicle_model) fleet_details.vehicle_model = car_details.vehicle_model;
					if (car_details.vehicle_type) fleet_details.vehicle_type = car_details.vehicle_type;
					if (car_details.vehicle_year) fleet_details.vehicle_year = car_details.vehicle_year;


					//Add Fleet Details
					Fleet.create(fleet_details).exec(function(err, fleet) {
						if (err) {
							return res.status(400).json({
								"status_code": "400",
								"message": err
							});
						}
						if (fleet) {
							driver.fleet = fleet.id;
							Driver.create(driver).exec(function(err, succ) {
								if (err) {
									return res.status(400).json({
										"status_code": "400",
										"message": err
									});
								}
								if (succ) {
									var authenticate = sailsTokenAuth.issueToken({
										sid: succ.id
									});

									var login = {};
									login.gcm_id = userdetails.account.gcm_id;
									login.device_type = userdetails.account.device_type;
									login.device_token = userdetails.account.device_token;
									login.access_token = authenticate;
									// login.email = succ.email;
									login.driver = succ.id;

									Logindrivers.create(login).exec(function(errror, create) {
										if (error) {
											return res.status(400).json({
												status_code: "400",
												message: error
											});
										}

										succ.login = create;

										succ.save(function(error, updatedUser) {
											if (error) {
												return res.status(400).json({
													status_code: "400",
													message: error
												});
											}


											driverService.uploadDriverDocument(documents, personal, updatedUser, null, function(updatedDriver) {

												updatedDriver.login = create;
												driverService.responseDriver(updatedDriver, function(result) {

													return res.status(200).json({
														status_code: "200",
														message: 'success',
														userdetails: result
													});
												});
											});
										});
									});
								}

							});
						}
					});

				});
			} else {
				if (driver.is_social_signup) {
					driverService.responseDriver(success, function(result) {
						return res.status(200).json({
							status_code: "200",
							message: 'success',
							userdetails: result
						});
					});
				} else { // return error
					return res.status(422).json({
						status_code: "422",
						message: res.i18n("Error.Driver.Email.AlreadyExists"),
					});
				}
			}
		});


	},

	//method to update profile of driver
	updateprofile: function(req, res) {
		var validate = require('validator');
		var request = _.pick(req.body, 'user_type', 'userdetails');
		var driverObj = req.driver;
		var userdetails = request.userdetails || {},
			personal = userdetails.personal || {},
			documents = userdetails.documents || {},
			car_details = userdetails.car_details || {},
			fleet = {},
			driver = {};


		//check in personal object
		if (personal.first_name) driver.first_name = personal.first_name;
		if (personal.last_name) driver.last_name = personal.last_name;
		if (personal.phone) driver.phone = personal.phone;
		if (personal.secondary_email) driver.secondary_email = personal.secondary_email;
		if (personal.home_address) driver.home_address = personal.home_address;
		if (personal.bank_name) driver.bank_name = personal.bank_name;
		if (personal.branch_name) driver.branch_name = personal.branch_name;
		if (personal.branch_address) driver.branch_address = personal.branch_address;
		if (personal.routing_number) driver.routing_number = personal.routing_number;
		if (personal.nick_name) driver.nick_name = personal.nick_name;
		if (personal.company) driver.company = personal.company;

		driverService.uploadDriverDocument(documents, personal, driverObj, driver, function(updatedDriverObj) {
			var updatedDriver = _.clone(updatedDriverObj)

			if (updatedDriver.type == "A") {
				if (updatedDriver.fleet) {

					//allowed to do changes  on vehicle
					//check for car changes
					if (car_details.vehicle_type) fleet.vehicle_type = car_details.vehicle_type;
					if (car_details.vehicle_make) fleet.vehicle_make = car_details.vehicle_make;
					if (car_details.vehicle_model) fleet.vehicle_model = car_details.vehicle_model;
					if (car_details.vehicle_year) fleet.vehicle_year = car_details.vehicle_year;
					if (car_details.color) fleet.color = car_details.color;
					if (car_details.capacity) fleet.capacity = car_details.capacity;
					if (car_details.number_plate) fleet.number_plate = car_details.number_plate;
					if (car_details.forward_facing_seat) fleet.forward_facing_seat = car_details.forward_facing_seat;
					if (car_details.backward_facing_seat) fleet.backward_facing_seat = car_details.backward_facing_seat;
					if (car_details.booster_seat) fleet.booster_seat = car_details.booster_seat;

					Fleet.update({
						"id": updatedDriver.fleet
					}, fleet).exec(function(fleetErr, updatedFleetObj) {
						var updatedFleet = _.clone(updatedFleetObj);
						updatedDriver.login = driverObj.login;
						if (updatedFleet && updatedFleet.length) updatedDriver.fleet = updatedFleet[0];
						driverService.responseDriver(updatedDriver, function(result) {

							return res.status(200).json({
								"status_code": "200",
								"message": 'success',
								"userdetails": result
							});
						});
					});

				} else {
					//save a new fleet here 

					if (car_details.vehicle_type) fleet.vehicle_type = car_details.vehicle_type;
					if (car_details.vehicle_make) fleet.vehicle_make = car_details.vehicle_make;
					if (car_details.vehicle_model) fleet.vehicle_model = car_details.vehicle_model;
					if (car_details.vehicle_year) fleet.vehicle_year = car_details.vehicle_year;
					if (car_details.color) fleet.color = car_details.color;
					if (car_details.capacity) fleet.capacity = car_details.capacity;
					if (car_details.number_plate) fleet.number_plate = car_details.number_plate;
					if (car_details.forward_facing_seat) fleet.forward_facing_seat = car_details.forward_facing_seat;
					if (car_details.backward_facing_seat) fleet.backward_facing_seat = car_details.backward_facing_seat;
					if (car_details.booster_seat) fleet.booster_seat = car_details.booster_seat;
					fleet.is_affiliate_vehicle = "Y";

					Fleet.create(fleet).exec(function(fleetErr, updatedFleetObj) {
						var updatedFleet = _.clone(updatedFleetObj);
						updatedDriver.login = driverObj.login;
						if (updatedFleet) updatedDriver.fleet = updatedFleet;
						updatedDriverObj.fleet = updatedFleetObj;
						updatedDriverObj.save();

						driverService.responseDriver(updatedDriver, function(result) {
							return res.status(200).json({
								"status_code": "200",
								"message": 'success',
								"userdetails": result
							});
						});
					});



				}


			} else {
				Fleet.find({
					"id": updatedDriver.fleet
				}).exec(function(fleetErr, updatedFleetObj) {
					var updatedFleet = _.clone(updatedFleetObj)

					updatedDriver.login = driverObj.login;
					if (updatedFleet && updatedFleet.length) updatedDriver.fleet = updatedFleet[0];

					driverService.responseDriver(updatedDriver, function(result) {
						return res.json({
							"status_code": "200",
							"message": 'success',
							"userdetails": result
						});
					});
				});
			}
		});
	},
	// method to forget password of driver
	forgot_password: function(req, res) {
		var validator = require('validator'),
			randomstring = require('randomstring');
		var request = _.pick(req.body, 'email'),
			attrs = {};

		if (!request.email) {
			res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.Email.Missing")
			});
		}

		var isEmail = validator.isEmail(request.email),
			query = {};
		if (isEmail) {
			query.email = request.email;
		} else {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.Email.Invalid")
			});
		}

		Driver.findOne(query).exec(function(error, driver) {
			if (error || !driver || typeof driver == "undefined")
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n("Error.Driver.Email.NotFound")
				});

			var newpassword = randomstring.generate(8);

			var bcrypt = require('bcryptjs');
			bcrypt.genSalt(10, function(err, salt) {
				if (err) return res.status(400).json({
					"status_code": "400",
					"message": err
				});
				bcrypt.hash(newpassword, salt, function(err, hash) {
					if (err) return next(err);
					driver.password = hash;
					driver.save(function(saveErr, updatedDriver) {
						//shoot an email  to driver from here
						var subjectVal = "Change Password";
						emailService.send(updatedDriver, newpassword, subjectVal, 'forgetpassword', "Forgot Password" /*view file*/ );
						res.status(200).json({
							"status_code": "200",
							"message": res.i18n("Driver.ForgotPassword.Success")
						});

					});
				});
			});
		});
	},

	// method to change driver password
	change_password: function(req, res) {
		var request = _.pick(req.body, 'old_password', 'new_password');
		var driverObj = req.driver,
			bcrypt = require('bcryptjs');

		//check for email
		if (!request.old_password || (typeof request.old_password == "undefined")) {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.OldPassword.Missing")
			});
		}

		if (!request.new_password || (typeof request.new_password == "undefined")) {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.NewPassword.Missing")
			});
		}

		bcrypt.compare(request.old_password, driverObj.password, function(errorPassword, match) {
			if (errorPassword) return res.status(500).json({
				"status_code": "500",
				"error": res.i18n("Error.DbError")
			});
			if (match) { // password match now change from here

				Driver.changePassword(request.new_password, function(error, updatedPass) {
					if (error) {
						return res.status(500).json({
							"status_code": "500",
							"message": res.i18n("Error.Driver.Password.SaveIssue")
						});
					}

					Driver.update({
						"id": driverObj.id
					}, {
						"password": updatedPass
					}).exec(function(error, updatedResult) {
						if (error) {
							return res.status(500).json({
								"status_code": "500",
								"message": res.i18n("Error.Driver.Password.SaveIssue")
							});
						}

						return res.status(200).json({
							"status_code": "200",
							"message": res.i18n("Driver.ChangePassword.Success")
						});

					});
				});


			} else {
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n("Error.Driver.InvalidPassword")
				});


			}
		});
	},

	//method to return vehicle type  for driver
	get_vehicle_type: function(req, res, next) {
		// var driver  = req.driver;
		vehicleService.vehicle_type(function(error, data) {
			if (error) {
				return res.status(500).json({
					"status_code": "500",
					"message": res.i18n("Error.Driver.DbError")
				});
			}
			res.status(200).json({
				"status_code": "200",
				"message": "Success",
				"vehicle_types": data
			});
		});
	},
	//controller method to change  duty status (onduty/offduty)
	update_dutystatus: function(req, res, next) {
		var driver = req.driver;
		var request = _.pick(req.body, 'onduty_status');
		if (typeof request.onduty_status == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.OnDutyStatus.Missing")
			});
		}
		//check only for affiliate
		if (driver.type !== "A") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.NotPermitted.Action")
			});
		}

		driverService.updateDriver(driver, request, function(error, success) {
			if (error || !success) {
				return res.status(400).json({
					"status_code": '400',
					"message": error
				});
			}

			res.json({
				"status_code": "200",
				"message": res.i18n("Driver.SuccessMessage")
			});
		});
	},
	trip_detail: function(req, res, next) {
		var driver = req.driver;
		var request = _.pick(req.body, 'trip_id');
		if (!request.trip_id || typeof request.trip_id == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.TripId.Missing")
			});
		}
		tripService.trip_detail(request.trip_id, driver, function(error, trip) {
			if (error) {
				return res.status(500).json({
					"status_code": "500",
					"message": error
				});
			}

			if (!trip) {
				return res.json({
					"status_code": "400",
					"message": res.i18n("Error.Trip.NotFound")
				});
			}

			res.json({
				"status_code": "200",
				"message": "Success",
				"trip_details": trip
			});
		});
	},
	// Method  to Update routing trip status
	update_trip_status: function(req, res, next) {
		var driver = req.driver;
		var request = _.pick(req.body, 'trip_id', 'status', 'notes');
		var statuses = ["Checked In", "On Route", "Circling", "On Location", "Loaded", "Completed"]
		var obj = {};
		var moment = require('moment');
		if (!request.trip_id || typeof request.trip_id == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.TripId.Missing")
			});
		}

		if (!request.status || typeof request.status == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.Status.Missing")
			});
		}

		if (statuses.indexOf(request.status) == -1) {

			// if (!request.status || typeof request.status == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.Status.Invalid")
			});
			// }
		}


		obj.trip_status = request.status;

		if (request.status == 'Completed' && request.notes && request.notes !== "") {
			obj.trip_complete_notes = request.notes;
			obj.settle_status = false;
			obj.dispatch_status = "Pending";
		}

		tripService.trip_update(driver, request.trip_id, obj, function(error, trip) {

			if (error) {
				return res.status(400).json({
					"status_code": "400",
					"message": error
				});
			}

			if (!trip) {
				return res.json({
					"status_code": "400",
					"message": res.i18n("Error.Trip.NotFound")
				});
			}

			if (obj.trip_status == 'Completed') {

				if (typeof request.notes !== "undefined" && request.notes !== '') {
					var notification = {
						notification: 'Trip has been completed and flagged with the confirmation id ' + trip.conf_id,
						type: 'Flag',
						staff_id: '',
						trip: request.trip_id,
						info: request.notes
					}
					Notification.create(notification).exec(function(error, create) {
						if (!error) {
							create.conf_id = trip.conf_id;
							sails.sockets.blast('flaggedTrips', create);
							return res.json({
								"status_code": "200",
								"message": "Success",
								// "trip_details": trip
							});
						}
					});
				} else {
					//check for card process here 


					if (typeof trip.payment[0] !== "undefined" && trip.payment[0].payment_mode == "cc") {

						/*CHECK IF PREAUTHORIZED AMOUNT IS NOT EQUAL TO TRIP AMOUNT*/
						/*CHECK BASE CAMP DOC skype-Rajat-part3*/

						if (trip.transactions && typeof trip.transactions == "object" && trip.transactions.length && trip.transactions[trip.transactions.length - 1].type == "AuthOnly") {
							var transaction = trip.transactions[trip.transactions.length - 1];
							if (transaction.type == "AuthOnly" && trip.payment[0].amount_due != transaction.amount) {

								var notification = {
									//notification: "Trip has been flagged coz of new check"+ trip.conf_id,
									notification: 'Trip has been completed and flagged with the confirmation id ' + trip.conf_id,
									type: 'Flag',
									staff_id: '',
									trip: request.trip_id,
									info: request.notes
								}
								Notification.create(notification).exec(function(error, create) {
									if (!error) {
										create.conf_id = trip.conf_id;
										sails.sockets.blast('flaggedTrips', create);
										return res.json({
											"status_code": "200",
											"message": "Success",
											// "trip_details": trip
										});
									}
								});
							} else {
								//set default functionality
								AuthorizeTransactionsService.processTransactionAfterComplete(trip, function(err, resp) {
									if (err) {
										//return error from here 
										return res.json({
											"status_code": "200",
											"message": "Success",
											"transaction_error": err
										});
									}
									if (resp.trip.payment[0].amount_due > 0) {
										trip.dispatch_status = "Pending";
										trip.save();
										var notification = {
											notification: 'Trip has been completed and flagged with the confirmation id ' + trip.conf_id,
											type: 'Flag',
											staff_id: '',
											trip: request.trip_id,
											info: request.notes || "NA"
										}
										Notification.create(notification).exec(function(error, create) {
											if (!error) {
												create.conf_id = trip.conf_id;
												sails.sockets.blast('flaggedTrips', create);

											}
										});
									} else {
										//added on 17 may to settle trip if captured before completion
										//split driver amount from here and change status to settle
										if (!resp.shareDivided) {
											driverService.divideTripShare(trip, function(error, share) {
												if (share) {
													trip.pre_payment_process = false;
													trip.settle_status = true;
													if (!trip.settle_date) {
														var settle_date = moment(); //new Date();
														trip.settle_date = settle_date.toDate();

													}
													trip.save(function(err, s) {});
												}

												if (error) {
													var strn = 'CC' + trip.conf_id;
													sendEmail(error, trip, trip.conf_id)
												}

											});
										}

									}

									return res.json({
										"status_code": "200",
										"message": "Success",
										// "trip_details": trip
									});
								});



							}
							//}
						} else {
							//set default functionality
							AuthorizeTransactionsService.processTransactionAfterComplete(trip, function(err, resp) {
								if (err) {
									//return error from here 
									return res.json({
										"status_code": "200",
										"message": "Success",
										"transaction_error": err
									});
								}
								if (resp.trip.payment[0].amount_due > 0) {
									trip.dispatch_status = "Pending";
									trip.save();
									var notification = {
										notification: 'Trip has been completed and flagged with the confirmation id ' + trip.conf_id,
										type: 'Flag',
										staff_id: '',
										trip: request.trip_id,
										info: request.notes || "NA"
									}
									Notification.create(notification).exec(function(error, create) {
										if (!error) {
											create.conf_id = trip.conf_id;
											sails.sockets.blast('flaggedTrips', create);
											// res.json({
											// 	"status_code": "200",
											// 	"message": "Success",
											// 	// "trip_details": trip
											// });
										}
									});
								} else {
									//added on 17 may to settle trip if captured before completion
								if (!resp.shareDivided) {
										driverService.divideTripShare(trip, function(error, share) {
											if (share) {

												trip.pre_payment_process = false;
												trip.settle_status = true;
												if (!trip.settle_date) {
													var settle_date = moment(); //new Date();
													trip.settle_date = settle_date.toDate();

												}
												trip.save(function(err, s) {
												});
											}

											if (error) {
												var strn = 'CC' + trip.conf_id;
												sendEmail(error, trip, trip.conf_id)
											}

										});
									}

								}

								return res.json({
									"status_code": "200",
									"message": "Success",
									// "trip_details": trip
								});
							});


						}

					} else {

						if (trip.payment[0].amount_due > 0) {
							trip.dispatch_status = "Pending";
							trip.save();
							var notification = {
								notification: 'Trip has been completed and flagged with the confirmation id ' + trip.conf_id,
								type: 'Flag',
								staff_id: '',
								trip: request.trip_id,
								info: request.notes || "NA"
							}
							Notification.create(notification).exec(function(error, create) {
								if (!error) {
									create.conf_id = trip.conf_id;
									sails.sockets.blast('flaggedTrips', create);
									return res.json({
										"status_code": "200",
										"message": "Success",
										// "trip_details": trip
									});
								}
							});
						} else { // Trip is settle from here 

						


							//split driver amount from here and change status to settle
							driverService.divideTripShare(trip, function(error, share) {
								
								if (share) {
									trip.pre_payment_process = false;
									
									if (trip.payment[0].amount_due <= 0) {
										
										trip.settle_status = true;
										if (!trip.settle_date) {
											var settle_date = moment(); //new Date();
											trip.settle_date = settle_date.toDate();

										}
									} else {
										trip.dispatch_status = "Pending";
									}


									
									trip.save(function(err, success) {
										

									});
								}

								if (error) {
									
									var strn = 'Direct Bill' + trip.conf_id;
									sendEmail(error, trip, trip.conf_id)
								}
							});

							return res.json({
								"status_code": "200",
								"message": "Success",
								// "trip_details": trip
							});

						}

					}
				}
			} else {
				return res.json({
					"status_code": "200",
					"message": "Success",
					// "trip_details": trip
				});
			}
		});
	},
	// Method  to Update routing trip status
	trip_dispatcher_info: function(req, res, next) {
		var request = _.pick(req.body, 'trip_id');

		var obj = {};

		if (!request.trip_id || typeof request.trip_id == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.TripId.Missing")
			});
		}

		Tripreservation.findOne(request.trip_id).populate('dispatcher').exec(function(error, trip) {

			if (error) {
				return res.status(400).json({
					"status_code": "400",
					"message": error
				});
			}

			if (!trip) {
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n("Error.Trip.NotFound")
				});
			}

			if (trip.dispatcher && typeof trip.dispatcher !== "undefined") {
				if (trip.dispatcher.phone && typeof trip.dispatcher.phone !== "undefined") {
					res.json({
						"status_code": "200",
						"message": "Success",
						"dispatcher_info": _.pick(trip.dispatcher, 'id', 'phone')
					});

				} else {

					res.status(400).json({
						"status_code": "400",
						"message": "Dispatcher Phone no not found",
					});

				}
			} else {
				res.json({
					"status_code": "400",
					"message": "Dispatcher not found",
				});
			}

		});


	},
	trip_accept: function(req, res, next) {
		var request = _.pick(req.body, 'trip_id', 'accept');
		var obj = {};
		var driver = req.driver;

		if (!request.trip_id || typeof request.trip_id == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.TripId.Missing")
			});
		}

		if (!request.accept || typeof request.accept == "undefined") {

			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.Status.Missing")
			});
		}

		if (request.accept !== "Y" && request.accept !== "N") {

			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.Status.Invalid")
			});
		}

		Tripreservation.findOne(request.trip_id).exec(function(error, trip) {
			if (error) {
				return res.status(400).json({
					"status_code": "400",
					"message": error
				});
			}

			if (!trip) {
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n("Error.Trip.NotFound")
				});
			}


			//assign driver  to trip from here

			Tripinvitations.findOne({
				"trip_id": trip.id,
				"driver_id": driver.id
			}).sort('createdAt desc').exec(function(err, invitation) {
				if (err) {
					return res.status(400).json({
						"status_code": "400",
						"message": err
					});
				}
				if (invitation) {
					if (trip.driver_id) {
						// already assigned driver return error
						invitation.status = "Reject"; //request.accept == "Y" ? "Accept" : "Reject";
						invitation.responded = true;
						invitation.save(function(invitationErr, inviteUpdate) {
							if (invitationErr) {
								return res.status(400).json({
									"status_code": "400",
									"message": res.i18n("Error.Trip.Status.Fail")
								})
							}


							return res.status(401).json({
								"status_code": "401",
								"message": res.i18n("Error.Trip.AlreadySelected")
							})

						});

					} else {

						invitation.status = request.accept == "Y" ? "Accept" : "Reject";
						invitation.responded = true;
						invitation.save(function(invitationErr, inviteUpdate) {
							if (invitationErr) {
								return res.status(400).json({
									"status_code": "400",
									"message": res.i18n("Error.Trip.Status.Fail")
								})

							}

							if (request.accept == "Y") trip.driver_id = driver.id;
							trip.trip_accepted = request.accept == "Y" ? "Accept" : "Reject";
							if (request.accept == "Y") {
								trip.trip_status = "Aligned";
								if (typeof driver.fleet == "undefined") {
									return res.status(400).json({
										"status_code": "400",
										"message": "Vehicle should be added in profile for accepting a trip "
									});

								}
								trip.fleet = driver.fleet.id;


							}
							if (driver.type == "A") {
								trip.trip_for = "FOT";
							}

							//check for fleet and save in db
							/*if(trip.fleet){
								Fleet.findOne({"id":trip.fleet}).exec(function (err , fleetDetail) {
									// body...
									if(!err & fleetDetail){
										if(fleetDetail.number_plate){
										trip.fleet = fleetDetail.number_plate ; 
										}
									}

									trip.save(function(error, success) {
										if (error || !success) {
											return res.status(400).json({
												"status_code": "400",
												"message": res.i18n("Error.Trip.Status.Fail")
											});
										}

										res.json({
											"status_code": "200",
											"message": "Success"
										})
									});


								});
							}else{*/
							trip.save(function(error, success) {
								if (error || !success) {
									return res.status(400).json({
										"status_code": "400",
										"message": res.i18n("Error.Trip.Status.Fail")
									});
								}

								res.json({
									"status_code": "200",
									"message": "Success"
								})
							});

							//}

						});
					}
				} else {
					//Error no invitation send
					return res.status(400).json({
						"status_code": "400",
						"message": res.i18n("Error.Driver.NotPermitted.Action")
					});
				}
			});
			// res.json(trip);
		});
	},
	driver_checkinout: function(req, res, next) {
		var request = _.pick(req.body, 'trip_id');
		var obj = {};
		var driver = req.driver;

		if (!request.trip_id || typeof request.trip_id == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.TripId.Missing")
			});
		}
		Tripreservation.findOne(request.trip_id).exec(function(error, trip) {
			if (error) {
				return res.status(400).json({
					"status_code": "400",
					"message": error
				});
			}

			if (!trip) {
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n("Error.Trip.NotFound")
				});
			}
			if (driver.id !== trip.driver_id) {
				//error
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n("Error.Trip.NotAllocate")
				});

			} else {
				//requested driver is aligned with the trip
				var moment = require('moment');
				var date = new moment;
				if (!trip.checkin_time || typeof trip.checkin_time == "undefined") {
					//update here checkin time
					trip.checkin_time = date.toDate();
					trip.trip_status = "Checked In";
					trip.save(function(err, updatedTrip) {
						if (err) {
							return res.status(500).json({
								"status_code": "500",
								"message": err
							});
						}

						return res.json({
							"status_code": "200",
							"message": "Success"
						});

					});
				} else {

					return res.status(400).json({
						"status_code": "400",
						"message": res.i18n("Error.Trip.CheckIn.Exist")
					});

				}
			}
		});
	},
	// method to track driver location
	driver_track: function(req, res, next) {
		var validator = require('validator'),
			request = req.body,
			driver = req.driver;

		if (!request.lat || typeof request.lat == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.Lat.Missing")
			});
		}

		if (!validator.isFloat(request.lat)) {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.Lat.Invalid")
			});
		}

		if (!request.lng || typeof request.lng == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.Lng.Missing")
			});
		}

		if (!validator.isFloat(request.lng)) {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.Lng.Invalid")
			});
		}


		if (driver.onduty_status || driver.type == "D") {
			driver.lat = request.lat;
			driver.lng = request.lng;
			driver.save(function(error, updatedDriver) {
				driverService.driverPendingTripsCount(updatedDriver, function(err, pendingTrips) {
					if (err) {
						return res.status(500).json({
							"status_code": "500",
							"message": err
						});

					}

					return res.json({
						"status_code": "200",
						"message": "success",
						"info": {
							"no_of_pending_trips": pendingTrips
						}
					});
				});
			});

		} else {
			driverService.driverPendingTripsCount(driver, function(err, pendingTrips) {
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n("Error.Driver.isOffDuty"),
					"info": {
						"no_of_pending_trips": pendingTrips
					}
				});
			})
		}
	},
	upcoming_trips: function(req, res, next) {
		var driver = req.driver,
			moment = require('moment'),
			validator = require('validator'),
			query = {},
			request = _.pick(req.body, 'date', 'to_date', 'from_date');

		if ((!request.date || typeof request.date == "undefined") &&
			((!request.to_date || typeof request.to_date == "undefined") ||
				(!request.from_date || typeof request.from_date == "undefined"))) {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.DateandDateRange.Missing")
			});
		}

		if (request.date) {
			var selectedDay = new moment(request.date, "YYYY/MM/DD");
			var nextDay = new moment(selectedDay).add(86399, 'seconds');
		} else {
			var selectedDay = new moment(request.from_date, "YYYY/MM/DD");
			var nextDay1 = new moment(request.to_date, "YYYY/MM/DD");
			var nextDay = new moment(nextDay1).add(86399, 'seconds');
		}

		//completed / Rejected
		query.pickup_date = {
			"$gte": selectedDay.toDate(),
			"$lt": nextDay.toDate()
		}
		query.driver_id = driver.id;
		query.trip_status = {
			"$ne": "Completed"
		};
		query.is_deleted = {
			'!': true
		};

		Tripreservation.find(query).populate('vehicle_type') /*.populate('service_type')*/
			.populate('driver_share')
			.populate('payment')
			.sort({
				pickup_date: 1,
				pickup_time: 1
			})
			.exec(function(error, trips) {
				if (error) {
					// return error from here
					res.status(500).json({
						"status_code": "500",
						"message": error
					});
				}
				var output = [];
				if (trips.length) {
					for (var loop = 0; loop < trips.length; loop++) {

						var trip = trips[loop];
						var tripDate = new moment(trip.pickup_date);
						tripDate.add(trip.pickup_time, 'seconds');
						var op = {};

						op.unix_date = tripDate.unix();
						if (trip.id) op.trip_id = trip.id;
						if (trip.conf_id) op.conf_id = trip.conf_id;
						if (trip.service_type) op.service_type = trip.service_type;
						if (trip.service_type == "From Airport") op.service_type_action = trip.service_type_action;
						if (trip.service_type == "From Airport") {
							op.airline = trip.airline ? trip.airline : null;
							op.airport_code = trip.airport_code ? trip.airport_code : null;
							op.flight_number = trip.flight_number ? trip.flight_number : null;

						}
						if (trip.vehicle_type && (typeof trip.vehicle_type == "object")) op.vehicle_type = trip.vehicle_type.vehicle_type;
						if (trip.pickup_time) op.pickup_time = getTime(trip.pickup_time);
						if (trip.pickup_date) op.pickup_date = moment(trip.pickup_date).format("YYYY/MM/DD");
						if (trip.pickup_address) op.pickup_address = trip.pickup_address;
						if (trip.pickup_address_lat) op.pickup_address_lat = trip.pickup_address_lat;
						if (trip.pickup_address_lng) op.pickup_address_lng = trip.pickup_address_lng;
						if (trip.dropoff_address) op.dropoff_address = trip.dropoff_address;
						if (trip.dropoff_address_lat) op.dropoff_address_lat = trip.dropoff_address_lat;
						if (trip.dropoff_address_lng) op.dropoff_address_lng = trip.dropoff_address_lng;
						if (trip.dispatch_notes) op.dispatch_notes = trip.dispatch_notes;
						op.trip_notes = trip.trip_notes ? trip.trip_notes : "";
						if (typeof trip.number_of_passengers !== "undefined") {
							op.number_of_passengers = trip.number_of_passengers;
						}

						if (typeof trip.no_of_bags !== "undefined") {
							op.no_of_bags = trip.no_of_bags;
						}

						if (trip.wait_address && (typeof trip.wait_address !== "undefined") && (trip.wait_address instanceof Array)) {
							if (trip.wait_address.length) op.wait_address = trip.wait_address;
						}

						if (trip.stop_address && (typeof trip.stop_address !== "undefined") && (trip.stop_address instanceof Array)) {
							if (trip.stop_address.length) op.stop_address = trip.stop_address;
						}
						if (trip.first_name) op.first_name = trip.first_name;
						if (trip.phone_number) op.phone_number = trip.phone_number;
						if (trip.first_name) op.first_name = trip.first_name;
						if (trip.last_name) op.last_name = trip.last_name;
						if (typeof trip.forward_car_seat !== "undefined") op.forward_car_seat = trip.forward_car_seat;
						if (typeof trip.rear_car_seat !== "undefined") op.rear_car_seat = trip.rear_car_seat;
						if (typeof trip.booster_car_seat !== "undefined") op.booster_car_seat = trip.booster_car_seat;


						if (trip.trip_status) op.trip_status = trip.trip_status;

						op.driver_share = 0;
						if (trip.payment[0] && driver.driver_percentage) {
							if (trip.driver_share && (typeof trip.driver_share == "object")) {
								if (trip.driver_id == driver.id) {
									op.driver_share = trip.driver_share.trip_amount;
								} else {
									op.driver_share = driverService.calculateCost(trip.payment[0], driver.driver_percentage);
								}
							} else {
								op.driver_share = driverService.calculateCost(trip.payment[0], driver.driver_percentage);
							}
						}
						op.driver_share = toFixed(convert2digits(op.driver_share), 2);
						output.push(op);
					}
				}


				//calculate pending trips here and return from
				// var driver = req.driver,
				query = {};
				query.driver_id = driver.id;
				query.status = "Neutral";
				query.responded = false;
				query.is_deleted = {
					'!': true
				};
				tripService.pending_trips(query, driver, selectedDay, nextDay, function(error, pendingTrips) {
					if (error) {

						pendingTrips = [];
					}


					for (var i = 0; i < pendingTrips.length; i++) {
						// if (pendingTrips[i].unix_date) delete pendingTrips[i].unix_date;
						output.push(pendingTrips[i]);
					}

					output = sortByKey(output, 'unix_date')

					res.json({
						"status_code": "200",
						"message": "success",
						"upcoming_trips": output					
					});

				});

			});

	},
	previous_trips: function(req, res, next) {
		var driver = req.driver,
			moment = require('moment'),
			validator = require('validator'),
			query = {},
			request = _.pick(req.body, 'to_date', 'from_date');

		if ((!request.to_date || typeof request.to_date == "undefined") || (!request.from_date || typeof request.from_date == "undefined")) {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.DateRange.Missing")
			});
		}

		if (request.from_date && request.to_date) {
			var selectedDay = new moment(request.from_date, "YYYY/MM/DD");
			var nextDay1 = new moment(request.to_date, "YYYY/MM/DD");
			var nextDay = new moment(nextDay1).add(86399, 'seconds');


		}
		query.pickup_date = {
			"$gte": selectedDay.toDate(),
			"$lt": nextDay.toDate()
		}
		query.driver_id = driver.id;
		query.trip_status = "Completed";
		query.is_deleted = {
			'!': true
		};
		Tripreservation.find(query).populate('vehicle_type') /*.populate('service_type')*/
			.populate('payment')
			.populate('driver_share')
			.exec(function(error, trips) {
				if (error) {
					// return error from here
					res.status(500).json({
						"status_code": "500",
						"message": error
					});
				}
				if (trips.length) {


					var output = [];
					for (var loop = 0; loop < trips.length; loop++) {
						var trip = trips[loop];

						var op = {};
						if (trip.service_type) op.service_type = trip.service_type;
						if (trip.service_type == "From Airport") op.service_type_action = trip.service_type_action;

						// if (trip.service_type && (typeof trip.service_type == "object")) op.service_type = trip.service_type.service_type;
						if (trip.conf_id) op.conf_id = trip.conf_id;
						if (trip.vehicle_type && (typeof trip.vehicle_type == "object")) op.vehicle_type = trip.vehicle_type.vehicle_type;
						if (trip.pickup_time) op.pickup_time = getTime(trip.pickup_time);
						if (trip.pickup_date) op.pickup_date = moment(trip.pickup_date).format("YYYY/MM/DD");
						if (trip.pickup_address) op.pickup_address = trip.pickup_address;
						if (trip.pickup_address_lat) op.pickup_address_lat = trip.pickup_address_lat;
						if (trip.pickup_address_lng) op.pickup_address_lng = trip.pickup_address_lng;
						if (trip.dropoff_address) op.dropoff_address = trip.dropoff_address;
						if (trip.dropoff_address_lat) op.dropoff_address_lat = trip.dropoff_address_lat;
						if (trip.dropoff_address_lng) op.dropoff_address_lng = trip.dropoff_address_lng;

						if (trip.dispatch_notes) op.dispatch_notes = trip.dispatch_notes;
						if (trip.trip_notes) op.trip_notes = trip.trip_notes;
						if (typeof trip.number_of_passengers !== "undefined") {
							op.number_of_passengers = trip.number_of_passengers;
						}

						if (typeof trip.no_of_bags !== "undefined") {
							op.no_of_bags = trip.no_of_bags;
						}

						if (trip.wait_address && (typeof trip.wait_address !== "undefined") && (trip.wait_address instanceof Array)) {
							if (trip.wait_address.length) op.wait_address = trip.wait_address;
						}

						if (trip.stop_address && (typeof trip.stop_address !== "undefined") && (trip.stop_address instanceof Array)) {
							if (trip.stop_address.length) op.stop_address = trip.stop_address;
						}
						if (trip.first_name) op.first_name = trip.first_name;
						if (trip.phone_number) op.phone_number = trip.phone_number;
						if (trip.first_name) op.first_name = trip.first_name;
						if (trip.last_name) op.last_name = trip.last_name;
						if (trip.trip_status) op.trip_status = trip.trip_status;
						if (typeof trip.forward_car_seat !== "undefined") op.forward_car_seat = trip.forward_car_seat;
						if (typeof trip.rear_car_seat !== "undefined") op.rear_car_seat = trip.rear_car_seat;
						if (typeof trip.booster_car_seat !== "undefined") op.booster_car_seat = trip.booster_car_seat;
						op.driver_share = 0;
						if (trip.driver_share && typeof trip.driver_share == "object") {
							op.driver_share = convert2digits(trip.driver_share.trip_amount);
						} else if (trip.payment[0] && driver.driver_percentage) {
							op.driver_share = convert2digits(driverService.calculateCost(trip.payment[0], driver.driver_percentage));
						}
						op.driver_share = toFixed(convert2digits(op.driver_share), 2);
						//todo -- calculate money of driver and display here
						output.push(op);
					}

					res.json({
						"status_code": "200",
						"message": "Success",
						"previous_trips": output
					})


				} else {
					// return empty array from here
					res.json({
						"status_code": "200",
						"message": "Success",
						"previous_trips": []
					})

				}

			});


	},
	//method to calculate pending trips
	pending_trips: function(req, res, next) {
		var driver = req.driver,
			// moment = require('moment'),
			query = {};
		query.driver_id = driver.id;
		query.status = "Neutral";
		query.responded = false;
		query.is_deleted = {
			'!': true
		};
	

		tripService.pending_trips(query, driver, null, null, function(error, output) {

			if (error) {
				return res.status(400).json({
					"error": error
				});
			}

			res.json({
				"status_code": "200",
				"message": "success",
				"pending_trips": output
			});

		});


	},
	//method to give rating to customer
	rate_customer: function(req, res, next) {
		
		var request = _.pick(req.body, 'trip_id', 'rating', 'rating_notes'),
			obj = {},
			driver = req.driver,
			validator = require('validator');

		
		if (!request.trip_id || typeof request.trip_id == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.TripId.Missing")
			});
		}

		if (!request.rating || typeof request.rating == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.Rating.Missing")
			});
		}


		if (!validator.isInt(request.rating, {
				"min": 1,
				"max": 5
			})) {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Trip.Rating.Invalid")
			});
		}

		//check rating value
		Tripreservation.findOne(request.trip_id).exec(function(error, trip) {
			if (error) {
				return res.status(400).json({
					"status_code": "400",
					"message": error
				});
			}

			if (!trip) {
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n("Error.Trip.NotFound")
				});
			}
			if (driver.id !== trip.driver_id) {
				//error
				return res.status(400).json({
					"status_code": '400',
					"message": res.i18n("Error.Trip.NotAllocate")
				});

			} else {
				//requested driver is aligned with the trip

				trip.customer_rating = request.rating;
				if (request.rating_notes) trip.customer_rating_notes = request.rating_notes;

				trip.save(function(err, updatedTrip) {
					if (err) {
						return res.status(500).json({
							"status_code": "500",
							"message": err
						});
					} else {


						return res.json({
							"status_code": "200",
							"message": "Success"
						});

					}
				});

			}
		});
	},
	update_payments_details: function(req, res, next) {
		var driver = req.driver;
		var validator = require('validator');
		var updateObj = {};
		if (typeof req.body == "undefined" || typeof req.body != "object") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.Request.Missing")
			});
		}

		if (typeof req.body.userdetails == "undefined" || typeof req.body.userdetails != "object") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.Request.UserDetails.Missing")
			});
		}

		if (typeof req.body.userdetails.payments == "undefined" || typeof req.body.userdetails.payments != "object") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.Request.UserDetails.Payments.Invalid")
			});
		}

		var userdetails = _.pick(req.body.userdetails, 'payments');
		if (typeof userdetails == "undefined" || typeof userdetails != "object") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.Request.UserDetails.Missing")
			});
		}

		var paymentinfo = userdetails.payments;

		if (paymentinfo.routing_number !== "undefined") {
			if (!validator.isInt(paymentinfo.routing_number)) {
				return res.status(400).json({
					"status_code": "400",
					"message": res.i18n("Error.Driver.Routing.Invalid")
				});
			}

		}


		if (paymentinfo.routing_number) updateObj.routing_number = paymentinfo.routing_number;
		if (paymentinfo.account_name) updateObj.account_name = paymentinfo.account_name;
		if (paymentinfo.account_number) updateObj.account_number = paymentinfo.account_number;
		if (paymentinfo.bank_name) updateObj.bank_name = paymentinfo.bank_name;
		if (paymentinfo.branch_name) updateObj.branch_name = paymentinfo.branch_name;
		if (paymentinfo.branch_address) updateObj.branch_address = paymentinfo.branch_address;

		Driver.update({
			"id": driver.id
		}, updateObj).exec(function(error, updatedDriverArr) {
			if (error) {
				return res.status(400).json({
					"status_code": "400",
					"message": error
				})
			}
			var updatedDriver = updatedDriverArr[0];
			var respObj = {

				"payments": {}

			};
			if (updatedDriver.routing_number) {
				respObj.payments.routing_number = updatedDriver.routing_number;
			}
			if (updatedDriver.account_name) respObj.payments.account_name = updatedDriver.account_name;
			if (updatedDriver.account_number) respObj.payments.account_number = updatedDriver.account_number;
			if (updatedDriver.bank_name) respObj.payments.bank_name = updatedDriver.bank_name;
			if (updatedDriver.branch_name) respObj.payments.branch_name = updatedDriver.branch_name;
			if (updatedDriver.branch_address) respObj.payments.branch_address = updatedDriver.branch_address;


			return res.status(200).json({
				"status_code": "200",
				"message": "success",
				"userdetails": respObj
			})


		});


	},
	get_payments_details: function(req, res, next) {
		var driver = req.driver;
		var respObj = {
			"payments": {}
		};
		if (driver.routing_number) respObj.payments.routing_number = driver.routing_number;
		if (driver.account_name) respObj.payments.account_name = driver.account_name;
		if (driver.account_number) respObj.payments.account_number = driver.account_number;
		if (driver.bank_name) respObj.payments.bank_name = driver.bank_name;
		if (driver.branch_name) respObj.payments.branch_name = driver.branch_name;
		if (driver.branch_address) respObj.payments.branch_address = driver.branch_address;

		return res.status(200).json({
			"status_code": "200",
			"message": "success",
			"userdetails": respObj
		})

	},

	get_bill_accounts_info: function(req, res, next) {
		var driver = req.driver;

		Driver.findOne(driver.id).populate('drivers_bill_account').exec(function(error, output) {

			if (error) {
				return res.status(400).json({
					"status_code": "400",
					"message": error
				});
			}
			if (output.drivers_bill_account) {
				//code
				res.json({
					"status_code": "200",
					"message": "success",
					"driver": output.drivers_bill_account
				});
			} else {
				res.status(400).json({
					"status_code": "400",
					"message": res.i18n("Error.Driver.Billdotcom.Invalid")
				});


			}

		});

	},
	get_details: function(req, res) {
		var driver = req.driver;

		driverService.responseDriver(driver, function(result) {
			return res.status(200).json({
				status_code: "200",
				message: 'success',
				userdetails: result
			});

		});

	},
	update_device_token: function(req, res) {
		var driver = req.driver;
		var device_token = req.body.device_token;
		if (!device_token || typeof device_token == "undefined") {
			return res.status(400).json({
				"status_code": "400",
				"message": res.i18n("Error.Driver.MissingDeviceToken")
			});
		}
		if (driver.login) {
			// if(driver.login.device_type == "Android"){

			// }
			driver.login.device_token = device_token;
			driver.login.save();
			return res.status(200).json({
				status_code: "200",
				message: 'success'
			});
		} else {
			return res.status(400).json({
				"status_code": "400",
				"message": "Driver should be login"
			});
		}
	},
	app_phone_numbers: function(req, res) {
		var calling_number = "(773)774-1074";
		var message_number = "(708)300-1397";
		res.status(200).json({
			status_code: "200",
			message: "ok",
			calling_number: calling_number,
			message_number: message_number
		});
	},
	/**
	 * Overrides for the settings in `config/blueprint.js`
	 * (specific to ApiController)
	 */
	_config: {}


}

module.exports = ApiController;

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
	var t = hh + ":" + mm + ":" + ss;
	return t;
}


//method to sort the array
function sortByKey(array, key) {
	return array.sort(function(a, b) {
		var x = a[key];
		var y = b[key];
		return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	});

}
//method to typecast to Integer / float
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

function toFixed(num, fixed) {
	fixed = fixed || 0;
	fixed = Math.pow(10, fixed);
	return Math.floor(num * fixed) / fixed;
}

//function to send email for checking credit card issue
function sendEmail(inputObj, customer, str) {
	var nodemailer = require('nodemailer');
	var smtpTransport = require('nodemailer-smtp-transport');
	var i = JSON.stringify(inputObj);
	var c = JSON.stringify(customer);
	var transport = nodemailer.createTransport(smtpTransport({
		host: sails.config.appSMTP.host,
		port: sails.config.appSMTP.port,
		debug: sails.config.appSMTP.debug,
		auth: {
			user: sails.config.appSMTP.auth.user,
			pass: sails.config.appSMTP.auth.pass
		}
	}));
	var mailOptions = {
		from: 'EchoLimousine  <noreply@echolimousine.com>', // sender address	    
		to: 'poonamk@smartdatainc.net', // list of receivers
		subject: 'URGENT: Trip not settled properly>>>' + str, // Subject line
		//text: 'Hello world ', // plaintext body
		html: str + i + c // html body
	};

	transport.sendMail(mailOptions, function(error, info) {
		if (error) {
		} else {
		}
	});
}