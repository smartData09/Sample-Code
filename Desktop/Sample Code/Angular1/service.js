"use strict"

angular.module("AppointmentScheduling")

.factory('AppointmentSchedulingService', ['$http', 'communicationService', function($http, communicationService) {

	var service = {};

	service.getOfficeList = function(subscriberId, callback) {
		        var serviceURL = webservices.officesList + "/" + subscriberId;
			communicationService.resultViaGet(serviceURL, appConstants.authorizationKey, headerConstants.json, function(response) {
			callback(response.data);
		});
	}
	
	service.getPatientList = function(inputJsonString, callback) {
			communicationService.resultViaPost(webservices.patientList, appConstants.authorizationKey, headerConstants.json, inputJsonString,  function(response) {
			callback(response.data);
		});
	}
	
	service.listAllDiagnosis = function(searchDiagString, callback) {
			communicationService.resultViaPost(webservices.officeDiagnosisList, appConstants.authorizationKey, headerConstants.json, searchDiagString, function(response) {
			callback(response.data);
		});
	}
	
	service.getProviderList = function(inputJsonString,callback) {
			communicationService.resultViaPost(webservices.providersList, appConstants.authorizationKey, headerConstants.json,inputJsonString, function(response) {
			callback(response.data);
		});
	}
	
	service.listAllReferrerTypes = function(inputJson , callback) {
			communicationService.resultViaPost(webservices.listReferrerTypes, appConstants.authorizationKey, headerConstants.json, inputJson , function(response) {
			callback(response.data);
		});
	}
	
	service.getdiagAppt = function(inputJson , callback) {
			communicationService.resultViaPost(webservices.listDiagApptTypes, appConstants.authorizationKey, headerConstants.json, inputJson , function(response) {
			callback(response.data);
		});
	}

	service.getFilteredTask = function(searchJsonString, callback) {
			communicationService.resultViaPost(webservices.filterOfficeTasksList, appConstants.authorizationKey, headerConstants.json, searchJsonString, function(response) {
			callback(response.data);
		});
	}

	service.getOffice = function(officeId, callback) {
		var serviceURL = webservices.findOneOffice + "/" + officeId;
		communicationService.resultViaGet(serviceURL, appConstants.authorizationKey, "", function(response) {
			callback(response.data);
		});
	}

	service.filterOfficeList = function(searchJsonString, callback) {
			communicationService.resultViaPost(webservices.filterofficesList, appConstants.authorizationKey, headerConstants.json, searchJsonString, function(response) {
			callback(response.data);
		});
	}
	
	service.getTasksEstimatedTime = function(inputJson, callback) {		

		communicationService.resultViaPost(webservices.getTasksEstimatedTime, appConstants.authorizationKey, headerConstants.json, inputJson, function(response) {
			callback(response.data);
		});
	};

	service.fetchScheduleList = function(inputJson, callback) {		
		communicationService.resultViaPost(webservices.fetchScheduleList, appConstants.authorizationKey, headerConstants.json, inputJson, function(response) {
			callback(response.data);
		});
	};
	
    service.fetchScheduleListView = function(inputJson, callback) {		
		communicationService.resultViaPost(webservices.fetchScheduleListView, appConstants.authorizationKey, headerConstants.json, inputJson, function(response) {
			callback(response.data);
		});
	};		

	service.addAppointment = function(inputJson , callback){
		communicationService.resultViaPost(webservices.addAppointment, appConstants.authorizationKey, headerConstants.json, inputJson, function(response) {
			callback(response.data);
		});
	}

	service.getSlotStartTimes = function(inputJson, callback) {		
		communicationService.resultViaPost(webservices.getSlotStartTimes, appConstants.authorizationKey, headerConstants.json, inputJson, function(response) {
			callback(response.data);
		});
	};

	service.editAppointment = function(inputJson, callback) {		
		communicationService.resultViaPost(webservices.editAppointment, appConstants.authorizationKey, headerConstants.json, inputJson, function(response) {
			callback(response.data);
		});
	};	

	service.deleteAppointment = function(inputJson, callback) {		
		communicationService.resultViaPost(webservices.deleteAppointment, appConstants.authorizationKey, headerConstants.json, inputJson, function(response) {
			callback(response.data);
		});
	};	

    service.getOfficeTime = function(inputJson, callback) {		
		communicationService.resultViaPost(webservices.getOfficeTime, appConstants.authorizationKey, headerConstants.json, inputJson, function(response) {
			callback(response.data);
		});
	};	



	return service;


}]);
