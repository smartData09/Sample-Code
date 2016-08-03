exports.validate = function(tripObj, trippaymentmethod, next) {
	var moment = require('moment');
	var validator = require('validator');
	//check for date string in  incoming request	

	if (typeof tripObj.pickup_date == "undefined" || !tripObj.pickup_date) {
		return next({
			"error": "pickup date required"
		});
	}

	if (!validator.isDate(tripObj.pickup_date)) {
		return next({
			"error": "invalid pickupdate"
		});
	}

	if (typeof tripObj.pickup_date !== "undefined") {
		var dt = new Date(tripObj.pickup_date);
		var dt_fmt = dt.getFullYear() + '-' + (dt.getMonth() + 1) + '-' + dt.getDate();
		var pickup = new moment(tripObj.pickup_date, "YYYY-MM-DD");

		tripObj.pickup_date = pickup.toDate(); //	new Date( tripObj.pickup_date , 'yyyy-MM-dd')
	}

	// console.log(">>>>>>>>Pickup Date is " , tripObj.pickup_date);

	if (typeof tripObj.trip_type == "undefined" || !tripObj.trip_type) {
		return next({
			"error": "trip type required"
		});
	}

	if (tripObj.trip_type) {
		if (tripObj.trip_type !== "Quote" && tripObj.trip_type !== "Reservation") {
			return next({
				"error": "invalid value in  trip type "
			});

		}

	}

	if (typeof tripObj.pickup_time == "undefined" || typeof tripObj.pickup_time !== "number") {
		return next({
			"error": "pickup time required"
		});
	}

	if (typeof tripObj.pickup_address == "undefined" || !tripObj.pickup_address) {
		return next({
			"error": "pickup address required"
		});
	}

	// if (typeof tripObj.pickup_address_lat == "undefined" || !tripObj.pickup_address_lat) {
	// 	return next({
	// 		"error": "pickup address latitude required "
	// 	});
	// }

	if (typeof tripObj.pickup_address_lat !== "undefined" && tripObj.pickup_address_lat) {

		if (!validator.isFloat(tripObj.pickup_address_lat)) {
			return next({
				"error": "invalid value in pickup latitude "
			});
		}
	}
	// if (typeof tripObj.pickup_address_lng == "undefined" || !tripObj.pickup_address_lng) {
	// 	return next({
	// 		"error": "pickup address longitude required"
	// 	});
	// }
	if (typeof tripObj.pickup_address_lng !== "undefined" && tripObj.pickup_address_lng) {

		if (!validator.isFloat(tripObj.pickup_address_lng)) {
			return next({
				"error": "invalid value in pickup longitude "
			});
		}
	}

	if (typeof tripObj.dropoff_address == "undefined" || !tripObj.dropoff_address) {
		return next({
			"error": "dropoff address required"
		});
	}

	// if (typeof tripObj.dropoff_address_lat == "undefined" || !tripObj.dropoff_address_lat) {
	// 	return next({
	// 		"error": "dropoff address latitude required "
	// 	});
	// }

	if (typeof tripObj.dropoff_address_lat !== "undefined" && tripObj.dropoff_address_lat) {

		if (!validator.isFloat(tripObj.dropoff_address_lat)) {
			return next({
				"error": "invalid value in dropoff latitude "
			});
		}
	}
	// if (typeof tripObj.dropoff_address_lng == "undefined" || !tripObj.dropoff_address_lng) {
	// 	return next({
	// 		"error": "dropoff address longitude required"
	// 	});
	// }

	if (typeof tripObj.dropoff_address_lng !== "undefined" && tripObj.dropoff_address_lng) {

		if (!validator.isFloat(tripObj.dropoff_address_lng)) {
			return next({
				"error": "invalid value in dropoff longitude "
			});
		}
	}


	if (typeof tripObj.service_type == "undefined" || !tripObj.service_type) {
		return next({
			"error": "service type required"
		});
	}


	if (tripObj.service_type == "From Airport" && typeof tripObj.service_type_action !== "undefined") {} else {
		tripObj.service_type_action = null;
	}

	// check for airport code 
	if (tripObj.service_type == "From Airport" || typeof tripObj.service_type == "To Airport") {} else {
		tripObj.airport_code = null;

	}

	if (typeof tripObj.vehicle_type == "undefined" || !tripObj.vehicle_type) {
		return next({
			"error": "vehicle type required"
		});
	}


	if (typeof tripObj.booster_car_seat !== "undefined") {
		if (!validator.isInt(tripObj.booster_car_seat)) {
			return next({
				"error": "invalid value in booster car seats "
			});
		}
	}


	if (typeof tripObj.forward_car_seat !== "undefined") {
		if (!validator.isInt(tripObj.forward_car_seat)) {
			return next({
				"error": "invalid value in forward car seats "
			});
		}
	}

	if (typeof tripObj.rear_car_seat !== "undefined") {
		if (!validator.isInt(tripObj.rear_car_seat)) {
			return next({
				"error": "invalid value in  rear car seats"
			});
		}
	}

	if (typeof tripObj.first_name == "undefined" || !tripObj.first_name) {
		return next({
			"error": "first name required"
		});
	}

	if (typeof tripObj.last_name == "undefined" || !tripObj.last_name) {
		return next({
			"error": "last name required"
		});
	}

	// if (typeof tripObj.phone_number == "undefined" || !tripObj.phone_number) {
	// 	return next({
	// 		"error": "phone number required"
	// 	});
	// }

	if (typeof tripObj.email == "undefined" || !tripObj.email) {
		return next({
			"error": "email required"
		});
	}

	if (!validator.isEmail(tripObj.email)) {
		return next({
			"error": "invalid email"
		});
	}

	if (typeof tripObj.passangers !== "undefined") {
		// console.log("(((((************---***************)))))");
		if (tripObj.passangers instanceof Array) {


		} else {
			//not an address
			return next({
				"error": "invalid passangers list"
			});
		}

		var passangersList = [];
		passangersList.push({
			"first_name": tripObj.first_name,
			"last_name": tripObj.last_name,
			"phone_number": tripObj.phone_number,
			"email": tripObj.email
		});

		for (var i = 0; i < tripObj.passangers.length; i++) {

			if (typeof tripObj.passangers[i].first_name == "undefined" || !tripObj.passangers[i].first_name) {
				return next({
					"error": "first name required"
				});
			}

			if (typeof tripObj.passangers[i].last_name == "undefined" || !tripObj.passangers[i].last_name) {
				return next({
					"error": "last name required"
				});
			}

			// if (typeof tripObj.passangers[i].phone_number == "undefined" || !tripObj.passangers[i].phone_number) {
			// 	return next({
			// 		"error": "phone number required"
			// 	});
			// }

			// if ( typeof tripObj.passangers[i].email == "undefined" || !tripObj.passangers[i].email ) {
			// 	return next({
			// 		"error": "email required"
			// 	});
			// }

			passangersList.push({
				"first_name": tripObj.passangers[i].first_name,
				"last_name": tripObj.passangers[i].last_name,
				"phone_number": tripObj.passangers[i].phone_number || null,
				"email": tripObj.passangers[i].email
			});
		}

		tripObj.trip_passangers_id = passangersList;
		tripObj.number_of_passengers = tripObj.number_of_passengers ? tripObj.number_of_passengers : tripObj.trip_passangers_id.length
		delete tripObj.passangers;

	}



	if (typeof tripObj.stop_address !== "undefined") {
		//check for stop address

		if (tripObj.stop_address instanceof Array) {


		} else {
			//not an address
			return next({
				"error": "invalid stop address"
			});
		}
	}


	if (typeof tripObj.wait_address !== "undefined") {
		//check for wait address

		if (tripObj.wait_address instanceof Array) {


		} else {
			//not an address
			return next({
				"error": "invalid wait address"
			});
		}
	}

	console.log("Payment Method Type ", trippaymentmethod.type);

	if (typeof trippaymentmethod.type == "undefined" || !trippaymentmethod.type) {
		return next({
			"error": "Payment method  required "
		});
	}

	if (trippaymentmethod.type !== "cc" && trippaymentmethod.type !== "direct bill") {
		return next({
			"error": "Payment method  required "
		});
	}

	return next(null, tripObj);
};

exports.validatePayment = function(trippayments, next) {
		var validator = require('validator');
		if (!trippayments.hourly_unit) {
			trippayments.hourly_unit = 0;
		} else { // check for  type 
			if (!validator.isFloat(trippayments.hourly_unit)) {
				return next({
					"error": "invalid value in hourly unit"
				});
			} else {
				trippayments.hourly_unit = validator.toFloat(trippayments.hourly_unit);
			}
		}
		if (!trippayments.hourly_price) {
			trippayments.hourly_price = 0;
		} else {

		}

		trippayments.hourly = trippayments.hourly_unit * trippayments.hourly_price;
		return next(null, trippayments);
	},
	exports.getCustomer = function(tripObj, trippaymentmethod, next) {
		randomstring = require('randomstring');
		var query = {};
		if (tripObj.account_id) {
			query.account_id = tripObj.account_id;
		} else {
			query.email = tripObj.email;
		}

		Customers.findOne(query).populate('credit_card_details').exec(function(error, customer) {
			console.log("Err", error, customer);
			if (error) {
				return next({
					"error": error
				});
			}

			if (customer) {
				// console.log("In the If ");
				// return next(null, customer)
				if (trippaymentmethod.customercreditcard) {
					if (trippaymentmethod.customercreditcard.card_number) {

						console.log(">>>", trippaymentmethod.customercreditcard, customer.id);
						Creditcard.findOne({
								"customer": customer.id,
								"card_number": trippaymentmethod.customercreditcard.card_number
							})
							.exec(function(err, card) {
								if (err) return next(err);
								if (!card) return next("card not found");
								return next(null, {
									"customer": customer,
									"card": card
								});

							})
					}

				} else if (trippaymentmethod.type == "direct bill") {
					// no need to credit card here 
					// payment_mode
					return next(null, {
						"customer": customer,
						"card": null
					});
				} else if (typeof trippaymentmethod.card_number !== "undefined" && typeof trippaymentmethod.expiry_date !== "undefined") {
					console.log("Here Code Reached ");

					tripReservationService.saveCustomerToAuthorize(customer, trippaymentmethod, function(error, success) {
						if (error) return next(error);
						return next(null, success);
					});
				} else {
					//check for existing card that pass and return 
					//check for direct bill 
					// return next("Payment details required");
					return next(null, {
						"customer": customer,
						"card": null
					});
				}

			} else {
				//create a new customer from here 
				var newpassword = randomstring.generate(8);
				var obj = {};
				obj.first_name = tripObj.first_name;
				obj.last_name = tripObj.last_name;
				obj.email = tripObj.email;
				obj.phone = tripObj.phone_number;
				obj.password = newpassword;
				obj.enable = 'Y';
				console.log('Customer Object is ', obj);

				Customers.create(obj).exec(function(error, customer) {
					if (error) {
						return next({
							"error": error
						});
					}
					//todo - send an email  to the user from here 
					var subjectVal = "New Account  - EchoLimo";
					emailService.send(customer, newpassword, subjectVal, 'forgetpassword', 'Forgot Password' /*view file*/ );


					if (trippaymentmethod.type == "direct bill") {
						// no need to credit card here 
						// payment_mode
						return next(null, {
							"customer": customer,
							"card": null
						});
					} else if (typeof trippaymentmethod.card_number !== "undefined" && typeof trippaymentmethod.expiry_date !== "undefined") {

						tripReservationService.saveCustomerToAuthorize(customer, trippaymentmethod, function(error, success) {
							if (error) return next(error);
							return next(null, success);
						});
					} else {
						// return next("Payment details required");
						return next(null, {
							"customer": customer,
							"card": null
						});

					}

				});

			}
		});



	};

exports.saveCustomerToAuthorize = function(customer, inputObj, next) {
	console.log("Here ++++++++++++++++++++++++++++++++++++", customer);
	var Authorize = require('auth-net-types');
	var _AuthorizeCIM = require('auth-net-cim'),
		AuthorizeCIM = new _AuthorizeCIM({
			api: sails.config.authorize.api,
			key: sails.config.authorize.key,
			sandbox: sails.config.authorize.sandbox

		});

	if (customer.credit_card_details.length) {
		var inputCard = inputObj.card_number;
		inputCard = inputCard.toString();
		var userInputCard = inputCard.substring(inputCard.length - 4, inputCard.length)
		for (var i = 0; i < customer.credit_card_details.length; i++) {
			var customerCard = customer.credit_card_details[i].card_number
			customerCard = customerCard.toString();
			var customerExistingCard = customerCard.substring(customerCard.length - 4, customerCard.length);
			console.log("Match Card from Here ", userInputCard, customerExistingCard);
			if (userInputCard == customerExistingCard) {
				return next(null, {
					"customer": customer,
					"card": customer.credit_card_details[i]
				});
			}

		}
	}

	function checkCustomerProfile(customer, cb) {
		if (customer.authorize_customer_profile_id) {
			return cb(null, customer.authorize_customer_profile_id)
		} else {
			//create a new customer profile over Authorization.net
			AuthorizeCIM.createCustomerProfile({
				customerProfile: {
					merchantCustomerId: customer.account_id, // our customer Id 
					description: customer.first_name,
					email: customer.email
				}
			}, function(err, response) {

				console.log("Err ", err, "Response", response);

				if (err) {
					return cb(err);
				}


				customer.authorize_customer_profile_id = response.customerProfileId;
				customer.save(function(error, saveCustomer) {});

				return cb(null, response.customerProfileId)

			});

		}

	}
	//check if customer isalready created or not 
	checkCustomerProfile(customer, function(err, customerProfileId) {
		if (err) {
			return next({
				"error": err
			})
		}


		var options = {
			customerType: 'individual',
			payment: {
				creditCard: new Authorize.CreditCard({
					cardNumber: inputObj.card_number,
					expirationDate: inputObj.expiry_date
				})
			}
		}

		AuthorizeCIM.createCustomerPaymentProfile({
			customerProfileId: customerProfileId,
			paymentProfile: options
		}, function(err1, paymentResponse) {
			if (err1) {
				return next({
					"error": err1
				})
			}

			customer.authorize_customer_payment_profile_id = paymentResponse.customerPaymentProfileId;
			customer.save();

			AuthorizeCIM.getCustomerPaymentProfile({
				customerProfileId: customerProfileId,
				customerPaymentProfileId: paymentResponse.customerPaymentProfileId

			}, function(err, paymentProfile) {
				if (err) {
					return next({
							"error": err
						})
						//throw error 
				}
				console.log("Payment Profile ", err, paymentProfile, paymentProfile.paymentProfile.payment.creditCard.cardNumber);

				//create a entry on credit card table 

				var cc = {};
				cc.customer = customer.id;
				cc.card_number = paymentProfile.paymentProfile.payment.creditCard.cardNumber;
				var expirydate = paymentProfile.paymentProfile.payment.creditCard.expirationDate;
				cc.payment_profile_id = paymentResponse.customerPaymentProfileId;

				console.log("EXP DATE ", expirydate);
				cc.expiry_month = "XX";

				cc.expiry_year = "XX"
				cc.set_as_default = true;

				if (inputObj.billing_zip_code) cc.billing_zip_code = inputObj.billing_zip_code;
				if (inputObj.card_holder_name) cc.card_holder_name = inputObj.card_holder_name;
				//marked here
				Creditcard.create(cc).exec(function(err, success) {
					//console.log("SUCCESS FIRST>> ", success);
					if (err) {
						return next({
							"error": err
						})
					}
					if (!success.customer) {
						sendEmail(success, 'no details', 'FRIST CREATE')
					}
					return next(null, {
						"customer": customer,
						"card": success
					});


				});

			});

		});

	});

}

exports.addnewcc = function(customer, inputObj, next) {
	// console.log("AAA", sails.config.authorize);
	console.log("***cusotmer>>", customer);
	if (!customer.id) {
		sendEmail(inputObj, customer,'ADD NEW CC');
		return next('Customer Id not found');

	}

	//console.log('***inputObj', inputObj);
	//return false;
	var Authorize = require('auth-net-types');
	var _AuthorizeCIM = require('auth-net-cim'),
		AuthorizeCIM = new _AuthorizeCIM({
			api: sails.config.authorize.api, //
			key: sails.config.authorize.key,
			sandbox: sails.config.authorize.sandbox // false
		});

	//check if custoer profile exists; if not create new cutomer profile before adding customer payment details
	function checkCustomerProfile(customer, cb) {
		if (customer.authorize_customer_profile_id) {
			return cb(null, customer.authorize_customer_profile_id)
		} else {
			//create a new customer profile over Authorization.net
			AuthorizeCIM.createCustomerProfile({
				customerProfile: {
					merchantCustomerId: customer.account_id, // our customer Id 
					description: customer.first_name,
					email: customer.email
				}
			}, function(err, response) {

				console.log("Err ", err, "Response when new created^^^^^", response);

				if (err) {
					return cb(err);
				}

				console.log('customer', customer);
				customer.authorize_customer_profile_id = response.customerProfileId;
				customer.save(function(error, saveCustomer) {});

				return cb(null, response.customerProfileId)

			});



		}

	}

	checkCustomerProfile(customer, function(error, customerProfileId) {

		console.log("customerProfileId", customerProfileId);
		var options = {
			customerType: 'individual',
			payment: {
				creditCard: new Authorize.CreditCard({
					cardNumber: inputObj.card_number,
					expirationDate: inputObj.expiry_date
				})
			}
		}

		AuthorizeCIM.createCustomerPaymentProfile({
			customerProfileId: customerProfileId,
			paymentProfile: options
		}, function(err1, paymentResponse) {
			//console.log("err1 paymentResponse", err1, paymentResponse);
			if (err1) {
				if (err1.code == "E00039") {
					return next("Entered card is already saved  in the profile");
				}

				return next(err1);
			}
			console.log("paymentResposne", paymentResponse);
			if (paymentResponse.customerPaymentProfileId) {
				// credit_card_details

				AuthorizeCIM.getCustomerProfile(customerProfileId, function(err, response) {
					//console.log("%%%%%%response", response);
					// console.log("Err", err, "Response", response);
					if (err) {
						return next(err);
					}

					if (response) {

						if (typeof response.profile !== "undefined") {
							var card;

							if (response.profile.paymentProfiles) {
								//multiple Card need to find our  inserted 	card
								//console.log("Multiple")
								var cards = response.profile.paymentProfiles;
								if (cards.length) {
									for (var i = 0; i < cards.length; i++) {
										//console.log('123:', cards[i].customerPaymentProfileId);
										if (paymentResponse.customerPaymentProfileId == cards[i].customerPaymentProfileId) {
											card = cards[i];
										}
									}
								} else {
									card = response.profile.paymentProfiles;
								}


							} else if (response.profile.paymentProfile) {
								//single card 
								console.log("Single card");
								card = response.profile.paymentProfile;
							}
							console.log('card####', card);
							if (card) {
								//save in db ; 
								var cc = {};
								cc.customer = customer.id;
								cc.card_number = card.payment.creditCard.cardNumber;
								var expirydate = card.payment.creditCard.expirationDate;
								cc.payment_profile_id = paymentResponse.customerPaymentProfileId;
								console.log("EXP DATE ", expirydate);
								cc.expiry_month = "XX";
								cc.expiry_year = "XX"
								if (inputObj.billing_zip_code) cc.billing_zip_code = inputObj.billing_zip_code;
								if (inputObj.card_holder_name) cc.card_holder_name = inputObj.card_holder_name;
								if (inputObj.card_type) cc.card_type = inputObj.card_type;

								console.log('ccc details', cc);
								Creditcard.create(cc).exec(function(err, success) {
									console.log("SUCCESS SECOND", success);
									if (err) {
										return next(err)
									}

									if (!success.customer) {
										sendEmail(success, 'no details', 'SECOND CREATE')
									}

									return next(null, success);

								});



							} else {
								return next("Issue in while saving the card");
							}
						} else {
							return next("Issue in while saving the card");

						}
					}
				});
			}
		});
	});



};


/*
edit profile in authorize.net
*/
exports.editnewcc = function(customer, inputObj, next) {
	// console.log("AAA", sails.config.authorize);
	var Authorize = require('auth-net-types');
	var _AuthorizeCIM = require('auth-net-cim'),
		AuthorizeCIM = new _AuthorizeCIM({
			api: sails.config.authorize.api, //
			key: sails.config.authorize.key,
			sandbox: sails.config.authorize.sandbox // false
		});

	console.log('inputObj****', inputObj);

	function checkCustomerProfile(customer, cb) {
		if (customer.authorize_customer_profile_id) {
			return cb(null, customer.authorize_customer_profile_id)
		} else {
			//create a new customer profile over Authorization.net
			AuthorizeCIM.createCustomerProfile({
				customerProfile: {
					merchantCustomerId: customer.account_id, // our customer Id 
					description: customer.first_name,
					email: customer.email
				}
			}, function(err, response) {

				console.log("Err ", err, "Response", response);

				if (err) {
					return cb(err);
				}


				customer.authorize_customer_profile_id = response.customerProfileId;
				customer.save(function(error, saveCustomer) {});

				return cb(null, response.customerProfileId)

			});



		}

	}

	checkCustomerProfile(customer, function(error, customerProfileId) {



		var query = {};
		if (inputObj.card_number && inputObj.card_number != "") {
			query.cardNumber = inputObj.card_number;
		}
		if (inputObj.expiry_date && inputObj.expiry_date != "") {
			query.expirationDate = inputObj.expiry_date;
		}
		console.log('customer.authorize_customer_profile_id',customer.authorize_customer_profile_id);
		console.log('query is', query);

		AuthorizeCIM.updateCustomerPaymentProfile({
			customerProfileId: customer.authorize_customer_profile_id,
			customerType: 'individual',
			paymentProfile: new Authorize.PaymentProfile({
				customerPaymentProfileId: inputObj.payment_profile_id,
				payment: new Authorize.Payment({
					creditCard: new Authorize.CreditCard(query)
				})
			})
		}, function(err, resp) {
			if (err) {
				if (err.code == "E00039") {
					return next("Entered card is already saved  in the profile");
				}

				return next(err);
			}
			if (resp) {
				AuthorizeCIM.getCustomerProfile(customer.authorize_customer_profile_id, function(err, response) {
					console.log("Err", err, "Response***", response);
					console.log('response%%%%%%%%',JSON.stringify(response.profile.paymentProfiles.payment));
					console.log('response%%%%%%%%',JSON.stringify(response.profile.paymentProfiles));
					if (err) {
						return next(err);
					}

					if (response) {

						if (typeof response.profile !== "undefined") {
							var card;
							/*console.log('array',response.profile.paymentProfiles instanceof Array)
							console.log('object',response.profile.paymentProfiles instanceof Object)*/
							if (response.profile.paymentProfiles instanceof Array) {
								//multiple Card need to find our  inserted 	card								
								var cards = response.profile.paymentProfiles;

								for (var i = 0; i < cards.length; i++) {

									if (inputObj.payment_profile_id == cards[i].customerPaymentProfileId) {
										card = cards[i];
									}
								}

							} else  {
								//commented b
								/*if (response.profile.paymentProfile)*/
								//single card 
								card = response.profile.paymentProfiles;
							}
							console.log('card******',card);
							if (card) {
								console.log('######customer####',customer);
								//save in db ; 
								var cc = {};								
								cc.customer = customer.id;
								cc.card_number = card.payment.creditCard.cardNumber;
								var expirydate = card.payment.creditCard.expirationDate;
								cc.payment_profile_id = inputObj.payment_profile_id
								cc.expiry_month = "XX";
								cc.expiry_year = "XX"
								if (inputObj.billing_zip_code) cc.billing_zip_code = inputObj.billing_zip_code;
								if (inputObj.card_holder_name) cc.card_holder_name = inputObj.card_holder_name;
								if (inputObj.set_as_default) {
									cc.set_as_default = inputObj.set_as_default
								} else {
									cc.set_as_default = false;
								}

								Creditcard.update({
									"id": inputObj.id
								}, cc).exec(function(err, updated) {
									if (err) {
										return next(err)
									}
									//find all the cards and return their value
									//console.log('updated>>',updated[0]);
									Creditcard.find({
										"customer": updated[0].customer
									}).exec(function(err, details) {
										return next(null, details);
									})


								});
								// Creditcard.create(cc).exec(function(err, success) {
								// 	console.log("Error is ", cc, err, success);
								// 	if (err) {
								// 		return next(err)
								// 	}
								// 	return next(null, success);

								// });



							} else {
								return next("Issue in while saving the card");
							}
						} else {
							return next("Issue in while saving the card");

						}
					}
				});
			}
		});



	});



};
exports.getinvitationDriver = function(output, tripIds, cb) {
	if (output.length == 0 || tripIds.length == 0) {
		return cb(null, output);
	}

	// console.log(">>Here");
	var driverTripIds = [];
	var driversId = [];
	Tripinvitations.find({
		trip_id: tripIds
	}).sort('createdAt desc').exec(function(error, invitations) {

		for (var i = 0; i < tripIds.length; i++) {
			for (var j = 0; j < invitations.length; j++) {
				// if (output[i].driver_id) {
				if (tripIds[i] == invitations[j].trip_id) {
					// output[i].driver_id = driverData[j];
					driverTripIds.push({
						driver: invitations[j].driver_id,
						trip: tripIds[i]
					})
					break;
				}
				// }
			}
		}
		if (driverTripIds.length) {
			var invitationLen = driverTripIds.length;
			while (invitationLen) {
				// console.log("invitationLen" , invitationLen)
				driversId.push(driverTripIds[invitationLen - 1].driver)
				invitationLen--;
			}

			// console.log(driverTripIds.length  , driverTripIds , driversId , "RR")

			Driver.find({
					"id": driversId
				})
				.populate('fleet')
				.exec(function(error, driverData) {
					if (!error && driverData.length) {
						for (var i = 0; i < driverTripIds.length; i++) {
							for (var j = 0; j < driverData.length; j++) {
								if (driverTripIds[i].driver == driverData[j].id) {
									driverTripIds[i].driver_detail = driverData[j];
									break;
								}

							}
						}


						for (var j = 0; j < output.length; j++) {
							for (var i = 0; i < driverTripIds.length; i++) {
								if (driverTripIds[i].trip == output[j].id) {
									output[j].driver_detail = driverTripIds[i].driver_detail;
									output[j].driver_name = driverTripIds[i].driver_detail.nick_name ? driverTripIds[i].driver_detail.nick_name : driverTripIds[i].driver_detail.first_name + " " + driverTripIds[i].driver_detail.last_name;
									// driverTripIds[i].driver_detail = driverData[j]; 
									// console.log("Here Driver Detail >>>" , output[j].driver_detail.id , "output[j].driver_name" , output[j].driver_name ) ; 
									break;
								}

							}
						}
						
						
						return cb(null, output);



					} else {
						return cb(null, output);

					}
				});
		} else {
			return cb(null, output);
		}
	})
};


exports.getEtaFromGoogle = function(onRouteTrips, trips, cb) {
		var googleServerKey = "AIzaSyBapJv-RG4-wNDo1UJHp2p_bvSZAnkdk_M";
		var origins = "";
		var destinations = "";
		var requestObj = require("request");
		var urlArr = [];
		var tripArr = [];
		var tripOnRoutes = [];
		var url = "";
		// ZERO_RESULTS OK
		var j = 0;
		for (var i = 0; i < onRouteTrips.length; i++) {
			j++;

			//change lat long of driver here when complete 
			tripArr.push({
				id: onRouteTrips[i].id
			});
			if (onRouteTrips[i].pickup_address_lat && onRouteTrips[i].pickup_address_lng) {
				origins += (onRouteTrips[i].pickup_address_lat + "," + onRouteTrips[i].pickup_address_lng)
			} else {
				origins += encodeURIComponent(onRouteTrips[i].pickup_address);
			}
			if (onRouteTrips[i].dropoff_address_lat && onRouteTrips[i].dropoff_address_lng) {
				destinations += (onRouteTrips[i].dropoff_address_lat + "," + onRouteTrips[i].dropoff_address_lng);

			} else {
				destinations += encodeURIComponent(onRouteTrips[i].dropoff_address);

			}

			if (j % 10 == 0 || i == (onRouteTrips.length - 1)) {
				//console.log("HERE ", j, "I is ", i)
				var url = "https://maps.googleapis.com/maps/api/distancematrix/json?";
				url += "origins=" + origins;
				url += "&destinations=" + destinations;
				// url +="&key="+googleServerKey ;
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

		var op = [];
		//callback here to handle the batch  ETA Calling 
		function callGoogleEta(url, counter, tripIds, cb) {
			//console.log("URL IS " , url );
			// return cb(null ,  tripIds) ; 
			//call the http to get the desired results here
			requestObj(url, function(err, response, body) {
				// console.log("Err" , err , "Respo" , response , "Body " , body  , typeof body);
				var response = JSON.parse(body);
				//console.log("ROWS" , response.status /*, response.rows*/);
				// if(response.status!=="OK"){
				// 	return  cb(null ,  tripIds) ; 
				// }

				var resp = response.rows;
				//console.log("HHHHEERRREE" , tripIds.length,"Response Lenght ",response.rows.length);

				for (var i = 0; i < response.rows.length; i++) {
					if (response.rows[i].elements) {
						if (response.rows[i].elements[0]) {
							if (response.rows[i].elements[0].status == "OK") {
								tripIds[i].timeEstimateSec = response.rows[i].elements[0].duration.value;
								tripIds[i].timeEstimate = response.rows[i].elements[0].duration.text;
								//console.log("TIME", response.rows[i].elements[0].duration.value );
							}
						} else {

						}
					} else {

					}
				}

				return cb(null, tripIds);
			});
		}
		var i = 0;
		var recursive = function(err, succ) {
			if (i > 0) {
				if (succ) {
					for (var k = 0; k < succ.length; k++) {
						op.push(succ[k]);
					}
				}
			}

			if (i == urlArr.length) {
				// return from here 
				//console.log("CB is " , op )
				return cb(null, trips);
			}
			i++;
			if (i <= urlArr.length)
				callGoogleEta(urlArr[i - 1], i, tripOnRoutes[i - 1], recursive);
		}

		recursive();
		// console.log("URLS ", tripOnRoutes ,  urlArr.length, urlArr);


	}
	//function to send email for checking credit card issue
function sendEmail(inputObj, customer, str) {
	var nodemailer = require('nodemailer');
	var smtpTransport = require('nodemailer-smtp-transport');
	//console.log('inside sending email****');
	var i = JSON.stringify(inputObj);
	var c = JSON.stringify(customer);
	i = '>>>credticard details>>>' + i;
	c = '******customer details>>>' + c;
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
		subject: 'URGENT:CREDIT CARD >>>'+str, // Subject line
		//text: 'Hello world ', // plaintext body
		html: str+i + c // html body
	};

	transport.sendMail(mailOptions, function(error, info) {
		if (error) {
			console.log(error);
		} else {
			console.log('Message sent: ', info);
		}
	});
}


