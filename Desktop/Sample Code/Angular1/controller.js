  "use strict";

  angular.module("AppointmentScheduling").controller("AppointmentSchedulingController", ['$scope', '$rootScope', '$localStorage', 'AppointmentSchedulingService', '$stateParams', '$state', '$location', "$compile", "uiCalendarConfig", '$uibModal', '$timeout', 'toastr', '$confirm', function($scope, $rootScope, $localStorage, AppointmentSchedulingService, $stateParams, $state, $location, $compile, uiCalendarConfig, $uibModal, $timeout, toastr, $confirm) {

          if ($localStorage.userLoggedIn) {
              $rootScope.userLoggedIn = true;
              $rootScope.loggedInUser = $localStorage.loggedInUsername;
              var created_by = $localStorage.loggedInUserId;
              if ($localStorage.userType == 1) {
                  var subscribe_id = $rootScope.superadmin_subscriberid;
              } else if ($localStorage.userType == 2) {
                  var subscribe_id = $localStorage.loggedInUserId;
              } else if ($localStorage.userType == 3) {
                  var subscribe_id = $localStorage.loggedInUser.subscriber_id;
              }

          } else {
              $rootScope.userLoggedIn = false;
          }


          if ($rootScope.message != "") {

              $scope.message = $rootScope.message;
          }

          // console.log("uiCalendarConfig", uiCalendarConfig);
          $scope.daysArray = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          $scope.timeArray = ["AM", "PM"];
          $scope.userSelection = {};
          $scope.userSelection.totalTime = null;
          $scope.userSelection.days = [];
          $scope.userSelection.timeSelection = [];
          $scope.taskListData = [];
          $scope.tasksEstimatedTimesArray = [];
          // $scope.userSelection.patientId ={};
          // $scope.userSelection.diagId = {};
          // $scope.userSelection.office_id = {};
          // $scope.userSelection.apptTypeId = {};
          // $scope.userSelection.refererId = {};
          // $scope.userSelection.providerId = {};



          $scope.getAllOffices = function() {
              var selectedOffice = $localStorage.selectedOffice;
              AppointmentSchedulingService.getOfficeList(subscribe_id, function(response) {
                  if (response.messageId == 200) {
                      $scope.officeData = response.data;
                      if (selectedOffice && selectedOffice !== "null") {
                          // console.log("Office here ", selectedOffice);
                          angular.forEach($scope.officeData, function(key, value) {
                              if (key._id == selectedOffice) {
                                  $scope.userSelection.office_id = key;
                                  $scope.getOtherDropInfo(key);
                              }
                          })
                      }

                  }
              });
          }

          $scope.getdiagAppt = function() {
              var diagdata = {};
              diagdata.subscriber_id = subscribe_id;
              diagdata.diag_id = $scope.userSelection.diagId;
              diagdata.office_id = $scope.userSelection.office_id;
              AppointmentSchedulingService.getdiagAppt(diagdata, function(response) {
                  $scope.apptTypes = [];
                  if (response.data.length)
                      $scope.apptTypes = response.data[0].appointmentTypes;
              });
          }

          $scope.getOtherDropInfo = function() {
              var inputJson = {};
              inputJson.subscriber_id = subscribe_id;
              inputJson.office_id = $scope.userSelection.office_id;

              //Change here office configs

              if ($scope.userSelection.office_id) {
                  $localStorage.selectedOffice = $scope.userSelection.office_id._id;
                  var timeop = SecondsTohhmmss($scope.userSelection.office_id.default_slot_time /*80*/ );
                  $scope.uiConfig.calendar.slotDuration = timeop.hour + ":" + timeop.min + ":" + "00"; // "00:30:00";          



                  var inputJsonForOffice = {};
                  inputJsonForOffice.office_id = $scope.userSelection.office_id._id;
                  inputJsonForOffice.subscriber_id = subscribe_id;
                  inputJsonForOffice.request_start_day = new moment().format("YYYY-MM-DD");
                  var endday = new moment();
                  endday.add(2, "year");
                  inputJsonForOffice.request_end_day = endday.format("YYYY-MM-DD");

                  AppointmentSchedulingService.getOfficeTime(inputJsonForOffice, function(responseData) {
                      $scope.uiConfig.calendar.minTime = responseData.mintime ? responseData.mintime : "00:00:00"; // "00:30:00";          
                      $scope.uiConfig.calendar.maxTime = responseData.maxtime ? responseData.maxtime : "24:00:00"; // "00:30:00";          
                      // if (responseData.mintime) {
                      //   var mintime = $scope.ConvertTimeformat("00:00", $scope.userSelection.office_id.default_start_time) + ":00";
                      // }
                      // if ($scope.userSelection.office_id.default_end_time) {
                      //   var maxTime = $scope.ConvertTimeformat("00:00", $scope.userSelection.office_id.default_end_time) + ":00";
                      //   $scope.uiConfig.calendar.maxTime = maxTime; //maxTime+":00"; // "00:30:00";          
                      // }
                  });
              } else {
                  $localStorage.selectedOffice = null;
              }

              AppointmentSchedulingService.getPatientList(inputJson, function(response) {
                  $scope.patientData = response.data;
              });

              AppointmentSchedulingService.listAllDiagnosis(inputJson, function(response) {
                  $scope.diagData = response.data;
              });

              var data1 = {};
              data1.createdBy = $localStorage.loggedInUserId;
              data1.officeId = $scope.userSelection.office_id;
              data1.subscriber_id = subscribe_id;

              AppointmentSchedulingService.getProviderList(data1, function(response) {
                  $scope.providerData = response.data;
              });
              // // console.log("inputJson" , inputJson );
              AppointmentSchedulingService.listAllReferrerTypes(inputJson, function(response) {
                  $scope.refererData = response.data;
              });

              var inputJson = {};
              inputJson.subscribe_id = subscribe_id;
              inputJson.office_id = $scope.userSelection.office_id;

              AppointmentSchedulingService.getFilteredTask(inputJson, function(response) {
                  $scope.taskListData = angular.copy(response.data);
                  $scope.officeTaskList = response.data;
              });

          }

          $scope.getTasksEstimatedTime = function() {
              // console.log("Change Triggers  from here ");

              if ($scope.userSelection.office_id && $scope.userSelection.diagId && $scope.userSelection.apptTypeId && $scope.userSelection.patientId) {

                  var inputJson = {};
                  inputJson.subscriber_id = subscribe_id;
                  inputJson.office_id = $scope.userSelection.office_id._id;
                  inputJson.diagId = $scope.userSelection.diagId._id;
                  inputJson.apptTypeId = $scope.userSelection.apptTypeId._id;
                  inputJson.refererId = $scope.userSelection.refererId ? $scope.userSelection.refererId.referrer_type : null;
                  inputJson.patientType = $scope.userSelection.patientId.patient_type;

                  AppointmentSchedulingService.getTasksEstimatedTime(inputJson, function(response) {
                      // // console.log("Response of Estimated Tasks are ", response);
                      var taskResponse = response.data;
                      $scope.tasksEstimatedTimesArray = taskResponse;
                      var total = 0;
                      if ($scope.taskListData.length && taskResponse && taskResponse.length) {
                          for (var i = 0; i < $scope.taskListData.length; i++) {
                              for (var j = 0; j < taskResponse.length; j++) {
                                  if ($scope.taskListData[i]._id == taskResponse[j]._id /*&& taskResponse[j].finalTime*/ ) {

                                      if (typeof taskResponse[j].finalTime !== "undefined") total += taskResponse[j].finalTime;
                                      // // console.log("Final Time is " , $scope.taskListData[i].title ,  " ==",  taskResponse[j].finalTime )
                                      $scope.taskListData[i].finalTime = taskResponse[j].finalTime;
                                      $scope.taskListData[i].patientTypeAdjustments = taskResponse[j].patientTypeAdjustments;
                                      $scope.taskListData[i].referrerAdjustments = taskResponse[j].referrerAdjustments;
                                      $scope.taskListData[i].time = taskResponse[j].time;
                                  }

                              }
                              $scope.userSelection.totalTime = total;

                          }
                      }
                      // console.log("TOTAL TIME IS " , $scope.userSelection.totalTime , total )

                  });
              }

          }

          $scope.removeTask = function(card, index) {
              // console.log("Index is ", index);
              // var dealId = dealdata.id ;    
              var myDataArr = $scope.taskListData;

              // console.log("Length ", myDataArr.length);
              //check for index first and last here 
              for (var i = 0; i < myDataArr.length; i++) {
                  if (myDataArr[i] == card) {
                      myDataArr.splice(index, 1);
                  }
              }
          };


          $scope.addTask = function() {

              //calculate and pass data to modal
              var completeTaskArray = angular.copy($scope.officeTaskList);
              var taskListData = $scope.taskListData;
              var taskArray = [];
              angular.forEach(completeTaskArray, function(value, key) {
                  // // console.log("key" , key , value);
                  var flag = false;
                  for (var i = 0; i < taskListData.length; i++) {
                      if (value._id == taskListData[i]._id) {
                          flag = true;
                      }
                  }

                  if (!flag) {
                      taskArray.push(value);
                  }

                  // this.push(key + ': ' + value);
              });

              var data = {
                  "diagnosis": $scope.userSelection.diagId,
                  task: taskArray
              };

              var modalInstance = $uibModal.open({
                  templateUrl: 'addschedulingtask.html',
                  size: 'sm',
                  controller: 'ApptSchedulingTaskController',
                  // windowClass: 'small-modal-box',
                  resolve: {
                      items: function() {
                          return data;
                      }
                  }
              });
              modalInstance.result.then(function() {
                  // console.log('Modal opened at: ' + new Date());
              }, function() {
                  // console.log('Modal dismissed at: ' + new Date());
              });
          };

          $rootScope.$on("CallForGridRefresh", function(event, data) {
              $scope.fetchSchedule();
          });

          $scope.fetchSchedule = function() {
              // console.log("refetchEvents");
              if (uiCalendarConfig.calendars && uiCalendarConfig.calendars.myCalendar2)
                  uiCalendarConfig.calendars.myCalendar2.fullCalendar('refetchEvents');


              // show the loader 
              // $scope.showloader = true;
              // var inputJson = {};

              // AppointmentSchedulingService.fetchScheduleList(inputJson, function(response) {
              //   // console.log("Response is ", response);
              //   // hide the loader
              //   $scope.showloader = false;
              //   $scope.scheduledData = response;
              //   // fetchScheduleList
              //   $scope.changeMonthView($scope.scheduledData);
              //   $scope.changeWeekView($scope.scheduledData);

              // });
          }

          $scope.remoteUrlRequestFn = function(str) {
              return {
                  search: str,
                  subscriber_id: subscribe_id
              };
          }

          $scope.changeMonthView = function(data) {
              // // console.log("OPTIONS ARE  >> ", data, uiCalendarConfig, "RR", uiCalendarConfig.calendars.myCalendar2.fullCalendar('getDate').startOf("month").format("YYYY-MM-DD"));
              // // console.log(data.length);
              for (var i = 0; i < data.length; i++) {
                  if (data[i].preference) {
                      // // console.log($('.fc-month-view fc-day[data-date="' + data[i].ScheduleDate + '"]') , "==") ; 
                      $('.fc-month-view .fc-day[data-date="' + data[i].ScheduleDate + '"]').addClass('fc-green');
                  }
              }
          }

          $scope.changeWeekView = function(data) {
              // console.log("Date ", uiCalendarConfig.calendars.myCalendar2.fullCalendar('getDate').format("YYYY-MM-DD"))
              // console.log(uiCalendarConfig.calendars.myCalendar2.fullCalendar('getDate').startOf("week").format("YYYY-MM-DD"))
              // console.log(uiCalendarConfig.calendars.myCalendar2.fullCalendar('getDate').endOf("week").format("YYYY-MM-DD"))
              var weekStart = uiCalendarConfig.calendars.myCalendar2.fullCalendar('getDate').startOf("week").format("YYYY-MM-DD");
              var weekEnd = uiCalendarConfig.calendars.myCalendar2.fullCalendar('getDate').endOf("week").format("YYYY-MM-DD");
              var eventArray = [];

              for (var i = 0; i < data.length; i++) {
                  //push events over here for the week 
                  // // console.log("Slots  length", weekStart  , weekEnd,  data[i].ScheduleDate);
                  var dtArray = data[i].ScheduleDate.split("-")

                  if (weekStart <= data[i].ScheduleDate && weekEnd >= data[i].ScheduleDate) {

                      // // console.log("middle week ", weekStart  , weekEnd,  data[i].ScheduleDate);
                      var year = dtArray[0],
                          month = dtArray[1],
                          day = dtArray[2];

                      for (var j = 0; j < data[i].slots.length; j++) {
                          // // console.log(data[i].slots[j][0].sos , data[i].slots[j][data[i].slots[j].length -1].eos ) ; 
                          var dtArrayHM = data[i].slots[j][0].sos.split(":");
                          var dtArrayEndHM = data[i].slots[j][data[i].slots[j].length - 1].eos.split(":");


                          eventArray.push({
                              title: data[i].ScheduleDate,
                              start: new Date(year, month, day, dtArrayHM[0], dtArrayHM[1]),
                              end: new Date(year, month, day, dtArrayEndHM[0], dtArrayEndHM[1]),
                              allDay: false,
                              className: ['customerFeed']
                          });

                      }
                  }
              }

              if (eventArray.length) {
                  angular.copy(eventArray, $scope.calEventsExt.events);
              }

          }

          $scope.taskTimeChanged = function() {
              // // console.log("taskTimeChangeds") ; 
              $scope.calculateAppointmentTotalTime();

          };



          $rootScope.$on("TaskAdded", function(event, data) {
              // // console.log(event , data);
              for (var i = 0; i < $scope.tasksEstimatedTimesArray.length; i++) {
                  if ($scope.tasksEstimatedTimesArray[i]._id == data._id) {
                      data.finalTime = $scope.tasksEstimatedTimesArray[i].finalTime;
                      data.patientTypeAdjustments = $scope.tasksEstimatedTimesArray[i].patientTypeAdjustments;
                      data.referrerAdjustments = $scope.tasksEstimatedTimesArray[i].referrerAdjustments;
                      data.time = $scope.tasksEstimatedTimesArray[i].time;
                  }
              }
              $scope.taskListData.push(data);

          })


          $scope.$watchCollection("taskListData", function(n, o) {
              if (typeof n !== "undefined") {
                  // // console.log("Task Changed ", n, "Old ", o);
                  $scope.calculateAppointmentTotalTime();
              }
          });


          $scope.$watch('patientId', function(newval, oldval) {
              // // console.log(oldval, newval);
              if (oldval != newval) {
                  if (typeof newval !== "undefined") {
                      // // console.log("New value updated ", newval);
                      $scope.userSelection.patientId = newval.originalObject;
                      //here empty the value of add and passangers of the user               
                      $scope.getTasksEstimatedTime();
                  } else {
                      $scope.userSelection.patientId = null;
                  }
              }
          });

          $scope.$watch('refererId', function(newval, oldval) {
              if (oldval != newval) {
                  if (typeof newval !== "undefined") {
                      // // console.log("New value updated ", newval);
                      $scope.userSelection.refererId = newval.originalObject;
                      $scope.getTasksEstimatedTime();
                  } else {
                      $scope.userSelection.refererId = null;
                      $scope.getTasksEstimatedTime();
                  }
              }
          });



          $scope.calculateAppointmentTotalTime = function() {
              var data = $scope.taskListData;
              // // console.log("Data is ", data);

              var totalTime = Object.keys(data).map(function(k) {
                  // // console.log("HERE---------" , k , data[k].finalTime)
                  if (data[k].finalTime) return +data[k].finalTime;
                  else return +0;

              }).reduce(function(a, b) {
                  return a + b
              }, 0);
              // console.log("totalTime is ", totalTime);
              $scope.userSelection.totalTime = totalTime;

          }


          $scope.getAllOffices();

          // Calendar Starts here 
          var date = new Date();
          var d = date.getDate();
          var m = date.getMonth();
          var y = date.getFullYear();

          /* event source that contains custom events on the scope */
          $scope.events = [];

          /* event source that calls a function on every view switch */
          $scope.eventsF = function(start, end, timezone, callback) {
              // console.log("Start Date  >> ", start, end, timezone, callback);
              $scope.showloader = true;
              var inputJson = {
                  request_start_day: start.format("YYYY-MM-DD"),
                  request_end_day: end.format("YYYY-MM-DD"),
                  requested_days: $scope.userSelection.days,
                  requested_time: $scope.userSelection.timeSelection,
                  office_id: $scope.userSelection.office_id._id,
                  diagnose_id: $scope.userSelection.diagId._id,
                  patient_id: $scope.userSelection.patientId ? $scope.userSelection.patientId._id : null,
                  patient_type: $scope.userSelection.patientId ? $scope.userSelection.patientId.patient_type : null,
                  referer_id: $scope.userSelection.refererId ? $scope.userSelection.refererId.referrer_type : null,
                  appointment_type: $scope.userSelection.apptTypeId._id,
                  taskTime: $scope.userSelection.totalTime,
                  subscriber_id: subscribe_id,
                  provider_id: $scope.userSelection.providerId._id,
                  office_slot_time: $scope.userSelection.office_id.default_slot_time

              };

              AppointmentSchedulingService.fetchScheduleList(inputJson, function(response) {
                  // console.log("Response is ", response);
                  // hide the loader
                  $scope.showloader = false;
                  $scope.scheduledData = response.data;
                  var starttime = moment(response.mintime, "hh:mm A").format("HH:mm:ss");
                  var endtime = moment(response.maxtime, "hh:mm A").format("HH:mm:ss");
                  $scope.minTime = window.minTime = starttime;
                  $scope.maxTime = window.maxTime = endtime;

                  // $scope.uiConfig.calendar.minTime = starttime ; 
                  // $scope.uiConfig.calendar.maxTime = endtime ; 

                  // uiCalendarConfig.calendars.myCalendar2.fullCalendar(
                  //     angular.extend($scope.uiConfig.calendar, {
                  //         minTime: starttime ,  //$scope.minTime.toString(),
                  //         maxTime:  endtime //$scope.maxTime.toString()
                  //     })
                  // );

                  // console.log("mintime" , $scope.minTime , "maxtime" , $scope.maxTime)
                  // uiCalendarConfig.calendars.myCalendar2.fullCalendar('getView').calendar.options.minTime = $scope.minTime;
                  // uiCalendarConfig.calendars.myCalendar2.fullCalendar('getView').calendar.options.maxTime = $scope.maxTime;
                  // uiCalendarConfig.calendars.myCalendar2.fullCalendar('getView').calendar.options.scrollTime = $scope.minTime;

                  // uiCalendarConfig.calendars.myCalendar2.fullCalendar({ minTime: $scope.minTime, maxTime: $scope.maxTime });

                  // uiCalendarConfig.calendars.myCalendar2.fullCalendar('render');
                  // console.log("uiCalendarConfig.calendars.myCalendar2.fullCalendar('getView')" , uiCalendarConfig.calendars.myCalendar2.fullCalendar('getView'))


                  //=========THIS RERENDERS========================================
                  // $scope.uiConfig.calendar.minTime = $scope.minTime;
                  // $scope.uiConfig.calendar.maxTime = $scope.maxTime;
                  //===============================================================

                  var data = response.data;

                  // fetchScheduleList
                  // $scope.changeMonthView($scope.scheduledData);
                  // $scope.changeWeekView($scope.scheduledData);

                  var weekStart = start.format("YYYY-MM-DD");
                  var weekEnd = end.format("YYYY-MM-DD");
                  var eventArray = [];

                  for (var i = 0; i < data.length; i++) {
                      //push events over here for the week 
                      // // console.log("Slots  length", weekStart  , weekEnd,  data[i].ScheduleDate);
                      $('.fc-month-view .fc-day[data-date="' + data[i].ScheduleDate + '"]').removeClass('fc-green fc-red fc-yellow')
                      if (data[i].dayClass) {
                          $('.fc-month-view .fc-day[data-date="' + data[i].ScheduleDate + '"]').addClass('fc-' + data[i].dayClass);
                      }

                      var dtArray = data[i].ScheduleDate.split("-");
                      if (weekStart <= data[i].ScheduleDate && weekEnd >= data[i].ScheduleDate) {
                          // // console.log("middle week ", weekStart  , weekEnd,  data[i].ScheduleDate);
                          var year = dtArray[0],
                              month = dtArray[1] - 1,
                              day = dtArray[2];

                          for (var j = 0; j < data[i].slots.length; j++) {
                              // // console.log(data[i].slots[j][0].sos , data[i].slots[j][data[i].slots[j].length -1].eos ) ; 
                              // var dtArrayHM = data[i].slots[j].slotsval[0].sos.split(":");
                              // var dtArrayEndHM = data[i].slots[j].slotsval[data[i].slots[j].length - 1].eos.split(":");
                              // // console.log("Values " , data[i].ScheduleDate + " " + data[i].slots[j][0].sos  /*     year,"  " ,  month, "  " , day  , "  ", dtArrayHM[0], "   ",  dtArrayHM[1]*/)
                              eventArray.push({
                                  title: data[i].ScheduleDate,
                                  start: new Date(data[i].ScheduleDate.replace(/-/g, "/") + " " + data[i].slots[j].slotsval[0].sos),
                                  end: new Date(data[i].ScheduleDate.replace(/-/g, "/") + " " + data[i].slots[j].slotsval[data[i].slots[j].slotsval.length - 1].eos),
                                  allDay: false,
                                  type: "Block",
                                  className: ["Block", data[i].slots[j].class || ""]
                              });
                          }


                          for (var k = 0; k < data[i].booked_appt.length; k++) {
                              eventArray.push({
                                  title: data[i].booked_appt[k].diagnosis ? data[i].booked_appt[k].diagnosis.title : data[i].booked_appt[k].diagnosis,
                                  start: new Date(data[i].ScheduleDate.replace(/-/g, "/") + " " + data[i].booked_appt[k].appointment_start_time),
                                  end: new Date(data[i].ScheduleDate.replace(/-/g, "/") + " " + data[i].booked_appt[k].appointment_end_time),
                                  allDay: false,
                                  type: "Appointment",
                                  patient: data[i].booked_appt[k].patient ? data[i].booked_appt[k].patient.first_name + " " + data[i].booked_appt[k].patient.last_name : data[i].booked_appt[k].patient,
                                  className: ["Appointment"],
                                  description: data[i].booked_appt[k],
                              });
                          }

                      }
                  }
                  callback(eventArray);

              });

          };

          $scope.calEventsExt = {
              color: '#f00',
              textColor: 'yellow',
              events: []
          };

          /* alert on eventClick */
          $scope.alertOnEventClick = function(date, jsEvent, view) {
              // console.log(date.title + ' was clicked ', "date", date, "View", view, "jsEvent", jsEvent);
              if (date.type == "Appointment") {
                  /*

                                date.minTime = $scope.minTime;
                                date.maxTime = $scope.maxTime;

                                var modalInstance = $uibModal.open({
                                  templateUrl: 'eventdetails.html',
                                  size: 'lg',
                                  controller: 'ApptModalController',
                                  windowClass: 'medium-modal-box',
                                  resolve: {
                                    items: function() {
                                      return date;
                                    }
                                  }
                                });
                                modalInstance.result.then(function() {
                                  // console.log('Modal opened at: ' + new Date());
                                }, function() {
                                  // console.log('Modal dismissed at: ' + new Date());
                                });

                              */
              }
          };
          /* alert on Drop */
          $scope.alertOnDrop = function(event, delta, revertFunc, jsEvent, ui, view) {
              $scope.alertMessage = ('Event Dropped to make dayDelta ' + delta);
          };
          /* alert on Resize */
          $scope.alertOnResize = function(event, delta, revertFunc, jsEvent, ui, view) {
              $scope.alertMessage = ('Event Resized to make dayDelta ' + delta);
          };
          /* add and removes an event source of choice */
          $scope.addRemoveEventSource = function(sources, source) {
              var canAdd = 0;
              angular.forEach(sources, function(value, key) {
                  if (sources[key] === source) {
                      sources.splice(key, 1);
                      canAdd = 1;
                  }
              });
              if (canAdd === 0) {
                  sources.push(source);
              }
          };
          /* add custom event*/
          $scope.addEvent = function() {
              $scope.events.push({
                  title: 'Open Sesame',
                  start: new Date(y, m, 28),
                  end: new Date(y, m, 29),
                  className: ['openSesame']
              });
          };
          /* remove event */
          $scope.remove = function(index) {
              $scope.events.splice(index, 1);
          };
          /* Change View */
          $scope.changeView = function(view, calendar) {
              // console.log("ChangeView", calendar, view, uiCalendarConfig.calendars.myCalendar2.fullCalendar('getDate').format("YYYY-MM-DD"));
              if (view == "agendaWeek") {
                  // console.log(uiCalendarConfig.calendars.myCalendar2.fullCalendar('getDate').startOf("week").format("YYYY-MM-DD"))
                  // console.log(uiCalendarConfig.calendars.myCalendar2.fullCalendar('getDate').endOf("week").format("YYYY-MM-DD"))

              }

              if (view == "agendaDay") {
                  $scope.uiConfig.calendar.editable = true;
              } else {
                  $scope.uiConfig.calendar.editable = false;
              }

              // console.log("Ch", view);
              uiCalendarConfig.calendars[calendar].fullCalendar('changeView', view);
          };
          /* Change View */
          $scope.renderCalender = function(calendar) {

              // console.log("renderCalender", calendar);
              if (uiCalendarConfig.calendars[calendar]) {
                  uiCalendarConfig.calendars[calendar].fullCalendar('render');
              }
          };
          /* Render Tooltip */
          $scope.eventRender = function(event, element, view) {
              // console.log("Event is rendered");
              if (event.type == "Appointment") {
                  var content =
                      '<b>Appointment Type:</b> ' + event.description.appt_type.title + '<br />' +
                      '<b>Diagnosis:</b> ' + event.description.diagnosis.title + '<br />' +
                      '<b>Patient:</b> ' + event.description.patient.first_name + ' ' + event.description.patient.last_name;

                  $(element).tooltip({ title: content, html: true });
                  if (event.type == "Appointment") {
                      var title = event.description.patient.first_name;
                      if (event.description.patient.middle_name) title = title + " " + event.description.patient.middle_name;
                      title += " " + event.description.patient.last_name;
                      element.find('.fc-title').append("<br/>" + event.description.patient.first_name + " " + event.description.patient.last_name);
                  }
                  element.attr({
                      'tooltip': event.title,
                      'tooltip-append-to-body': true
                  });
                  $compile(element)($scope);
              }
              // element.find('.fc-title').append("<br/>" + event.patient);

          };

          $scope.dayClick = function(date, jsEvent, view) {
              // console.log('Clicked on: ' + date.format("HH:mm"), date.format(), uiCalendarConfig.calendars);

              // console.log('Coordinates: ' + jsEvent.pageX + ',' + jsEvent.pageY, jsEvent, view);
              // console.log('Current view: ' + view.name);
              if (view.name === "month") {
                  uiCalendarConfig.calendars.myCalendar2.fullCalendar('gotoDate', date);
                  uiCalendarConfig.calendars.myCalendar2.fullCalendar('changeView', 'agendaDay');
              } else if (view.name == "agendaWeek") {
                  uiCalendarConfig.calendars.myCalendar2.fullCalendar('gotoDate', date);
                  uiCalendarConfig.calendars.myCalendar2.fullCalendar('changeView', 'agendaDay');
              } else if (view.name == "agendaDay") {
                  var dateObj = date.clone();
                  dateObj.add($scope.userSelection.totalTime, "minutes");
                  var ApptTime = date.format("HH:mm");
                  ApptTime = ApptTime.toString();
                  //gather the info and call the api from here  . 
                  var inputJson = {};
                  inputJson.tasks = $scope.taskListData;
                  inputJson.totalTime = $scope.userSelection.totalTime;
                  inputJson.patient_id = $scope.userSelection.patientId;
                  inputJson.appointment_start_time = date.format("HH:mm");
                  inputJson.appointment_end_time = dateObj.format("HH:mm");
                  inputJson.diagnosis = $scope.userSelection.diagId._id;
                  inputJson.appointmentType = $scope.userSelection.apptTypeId._id;
                  inputJson.provider = $scope.userSelection.providerId._id;
                  inputJson.referrer = $scope.userSelection.refererId ? $scope.userSelection.refererId._id : null;
                  inputJson.referrer_type = $scope.userSelection.refererId ? $scope.userSelection.refererId.referrer_type : null;

                  inputJson.appointment_date = date.format("YYYY-MM-DD");
                  inputJson.office_id = $scope.userSelection.office_id;
                  inputJson.subscriber_id = subscribe_id;
                  inputJson.userPatientType = $scope.userSelection.patientId.patient_type;

                  // inputJson.referrer = $scope.userSelection.refererId._id ; ]


                  inputJson.startTime = date.format("HH:mm");
                  // console.log("inputJson", inputJson);

                  // $timeout(function(){

                  $confirm({
                      text: 'Please confirm ' + ApptTime + ' as time of appointment '
                  } /*, {template:'{{data.text}}'}*/ ).then(function() {
                      $scope.showloader = true;
                      AppointmentSchedulingService.addAppointment(inputJson, function(response) {
                          // console.log("Response is ", response);
                          $scope.showloader = false;
                          if (response.messageId == 200) {
                              toastr.success(response.message, 'Success');
                              $scope.fetchSchedule();
                              //grid refresh from here 
                          } else {

                              if (response.listOfFailedConstraints) {
                                  //=============================================================
                                  // Manager override prompt
                                  //=============================================================
                                  var data = {
                                      "listOfFailedConstraints": response.listOfFailedConstraints,
                                  };

                                  var modalInstance = $uibModal.open({
                                      templateUrl: '/modules/appointmentscheduling/views/manageroverride.html',
                                      size: 'lg',
                                      controller: 'ManagerOverrideModalController',
                                      windowClass: 'medium-modal-box',
                                      resolve: {
                                          items: function() {
                                              return data;
                                          }
                                      }
                                  });
                                  modalInstance.result.then(function(data) {
                                      // console.log('Modal opened at: ' + new Date());

                                      // console.log("IN MANAGER OVERRIDE " , data)

                                      if (data.managerOverride == true) {
                                          inputJson.managerOverride = true;
                                          inputJson.listOfFailedConstraints = data.listofConstraints;
                                          // // console.log("managerOverride data" , data)
                                          $scope.showloader = true;
                                          AppointmentSchedulingService.addAppointment(inputJson, function(response) {
                                              $scope.showloader = false;
                                              if (response.messageId == 200) {
                                                  toastr.success(response.message, 'Success');
                                                  $scope.fetchSchedule();
                                                  //grid refresh from here 
                                              } else {
                                                  toastr.error("Error! Appointment not booked", 'Error');
                                              }
                                          });
                                      } else {
                                          toastr.error("Error! Appointment not booked", 'Error');
                                      }
                                  }, function() {
                                      // console.log('Modal dismissed at: ' + new Date());
                                  });

                              } else {
                                  toastr.error(response.message, 'Error');
                              }
                          }
                      });
                  });
                  // },150);

              }
          };

          $scope.viewRender = function(view, element) {
              // // console.log('Current view is is', view, view.start.toDate(), view.end.toDate(), "Element ", element);
              // // console.log('Current view is is', view);
              // var timeArr = [
              //   ["05:00:00", "20:00:00"],
              //   ["09:00:00", "22:00:00"],
              //   ["06:00:00", "21:00:00"],
              //   ["10:00:00", "17:00:00"]
              // ]

              // var index = Math.floor(Math.random() * 4) + 1;
              // var arr = timeArr[index];
              // // console.log("arr", arr, "index", index)
              // $scope.uiConfig.calendar.minTime = arr[0];
              // $scope.uiConfig.calendar.maxTime = arr[1];

          }


          /* config object */
          $scope.uiConfig = {
              calendar: {
                  height: 550,
                  // slotMinutes : 15
                  // duration: '00:15:00' , 
                  slotDuration: "00:20:00",
                  allDaySlot: false,
                  eventOrder: "type",
                  lazyFetching: false,
                  editable: false,
                  defaultView: "agendaWeek",
                  eventDurationEditable: false,
                  header: {
                      // left: 'prev,next today',
                      // center: 'title',
                      // right: 'month,agendaWeek,agendaDay'
                      left: 'title',
                      center: 'month,agendaWeek,agendaDay',
                      right: 'today prev,next'
                  },
                  eventClick: $scope.alertOnEventClick,
                  eventDrop: $scope.alertOnDrop,
                  eventResize: $scope.alertOnResize,
                  eventRender: $scope.eventRender,
                  dayClick: $scope.dayClick,
                  viewRender: $scope.viewRender,
                  eventAfterAllRender: function(view) {
                          window.minTimeChanged = false;

                          var minTime = window.minTime; // "05:00:00"; // $scope.minTime.toString() ; 
                          var maxTime = window.maxTime; // "20:00:00"; //$scope.maxTime.toString() ;
                          if (uiCalendarConfig.calendars.myCalendar2.fullCalendar('getView').name == "agendaDay" || uiCalendarConfig.calendars.myCalendar2.fullCalendar('getView').name == "agendaWeek") {
                              window.minTimeChanged = true;

                          }


                          // uiCalendarConfig.calendars.myCalendar2.fullCalendar('destroy');
                          // // console.log("minTime" , minTime , "maxTime" , maxTime , "getView " , uiCalendarConfig.calendars.myCalendar2.fullCalendar('getView') ) ; 
                          // $timeout(function(){

                          // uiCalendarConfig.calendars.myCalendar2.fullCalendar('getView').calendar.minTime = minTime;
                          // uiCalendarConfig.calendars.myCalendar2.fullCalendar('getView').calendar.maxTime = maxTime;
                          // $scope.uiConfig.calendar.minTime = minTime ; 
                          // $scope.uiConfig.calendar.maxTime = maxTime ; 
                          // uiCalendarConfig.calendars.myCalendar2.fullCalendar('render'); // rerender to see visual changes


                          // uiCalendarConfig.calendars.myCalendar2.fullCalendar(
                          //     angular.extend($scope.uiConfig.calendar, {
                          //         minTime: minTime ,  //$scope.minTime.toString(),
                          //         maxTime:  maxTime //$scope.maxTime.toString()
                          //     })
                          // );
                          // } ,500 )


                      }
                      // day
              }
          };



          /* event sources array*/
          $scope.eventSources = [$scope.events, $scope.calEventsExt /*, $scope.eventSource*/ , $scope.eventsF];
          // $scope.eventSources2 = [/*$scope.calEventsExt, $scope.eventsF,*/ $scope.events];

          // $scope.$watch("getOptions", function(newO,oldO){
          //     $scope.destroy();
          //     $scope.init();
          // });



          var SecondsTohhmmss = function(totalSeconds) {
              var hours = Math.floor(totalSeconds / 60);
              var minutes = Math.floor((totalSeconds - (hours * 60)));
              // var seconds = totalSeconds - (hours * 60) - (minutes * 60);
              var results = {};
              // round seconds
              // seconds = Math.round(seconds * 100) / 100
              results.hour = (hours < 10 ? "0" + hours : hours);
              results.min = (minutes < 10 ? "0" + minutes : minutes);
              // // console.log("Results", results);
              return results;
          }


          function getStart() {
              if ($scope.myCalendar != null) {
                  var view = $scope.myCalendar.fullCalendar('getView');
                  return view.visStart;
              } else return null;

          }

          $scope.$watch(getStart, function(newVal, oldVal) {
              //if(newVal != oldVal)
              // console.log("calendar watching", newVal, oldVal);
          }, false);

          $scope.checkboxChanged = function() {
              // console.log("CheckBox Changed ");
              $timeout(function() {
                  // console.log("changed", $scope.userSelection /*, JSON.stringify($scope.userSelection)*/ );

                  if ($scope.userSelection.apptTypeId && $scope.userSelection.apptTypeId._id && $scope.userSelection.diagId && $scope.userSelection.diagId._id && $scope.userSelection.office_id && $scope.userSelection.office_id._id && $scope.userSelection.patientId && $scope.userSelection.patientId._id && $scope.userSelection.providerId && $scope.userSelection.providerId._id) {
                      $scope.fetchSchedule();
                  }

              }, 100)
          }

          $scope.$watchCollection('userSelection', function(newVal, oldVal) {
              // // console.log("New >>", newVal, "oldVal>>", oldVal);
              if (typeof newVal !== "undefined") {
                  if (newVal.apptTypeId && newVal.apptTypeId._id && newVal.diagId && newVal.diagId._id && newVal.office_id && newVal.office_id._id && newVal.patientId && newVal.patientId._id && newVal.providerId && newVal.providerId._id) {
                      $scope.fetchSchedule();
                  }
              }
          });



          $scope.ConvertTimeformat = function(format, str) {
              var hours = Number(str.match(/^(\d+)/)[1]);
              var minutes = Number(str.match(/:(\d+)/)[1]);
              var AMPM = str.match(/\s?([AaPp][Mm]?)$/)[1];
              var pm = ['P', 'p', 'PM', 'pM', 'pm', 'Pm'];
              var am = ['A', 'a', 'AM', 'aM', 'am', 'Am'];
              if (pm.indexOf(AMPM) >= 0 && hours < 12) hours = hours + 12;
              if (am.indexOf(AMPM) >= 0 && hours == 12) hours = hours - 12;
              var sHours = hours.toString();
              var sMinutes = minutes.toString();
              if (hours < 10) sHours = "0" + sHours;
              if (minutes < 10) sMinutes = "0" + sMinutes;
              if (format == '0000') {
                  return (sHours + sMinutes);
              } else if (format == '00:00') {
                  return (sHours + ":" + sMinutes);
              } else {
                  return false;
              }
          }
      }])
      //:: Estimated Time - based on Patient, Referrer , Appointment Type  
      // ::TODO : Add marker in  month view , Add Right slider in weekView , Patient Info in  Day View , Check Heuristic Rules , Check whether success or failure of the Rules
      // :: to hide month events - http://jsfiddle.net/IrvinDominin/ecjvb8b7/

  .controller("ApptSchedulingTaskController", ['$scope', '$rootScope', '$localStorage', 'AppointmentSchedulingService', 'ngTableParams', '$stateParams', '$state', '$location', '$timeout', '$uibModalInstance', 'items', function($scope, $rootScope, $localStorage, AppointmentSchedulingService, ngTableParams, $stateParams, $state, $location, $timeout, $uibModalInstance, items) {
      // console.log("$modal Data ", items);
      var diagnosisId = items.diagnosis;
      $scope.diagnosisId = diagnosisId;
      // var office_id = items.office_id;
      // var subscriber_id = items.subscriber_id;
      $scope.selectedTasks = items.task;
      $scope.isEnable = true;
      $scope.Cancel = function() {
          $uibModalInstance.dismiss('cancel');
      }
      $scope.cancel = function() {
          $uibModalInstance.dismiss('cancel');
      }

      $scope.addTask = function() {

          // console.log($scope.task);
          $scope.isEnable = false;
          // var inputJsonString = "";
          // $scope.message = response.message;
          // $scope.alerttype = 'alert-success';
          //close the modal here and refresh the back grid from here 
          $timeout(function() {
              $uibModalInstance.close();
          }, 1000);

          if (items.isEditMode) {
              // console.log("TaskAddedFromEdit" , items.isEditMode)
              $scope.$emit('TaskAddedFromEdit', $scope.task);
          } else {
              // console.log("TaskAdded" , items.isEditMode)
              $scope.$emit('TaskAdded', $scope.task);
          }

      };



  }])

  .controller("AppointmentSchedulingViewController", ['$scope', '$rootScope', '$localStorage', 'AppointmentSchedulingService', '$stateParams', '$state', '$location', "$compile", "uiCalendarConfig", '$uibModal', '$timeout', 'toastr', '$confirm', function($scope, $rootScope, $localStorage, AppointmentSchedulingService, $stateParams, $state, $location, $compile, uiCalendarConfig, $uibModal, $timeout, toastr, $confirm) {

          if ($localStorage.userLoggedIn) {
              $rootScope.userLoggedIn = true;
              $rootScope.loggedInUser = $localStorage.loggedInUsername;
              var created_by = $localStorage.loggedInUserId;
              if ($localStorage.userType == 1) {
                  var subscribe_id = $rootScope.superadmin_subscriberid;
              } else if ($localStorage.userType == 2) {
                  var subscribe_id = $localStorage.loggedInUserId;
              } else if ($localStorage.userType == 3) {
                  var subscribe_id = $localStorage.loggedInUser.subscriber_id;
              }

          } else {
              $rootScope.userLoggedIn = false;
          }


          if ($rootScope.message != "") {

              $scope.message = $rootScope.message;
          }

          // console.log("uiCalendarConfig", uiCalendarConfig);
          $scope.daysArray = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
          $scope.timeArray = ["AM", "PM"];
          $scope.userSelection = {};
          $scope.userSelection.totalTime = null;
          $scope.userSelection.days = [];
          $scope.userSelection.timeSelection = [];
          $scope.taskListData = [];
          $scope.tasksEstimatedTimesArray = [];
          // $scope.userSelection.patientId ={};
          // $scope.userSelection.diagId = {};
          // $scope.userSelection.office_id = {};
          // $scope.userSelection.apptTypeId = {};
          // $scope.userSelection.refererId = {};
          // $scope.userSelection.providerId = {};



          $scope.getAllOffices = function() {
              var selectedOffice = $localStorage.selectedOffice;
              AppointmentSchedulingService.getOfficeList(subscribe_id, function(response) {
                  if (response.messageId == 200) {
                      $scope.officeData = response.data;

                      if (selectedOffice && selectedOffice !== "null") {
                          // console.log("Office here " , selectedOffice);
                          angular.forEach($scope.officeData, function(key, value) {
                              if (key._id == selectedOffice) {
                                  $timeout(function() {
                                      // body...
                                      $scope.userSelection.office_id = key;
                                      $scope.getOtherDropInfo(key);
                                  }, 200);

                              }
                          })
                      }
                  }
              });
          }

          $scope.getdiagAppt = function() {
              var diagdata = {};
              diagdata.subscriber_id = subscribe_id;
              diagdata.diag_id = $scope.userSelection.diagId;
              diagdata.office_id = $scope.userSelection.office_id;
              AppointmentSchedulingService.getdiagAppt(diagdata, function(response) {
                  $scope.apptTypes = [];
                  if (response.data.length)
                      $scope.apptTypes = response.data[0].appointmentTypes;
              });
          }

          $scope.getOtherDropInfo = function() {
              var inputJson = {};
              inputJson.subscriber_id = subscribe_id;
              inputJson.office_id = $scope.userSelection.office_id;

              //Change here office configs
              if ($scope.userSelection.office_id) {
                  $localStorage.selectedOffice = $scope.userSelection.office_id._id;
                  var timeop = SecondsTohhmmss($scope.userSelection.office_id.default_slot_time /*80*/ );
                  $scope.uiConfig.calendar.slotDuration = timeop.hour + ":" + timeop.min + ":" + "00"; // "00:30:00";          

                  // $localStorage.selectedOffice = $scope.userSelection.office_id._id;
                  // var timeop = SecondsTohhmmss($scope.userSelection.office_id.default_slot_time /*80*/ );
                  // $scope.uiConfig.calendar.slotDuration = timeop.hour + ":" + timeop.min + ":" + "00"; // "00:30:00";          



                  var inputJsonForOffice = {};
                  inputJsonForOffice.office_id = $scope.userSelection.office_id._id;
                  inputJsonForOffice.subscriber_id = subscribe_id;
                  inputJsonForOffice.request_start_day = new moment().format("YYYY-MM-DD");
                  var endday = new moment();
                  endday.add(2, "year");
                  inputJsonForOffice.request_end_day = endday.format("YYYY-MM-DD");

                  AppointmentSchedulingService.getOfficeTime(inputJsonForOffice, function(responseData) {
                      $scope.uiConfig.calendar.minTime = responseData.mintime ? responseData.mintime : "00:00:00"; // "00:30:00";          
                      $scope.uiConfig.calendar.maxTime = responseData.maxtime ? responseData.maxtime : "24:00:00"; // "00:30:00";          

                      $scope.minTime = responseData.mintime;
                      $scope.maxTime = responseData.maxtime;
                  });

              } else {
                  $localStorage.selectedOffice = null;
              }

              AppointmentSchedulingService.getPatientList(inputJson, function(response) {
                  $scope.patientData = response.data;
              });

              AppointmentSchedulingService.listAllDiagnosis(inputJson, function(response) {
                  $scope.diagData = response.data;
              });

              var data1 = {};
              data1.createdBy = $localStorage.loggedInUserId;
              data1.officeId = $scope.userSelection.office_id;
              data1.subscriber_id = subscribe_id;

              AppointmentSchedulingService.getProviderList(data1, function(response) {
                  $scope.providerData = response.data;
              });
              // // console.log("inputJson" , inputJson );
              AppointmentSchedulingService.listAllReferrerTypes(inputJson, function(response) {
                  $scope.refererData = response.data;
              });

              var inputJson = {};
              inputJson.subscribe_id = subscribe_id;
              inputJson.office_id = $scope.userSelection.office_id;

              AppointmentSchedulingService.getFilteredTask(inputJson, function(response) {
                  $scope.taskListData = angular.copy(response.data);
                  $scope.officeTaskList = response.data;
              });

          }


          $scope.getTasksEstimatedTime = function() {
              // console.log("Change Triggers  from here ");

              if ($scope.userSelection.office_id && $scope.userSelection.diagId && $scope.userSelection.apptTypeId && $scope.userSelection.patientId) {

                  var inputJson = {};
                  inputJson.subscriber_id = subscribe_id;
                  inputJson.office_id = $scope.userSelection.office_id._id;
                  inputJson.diagId = $scope.userSelection.diagId._id;
                  inputJson.apptTypeId = $scope.userSelection.apptTypeId._id;
                  inputJson.refererId = $scope.userSelection.refererId ? $scope.userSelection.refererId.referrer_type : null;
                  inputJson.patientType = $scope.userSelection.patientId.patient_type;

                  AppointmentSchedulingService.getTasksEstimatedTime(inputJson, function(response) {
                      // // console.log("Response of Estimated Tasks are ", response);
                      var taskResponse = response.data;
                      $scope.tasksEstimatedTimesArray = taskResponse;
                      var total = 0;
                      if ($scope.taskListData.length && taskResponse && taskResponse.length) {
                          for (var i = 0; i < $scope.taskListData.length; i++) {
                              for (var j = 0; j < taskResponse.length; j++) {
                                  if ($scope.taskListData[i]._id == taskResponse[j]._id /*&& taskResponse[j].finalTime*/ ) {

                                      if (typeof taskResponse[j].finalTime !== undefined) total += taskResponse[j].finalTime;
                                      // console.log("Final Time is " , $scope.taskListData[i].title ,  " ==",  taskResponse[j].finalTime )
                                      $scope.taskListData[i].finalTime = taskResponse[j].finalTime;
                                      $scope.taskListData[i].patientTypeAdjustments = taskResponse[j].patientTypeAdjustments;
                                      $scope.taskListData[i].referrerAdjustments = taskResponse[j].referrerAdjustments;
                                      $scope.taskListData[i].time = taskResponse[j].time;
                                  }

                              }
                              $scope.userSelection.totalTime = total;

                          }
                      }

                  });
              }

          }

          $scope.removeTask = function(card, index) {
              // console.log("Index is ", index);

              // var dealId = dealdata.id ;    
              var myDataArr = $scope.taskListData;

              // console.log("Length ", myDataArr.length);
              //check for index first and last here 
              for (var i = 0; i < myDataArr.length; i++) {
                  if (myDataArr[i] == card) {
                      myDataArr.splice(index, 1);
                  }
              }
          };


          $scope.addTask = function() {

              //calculate and pass data to modal
              var completeTaskArray = angular.copy($scope.officeTaskList);
              var taskListData = $scope.taskListData;
              var taskArray = [];
              angular.forEach(completeTaskArray, function(value, key) {
                  // // console.log("key" , key , value);
                  var flag = false;
                  for (var i = 0; i < taskListData.length; i++) {
                      if (value._id == taskListData[i]._id) {
                          flag = true;
                      }
                  }

                  if (!flag) {
                      taskArray.push(value);
                  }

                  // this.push(key + ': ' + value);
              });

              var data = {
                  "diagnosis": $scope.userSelection.diagId,
                  task: taskArray,
              };

              var modalInstance = $uibModal.open({
                  templateUrl: 'addschedulingtask.html',
                  size: 'sm',
                  controller: 'ApptSchedulingTaskController',
                  // windowClass: 'small-modal-box',
                  resolve: {
                      items: function() {
                          return data;
                      }
                  }
              });
              modalInstance.result.then(function() {
                  // console.log('Modal opened at: ' + new Date());
              }, function() {
                  // console.log('Modal dismissed at: ' + new Date());
              });
          }

          $scope.fetchSchedule = function() {
              // console.log("refetchEvents" , uiCalendarConfig );
              if (uiCalendarConfig && uiCalendarConfig.calendars && uiCalendarConfig.calendars.myCalendar3)
                  uiCalendarConfig.calendars.myCalendar3.fullCalendar('refetchEvents');


              // show the loader 
              // $scope.showloader = true;
              // var inputJson = {};

              // AppointmentSchedulingService.fetchScheduleList(inputJson, function(response) {
              //   // console.log("Response is ", response);
              //   // hide the loader
              //   $scope.showloader = false;
              //   $scope.scheduledData = response;
              //   // fetchScheduleList
              //   $scope.changeMonthView($scope.scheduledData);
              //   $scope.changeWeekView($scope.scheduledData);

              // });
          }

          $scope.remoteUrlRequestFn = function(str) {
              return {
                  search: str,
                  subscriber_id: subscribe_id
              };
          }


          $scope.changeMonthView = function(data) {
              // // console.log("OPTIONS ARE  >> ", data, uiCalendarConfig, "RR", uiCalendarConfig.calendars.myCalendar3.fullCalendar('getDate').startOf("month").format("YYYY-MM-DD"));
              // // console.log(data.length);
              for (var i = 0; i < data.length; i++) {
                  if (data[i].preference) {
                      // // console.log($('.fc-month-view fc-day[data-date="' + data[i].ScheduleDate + '"]') , "==") ; 
                      $('.fc-month-view .fc-day[data-date="' + data[i].ScheduleDate + '"]').addClass('fc-green');
                  }
              }
          }

          $scope.changeWeekView = function(data) {
              // console.log("Date ", uiCalendarConfig.calendars.myCalendar3.fullCalendar('getDate').format("YYYY-MM-DD"))
              // console.log(uiCalendarConfig.calendars.myCalendar3.fullCalendar('getDate').startOf("week").format("YYYY-MM-DD"))
              // console.log(uiCalendarConfig.calendars.myCalendar3.fullCalendar('getDate').endOf("week").format("YYYY-MM-DD"))
              var weekStart = uiCalendarConfig.calendars.myCalendar3.fullCalendar('getDate').startOf("week").format("YYYY-MM-DD");
              var weekEnd = uiCalendarConfig.calendars.myCalendar3.fullCalendar('getDate').endOf("week").format("YYYY-MM-DD");
              var eventArray = [];

              for (var i = 0; i < data.length; i++) {
                  //push events over here for the week 
                  // // console.log("Slots  length", weekStart  , weekEnd,  data[i].ScheduleDate);
                  var dtArray = data[i].ScheduleDate.split("-")

                  if (weekStart <= data[i].ScheduleDate && weekEnd >= data[i].ScheduleDate) {

                      // // console.log("middle week ", weekStart  , weekEnd,  data[i].ScheduleDate);
                      var year = dtArray[0],
                          month = dtArray[1],
                          day = dtArray[2];

                      for (var j = 0; j < data[i].slots.length; j++) {
                          // // console.log(data[i].slots[j][0].sos , data[i].slots[j][data[i].slots[j].length -1].eos ) ; 
                          var dtArrayHM = data[i].slots[j][0].sos.split(":");
                          var dtArrayEndHM = data[i].slots[j][data[i].slots[j].length - 1].eos.split(":");


                          eventArray.push({
                              title: data[i].ScheduleDate,
                              start: new Date(year, month, day, dtArrayHM[0], dtArrayHM[1]),
                              end: new Date(year, month, day, dtArrayEndHM[0], dtArrayEndHM[1]),
                              allDay: false,
                              className: ['customerFeed']
                          });

                      }
                  }
              }

              if (eventArray.length) {
                  // Array.prototype.push.apply($scope.events, eventArray);
                  // console.log("here ", eventArray, {
                  //     title: null,
                  //     start: new Date(y, m, 4),
                  //     allDay: false,
                  //     className: ['customerFeed']
                  // })


                  angular.copy(eventArray, $scope.calEventsExt.events);
                  // $scope.events = eventArray;
              }

          }

          $scope.taskTimeChanged = function() {
              // // console.log("taskTimeChangeds") ; 
              $scope.calculateAppointmentTotalTime();

          };



          $rootScope.$on("TaskAdded", function(event, data) {
              // // console.log(event , data);
              for (var i = 0; i < $scope.tasksEstimatedTimesArray.length; i++) {
                  if ($scope.tasksEstimatedTimesArray[i]._id == data._id) {
                      data.finalTime = $scope.tasksEstimatedTimesArray[i].finalTime;
                      data.patientTypeAdjustments = $scope.tasksEstimatedTimesArray[i].patientTypeAdjustments;
                      data.referrerAdjustments = $scope.tasksEstimatedTimesArray[i].referrerAdjustments;
                      data.time = $scope.tasksEstimatedTimesArray[i].time;
                  }
              }
              $scope.taskListData.push(data);

          })



          $scope.$watchCollection("taskListData", function(n, o) {
              if (typeof n !== "undefined") {
                  // // console.log("Task Changed ", n, "Old ", o);
                  $scope.calculateAppointmentTotalTime();
              }
          });

          $scope.$watch('refererId', function(newval, oldval) {
              if (oldval != newval) {
                  if (typeof newval !== "undefined") {
                      // // console.log("New value updated ", newval);
                      $scope.userSelection.refererId = newval.originalObject;
                      $scope.getTasksEstimatedTime();
                  } else {
                      $scope.userSelection.refererId = null;
                  }
              }
          });



          $scope.calculateAppointmentTotalTime = function() {
              var data = $scope.taskListData;
              // console.log("Data is ", data);

              var totalTime = Object.keys(data).map(function(k) {
                  if (data[k].finalTime) return +data[k].finalTime;
                  else return +0;

              }).reduce(function(a, b) {
                  return a + b
              }, 0);
              // console.log("totalTime is ", totalTime);
              $scope.userSelection.totalTime = totalTime;

          }



          $scope.getAllOffices();



          // Calendar Starts here 

          var date = new Date();
          var d = date.getDate();
          var m = date.getMonth();
          var y = date.getFullYear();

          // $scope.changeTo = 'Hungarian';
          /* event source that pulls from google.com */
          // $scope.eventSource = {
          //         url: "http://www.google.com/calendar/feeds/usa__en%40holiday.calendar.google.com/public/basic",
          //         className: 'gcal-event',           // an option!
          //         currentTimezone: 'America/Chicago' // an option!
          // };
          /* event source that contains custom events on the scope */

          $scope.events = [];



          /* event source that calls a function on every view switch */
          $scope.eventsF = function(start, end, timezone, callback) {

              // console.log("Start Date  >> ", start, end, timezone, callback);
              var s = new Date(start).getTime() / 1000;
              var e = new Date(end).getTime() / 1000;
              var m = new Date(start).getMonth();
              // var events = [{
              //     title: 'Feed Me ' + m,
              //     start: s + (50000),
              //     end: s + (100000),
              //     allDay: false,
              //     className: ['customFeed']
              // }];
              // // console.log("Events are  ", events);

              $scope.showloader = true;

              var inputJson = {};
              inputJson.request_start_day = start.format("YYYY-MM-DD");
              inputJson.request_end_day = end.format("YYYY-MM-DD");
              inputJson.subscriber_id = subscribe_id;

              if ($scope.userSelection && $scope.userSelection.providerId && $scope.userSelection.providerId._id) {
                  inputJson.provider = $scope.userSelection.providerId._id;
              }
              if ($scope.userSelection && $scope.userSelection.office_id && $scope.userSelection.office_id.default_slot_time) {
                  inputJson.office_slot_time = $scope.userSelection.office_id.default_slot_time;
              }
              if ($scope.userSelection && $scope.userSelection.office_id && $scope.userSelection.office_id._id) {
                  inputJson.office_id = $scope.userSelection.office_id._id;
              }
              if ($scope.userSelection && $scope.userSelection.diagId && $scope.userSelection.diagId._id) {
                  inputJson.diagnose_id = $scope.userSelection.diagId._id;
              }
              if ($scope.userSelection && $scope.userSelection.patientId && $scope.userSelection.patientId._id) {
                  inputJson.patient_id = $scope.userSelection.patientId._id;
              }
              if ($scope.userSelection && $scope.userSelection.refererId && $scope.userSelection.refererId._id) {
                  inputJson.referer_id = $scope.userSelection.refererId._id;
              }

              // if ($scope.userSelection && $scope.userSelection.refererId) {
              //     inputJson.referer_type = $scope.userSelection.refererId.referrer_type || null ;
              // }

              if ($scope.userSelection && $scope.userSelection.apptTypeId && $scope.userSelection.apptTypeId._id) {
                  inputJson.appointment_type = $scope.userSelection.apptTypeId._id;
              }

              // console.log("===============inputJson================\n", inputJson)

              AppointmentSchedulingService.fetchScheduleListView(inputJson, function(response) {
                  // console.log("Response is ", response);
                  // hide the loader
                  $scope.showloader = false;
                  $scope.scheduledData = response.data;

                  var data = response.data;
                  // fetchScheduleList
                  // $scope.changeMonthView($scope.scheduledData);
                  // $scope.changeWeekView($scope.scheduledData);

                  // var weekStart = start.format("YYYY-MM-DD");
                  // var weekEnd = end.format("YYYY-MM-DD");
                  var eventArray = [];

                  for (var i = 0; i < data.length; i++) {
                      //push events over here for the week 

                      // if (data[i].preferday) {
                      //     $('.fc-month-view .fc-day[data-date="' + data[i].ScheduleDate + '"]').addClass('fc-green');
                      // }


                      /*var dtArray = data[i].ScheduleDate.split("-");

                      if (weekStart <= data[i].ScheduleDate && weekEnd >= data[i].ScheduleDate) {

                          var year = dtArray[0],
                              month = dtArray[1] - 1,
                              day = dtArray[2];

                              eventArray.push({
                                  title: 'PatientId : ' + data[i].patient,
                                  start: new Date(data[i].ScheduleDate.replace(/-/g, "/").split('T')[0]),
                                  end: new Date(data[i].ScheduleDate.replace(/-/g, "/").split('T')[0]),
                                  allDay: false,
                                  className: [data[i].slots.class || ""]
                              });
                      }*/

                      // // console.log("Events >> " , data[i].ScheduleDate  , "Length" , data[i].booked_appt.length ) ; 
                      for (var k = 0; k < data[i].booked_appt.length; k++) {
                          // // console.log( "Date is  +++ " , new Date(data[i].ScheduleDate.replace(/-/g, "/") + " " + data[i].booked_appt[k].appointment_start_time) , "End is " , new Date(data[i].ScheduleDate.replace(/-/g, "/") + " " + data[i].booked_appt[k].appointment_end_time ))
                          eventArray.push({
                              // title: data[i].ScheduleDate,
                              title: data[i].booked_appt[k].diagnosis ? data[i].booked_appt[k].diagnosis.title : data[i].booked_appt[k].diagnosis,
                              start: new Date(data[i].ScheduleDate.replace(/-/g, "/") + " " + data[i].booked_appt[k].appointment_start_time),
                              end: new Date(data[i].ScheduleDate.replace(/-/g, "/") + " " + data[i].booked_appt[k].appointment_end_time),
                              allDay: false,
                              type: "Appointment",
                              className: ["Appointment", "Appointment" + data[i].ScheduleDate],
                              description: data[i].booked_appt[k]
                                  // className: [data[i].slots[j].class|| ""]
                          });
                      }

                  }
                  // // console.log("EArray " ,eventArray ,  eventArray.length) ; 


                  callback(eventArray);

              });



          };


          $scope.calEventsExt = {
              color: '#f00',
              textColor: 'yellow',
              events: [
                  /*{
                              type: 'party',
                              title: 'Lunch',
                              start: new Date(y, m, d, 12, 0),
                              end: new Date(y, m, d, 14, 0),
                              allDay: false
                            }, {
                              type: 'party',
                              title: 'Lunch 2',
                              start: new Date(y, m, d, 12, 0),
                              end: new Date(y, m, d, 14, 0),
                              allDay: false
                            }, {
                              type: 'party',
                              title: 'Click for Google',
                              start: new Date(y, m, 28),
                              end: new Date(y, m, 29),
                              url: 'http://google.com/'
                            }*/
              ]
          };

          /* alert on eventClick */
          $scope.alertOnEventClick = function(date, jsEvent, view) {
              // $scope.alertMessage = (date.title + ' was clicked ');
              //     // console.log(data.title + ' was clicked ', "date", data, "View", view, "jsEvent", jsEvent);

              // var modalInstance = $uibModal.open({
              //   templateUrl: 'eventdetails.html',
              //   size: 'lg',
              //   controller: 'ApptModalControllerView',
              //   windowClass: 'medium-modal-box',
              //   resolve: {
              //     items: function() {
              //       return data;
              //     }
              //   }
              // });
              // modalInstance.result.then(function() {
              //   // console.log('Modal opened at: ' + new Date());
              // }, function() {
              //   // console.log('Modal dismissed at: ' + new Date());
              // });
              // console.log("im here? PLSPLSPSLPLSPLS")
              // console.log(date.title + ' was clicked ', "date", date, "View", view, "jsEvent", jsEvent);





              if (date.type == "Appointment") {


                  var booleanFlag = false ; 
                  if($localStorage.userType == 1 || $localStorage.userType == 2){
                    booleanFlag = true ; 
                  }else if ($localStorage.userPermissions) {
                    var permission = $localStorage.userPermissions ; 
                    for (var i = 0; i < permission.length; i++) {
                      if (permission[i] == 4) {booleanFlag = true ; break;}
                    }
                  }

                  if (booleanFlag) {
                    date.minTime = $scope.minTime;
                    date.maxTime = $scope.maxTime;

                    var modalInstance = $uibModal.open({
                        templateUrl: 'eventdetails.html',
                        size: 'lg',
                        controller: 'ApptModalController',
                        windowClass: 'medium-modal-box',
                        resolve: {
                            items: function() {
                                return angular.copy(date);
                            }
                        }
                    });
                    modalInstance.result.then(function() {
                        // console.log('Modal opened at: ' + new Date());
                    }, function() {
                        // console.log('Modal dismissed at: ' + new Date());
                    });
                  }




              }





          };
          /* alert on Drop */
          $scope.alertOnDrop = function(event, delta, revertFunc, jsEvent, ui, view) {
              $scope.alertMessage = ('Event Dropped to make dayDelta ' + delta);
          };
          /* alert on Resize */
          $scope.alertOnResize = function(event, delta, revertFunc, jsEvent, ui, view) {
              $scope.alertMessage = ('Event Resized to make dayDelta ' + delta);
          };
          /* add and removes an event source of choice */
          $scope.addRemoveEventSource = function(sources, source) {
              var canAdd = 0;
              angular.forEach(sources, function(value, key) {
                  if (sources[key] === source) {
                      sources.splice(key, 1);
                      canAdd = 1;
                  }
              });
              if (canAdd === 0) {
                  sources.push(source);
              }
          };

          /* Change View */
          $scope.changeView = function(view, calendar) {
              // console.log("ChangeView", calendar, view, uiCalendarConfig.calendars.myCalendar3.fullCalendar('getDate').format("YYYY-MM-DD"));
              if (view == "agendaWeek") {
                  // console.log(uiCalendarConfig.calendars.myCalendar3.fullCalendar('getDate').startOf("week").format("YYYY-MM-DD"))
                  // console.log(uiCalendarConfig.calendars.myCalendar3.fullCalendar('getDate').endOf("week").format("YYYY-MM-DD"))

              }

              if (view == "agendaDay") {
                  $scope.uiConfig.calendar.editable = false;
              } else {
                  $scope.uiConfig.calendar.editable = false;
              }

              // console.log("Ch", view);
              uiCalendarConfig.calendars[calendar].fullCalendar('changeView', view);
          };
          /* Change View */
          $scope.renderCalender = function(calendar) {

              // console.log("renderCalender", calendar);
              if (uiCalendarConfig.calendars[calendar]) {
                  uiCalendarConfig.calendars[calendar].fullCalendar('render');
              }
          };
          /* Render Tooltip */
          $scope.eventRender = function(event, element, view) {
              if (event.type == "Appointment") {

                  var content =
                      '<b>Appointment Type:</b> ' + event.description.appt_type.title + '<br />' +
                      '<b>Diagnosis:</b> ' + event.description.diagnosis.title + '<br />' +
                      '<b>Patient:</b> ' + event.description.patient.first_name + ' ' + event.description.patient.last_name;
                  $(element).tooltip({
                      title: content,
                      html: true
                  });
                  var title = event.description.patient.first_name;
                  if (event.description.patient.middle_name) title = title + " " + event.description.patient.middle_name;
                  title += " " + event.description.patient.last_name;
                  element.find('.fc-title').append("<br/>" + event.description.patient.first_name + " " + event.description.patient.last_name);
                  // element.find('.fc-title').append("<br/>" + event.description.patient.first_name+" "+ event.description.patient.last_name);
              }
              element.attr({
                  'tooltip': event.title,
                  'tooltip-append-to-body': true
              });
              $compile(element)($scope);
          };

          $scope.dayClick = function(date, jsEvent, view) {
              // console.log('Clicked on: ' + date.format("HH:mm"), date.format());

              // console.log('Coordinates: ' + jsEvent.pageX + ',' + jsEvent.pageY, jsEvent, view);
              // console.log('Current view: ' + view.name);

              if (view.name === "month") {
                  uiCalendarConfig.calendars.myCalendar3.fullCalendar('gotoDate', date);
                  uiCalendarConfig.calendars.myCalendar3.fullCalendar('changeView', 'agendaDay');
              } else if (view.name == "agendaWeek") {
                  uiCalendarConfig.calendars.myCalendar3.fullCalendar('gotoDate', date);
                  uiCalendarConfig.calendars.myCalendar3.fullCalendar('changeView', 'agendaDay');
              }




          };


          $scope.viewRender = function(view, element) {

          }


          /* config object */
          $scope.uiConfig = {
              calendar: {
                  height: 550,
                  // slotMinutes : 15
                  // duration: '00:15:00' , 
                  slotDuration: "00:20:00",
                  allDaySlot: false,
                  editable: false,
                  eventOrder: "type",
                  defaultView: "month",
                  lazyFetching: false,
                  eventDurationEditable: false,
                  header: {
                      // left: 'prev,next today',
                      // center: 'title',
                      // right: 'month,agendaWeek,agendaDay'
                      left: 'title',
                      center: 'month,agendaWeek,agendaDay',
                      right: 'today prev,next'
                  },
                  eventClick: $scope.alertOnEventClick,
                  eventDrop: $scope.alertOnDrop,
                  eventResize: $scope.alertOnResize,
                  eventRender: $scope.eventRender,
                  dayClick: $scope.dayClick,
                  viewRender: $scope.viewRender,
                  // timezone : 'local'
                  // day
              }
          };



          /* event sources array*/
          $scope.eventSources = [$scope.events, $scope.calEventsExt /*, $scope.eventSource*/ , $scope.eventsF];
          // $scope.eventSources2 = [/*$scope.calEventsExt, $scope.eventsF,*/ $scope.events];

          // $scope.$watch("getOptions", function(newO,oldO){
          //     $scope.destroy();
          //     $scope.init();
          // });



          var SecondsTohhmmss = function(totalSeconds) {
              var hours = Math.floor(totalSeconds / 60);
              var minutes = Math.floor((totalSeconds - (hours * 60)));
              // var seconds = totalSeconds - (hours * 60) - (minutes * 60);
              var results = {};
              // round seconds
              // seconds = Math.round(seconds * 100) / 100
              results.hour = (hours < 10 ? "0" + hours : hours);
              results.min = (minutes < 10 ? "0" + minutes : minutes);
              // // console.log("Results", results);
              return results;
          }


          function getStart() {
              if ($scope.myCalendar3 != null) {
                  var view = $scope.myCalendar3.fullCalendar('getView');
                  return view.visStart;
              } else return null;

          }

          $scope.$watch(getStart, function(newVal, oldVal) {
              //if(newVal != oldVal)
              // console.log("calendar watching", newVal, oldVal);
          }, false);

          $scope.checkboxChanged = function() {
              $timeout(function() {
                  // // console.log("Day Changed", $scope.userSelection /*, JSON.stringify($scope.userSelection)*/ );

                  if ($scope.userSelection.apptTypeId._id && $scope.userSelection.diagId._id && $scope.userSelection.office_id._id && $scope.userSelection.patientId._id && $scope.userSelection.providerId._id) {
                      $scope.fetchSchedule();
                  }

              })
          }

          $scope.$watchCollection('userSelection', function(newVal, oldVal) {
              // console.log("New >>", newVal, "oldVal>>", oldVal);
              if (typeof newVal !== "undefined") {
                  if (newVal.office_id) {
                      // console.log("Selected office " , newVal.office_id);
                      $scope.fetchSchedule();
                  }
              }
          });

          $scope.$watch('patientId', function(newval, oldval) {
              // // console.log(oldval, newval);
              if (oldval != newval) {
                  if (typeof newval !== "undefined") {
                      // // console.log("New value updated ", newval);
                      $scope.userSelection.patientId = newval.originalObject;
                      //here empty the value of add and passangers of the user               
                      $scope.getTasksEstimatedTime();
                  } else {
                      $scope.userSelection.patientId = null;
                  }
              }
          });

          $rootScope.$on("CallForGridRefresh", function(event, data) {
              $scope.fetchSchedule();
          });

      }])
      .controller('ApptModalController', ['$scope', '$rootScope', '$timeout', '$uibModalInstance', '$uibModal', 'AppointmentSchedulingService', 'items', '$localStorage', '$confirm', function($scope, $rootScope, $timeout, $uibModalInstance, $uibModal, AppointmentSchedulingService, items, $localStorage, $confirm) {
          // console.log("items", items)
          $scope.data = items;
          $scope.cancel = function() {
              $uibModalInstance.dismiss('cancel');
          }

          $scope.formData = {};
          $scope.formData.appointment = $scope.data.description.appointment_start_time;
          $scope.formData.noshow = items.description.noshow;

          // // console.log("Should be setting noshow here..." , items.description.noshow , $scope.formData.noshow)

          $scope.deleteAppointment = function() {
              var inputJson = {};
              inputJson.appointment_id = items.description._id;
              inputJson.overriddenBy = items.subscriber_id;
              inputJson.is_cancelled = true;

              // console.log("FormData is : ", inputJson);
              $confirm({ text: 'Are you sure you want to delete this appointment?' })

              .then(function() {

                  AppointmentSchedulingService.deleteAppointment(inputJson, function(editresponse) {

                      if (editresponse.messageId == 200) {
                          $scope.showmessage = true;
                          $scope.alerttype = 'alert alert-success';
                          $scope.message = editresponse.message;
                          $timeout(function(argument) {
                              $scope.showmessage = false;
                              $uibModalInstance.close();
                              // refresh grid
                              $scope.$emit('CallForGridRefresh');
                          }, 4000)
                      } else {
                          $scope.showmessage = true;
                          $scope.alerttype = 'alert alert-danger';
                          $scope.message = editresponse.message;
                          $timeout(function(argument) {
                              $scope.showmessage = false;
                              $uibModalInstance.close();
                              // refresh grid
                              $scope.$emit('CallForGridRefresh');
                          }, 4000)
                      }

                  });
              });
          }


          $scope.submit = function(formData) {

              var inputJson = {};
              var appointment_date = new moment($scope.formData.fromDate).format("YYYY-MM-DD")
              inputJson.appointment_id = items.description._id;
              inputJson.appointment_start_time = $scope.formData.appointment.start_time; //issue
              inputJson.appointment_end_time = $scope.formData.end_time;
              inputJson.appointment_date = appointment_date;
              inputJson.appointment_type = items.description.appt_type._id;
              inputJson.diagnosis = items.description.diagnosis._id;
              inputJson.office_id = items.description.office;
              inputJson.patient_id = items.description.patient;
              inputJson.provider = $scope.formData.provider ? $scope.formData.provider._id : items.description.provider._id;
              inputJson.referrer = items.description.referrer;

              inputJson.referrer_type = items.description.referrer_type;
              // this was null when i made this
              // inputJson.startTime                 =                                        // what is this?
              inputJson.subscriber_id = items.description.subscriber_id;
              inputJson.tasks = $scope.data.description.appointment_tasks;
              inputJson.totalTime = $scope.formData.totalTime;
              inputJson.noshow = $scope.formData.noshow;
              inputJson.userPatientType = items.description.patient.patient_type;
              // console.log("FormData is : ", inputJson);



              AppointmentSchedulingService.editAppointment(inputJson, function(editresponse) {
                  // console.log("Response is ", editresponse);
                  $scope.showloader = false;
                  if (editresponse.messageId == 200) {
                      // toastr.success(response.message, 'Success');

                      $scope.showmessage = true;
                      $scope.alerttype = 'alert alert-success';
                      $scope.message = editresponse.message;
                      $timeout(function(argument) {
                              $scope.showmessage = false;
                              $uibModalInstance.close();
                              // refresh grid
                              $scope.$emit('CallForGridRefresh');
                          }, 2000)
                          //grid refresh from here 
                  } else {

                      if (editresponse.listOfFailedConstraints) {
                          //=============================================================
                          // Manager override prompt
                          //=============================================================
                          var data = {
                              "listOfFailedConstraints": editresponse.listOfFailedConstraints,
                          };

                          var modalInstance = $uibModal.open({
                              templateUrl: '/modules/appointmentscheduling/views/manageroverride.html',
                              size: 'lg',
                              controller: 'ManagerOverrideModalController',
                              windowClass: 'medium-modal-box',
                              resolve: {
                                  items: function() {
                                      return data;
                                  }
                              }
                          });
                          modalInstance.result.then(function(data) {
                              // console.log('Modal opened at: ' + new Date());

                              // console.log("IN MANAGER OVERRIDE ", data)

                              if (data.managerOverride == true) {
                                  inputJson.overriddenBy = null;
                                  inputJson.managerOverride = true;
                                  inputJson.listOfFailedConstraints = data.listOfConstraints;
                                  inputJson.userPatientType = items.description.patient.patient_type;
                                  // // console.log("managerOverride data" , data)
                                  $scope.showloader = true;
                                  AppointmentSchedulingService.editAppointment(inputJson, function(response) {
                                      $scope.showloader = false;
                                      if (response.messageId == 200) {
                                          // toastr.success(response.message, 'Success');
                                          $scope.showmessage = true;
                                          $scope.alerttype = 'alert alert-success';
                                          $scope.message = response.message;
                                          $timeout(function(argument) {
                                                  $scope.showmessage = false;
                                                  $uibModalInstance.close();
                                                  // refresh grid
                                                  $scope.$emit('CallForGridRefresh');
                                              }, 2000)
                                              //grid refresh from here 
                                      } else {
                                          // toastr.error("Appointment not booked", 'Error');
                                          $scope.showmessage = true;
                                          $scope.alerttype = 'alert alert-danger';
                                          $scope.message = response.message;
                                          // $timeout(function(argument) {
                                          //     $scope.showmessage = false;
                                          //     $uibModalInstance.close();
                                          //     // refresh grid
                                          //     $scope.$emit('CallForGridRefresh');
                                          // }, 2000)
                                      }
                                  });
                              } else {
                                  // toastr.error("Appointment not booked", 'Error');
                                  $scope.showmessage = true;
                                  $scope.alerttype = 'alert alert-danger';
                                  $scope.message = editresponse.message;
                                  // $timeout(function(argument) {
                                  //     $scope.showmessage = false;
                                  //     $uibModalInstance.close();
                                  //     // refresh grid
                                  //     $scope.$emit('CallForGridRefresh');
                                  // }, 2000)
                              }
                          }, function() {
                              // console.log('Modal dismissed at: ' + new Date());
                          });

                      } else {
                          $scope.showmessage = true;
                          $scope.alerttype = 'alert alert-danger';
                          $scope.message = editresponse.message;
                          // $timeout(function(argument) {
                          //     $scope.showmessage = false;
                          //     $uibModalInstance.close();
                          //     // refresh grid
                          //     $scope.$emit('CallForGridRefresh');
                          // }, 2000)
                      }
                  }
              });
          }

          $scope.removeTask = function(card, index) {
              // console.log("Index is ", index);
              var myDataArr = $scope.data.description.appointment_tasks;
              // console.log("Length ", myDataArr.length);
              //check for index first and last here 
              for (var i = 0; i < myDataArr.length; i++) {
                  if (myDataArr[i] == card) {
                      myDataArr.splice(index, 1);
                  }
              }

              $scope.data.description.appointment_tasks = myDataArr;
          };



          // var start_time = items.description.office.default_start_time;
          // var end_time = items.description.office.default_end_time;

          var start_time = moment(items.minTime, "HH:mm:ss");
          start_time = start_time.clone().format("hh:mm A");
          var end_time = moment(items.maxTime, "HH:mm:ss");
          end_time = end_time.clone().format("hh:mm A");
          var slot_time = items.description.office.default_slot_time;

          AppointmentSchedulingService.getSlotStartTimes({ start_time: start_time, end_time: end_time, slot_time: slot_time }, function(slotresponse) {
              // console.log("slotresponse", slotresponse);
              $scope.editslottimes = slotresponse.data;
              $scope.editslottimes.forEach(function(item) {
                  // // console.log("$scope.data.description.appointment_start_time" , $scope.data.description.appointment_start_time , "item.start_time" , item.start_time)
                  if ($scope.data.description.appointment_start_time == item.start_time) {
                      $scope.formData.appointment = item;
                  }
              })
          });

          var data1 = {};
          // data1.createdBy = $localStorage.loggedInUserId;
          data1.officeId = items.description.office._id;
          data1.subscriber_id = items.description.subscriber_id;

          AppointmentSchedulingService.getProviderList(data1, function(response) {
              $scope.providerData = response.data;

              $scope.providerData.forEach(function(item) {
                  // // console.log("PROVIDER MATCH" , $scope.data.description.provider._id , item._id)
                  if ($scope.data.description.provider._id == item._id) {
                      $scope.formData.provider = item;
                      // // console.log("MATCHED" , $scope.formData.provider)
                      // break;
                  }
              })


          });

          //datepicker settings

          $scope.formData.fromDate = moment(items.description.appointment_date, "YYYY-MM-DD").toDate(); //  new Date(items.description.appointment_date);

          $scope.today = function() {
              $scope.formData.fromDate = moment(items.description.appointment_date, "YYYY-MM-DD").toDate();
          };
          $scope.today();

          $scope.clear = function() {
              $scope.formData.fromDate = null;
          };


          $scope.minDate = new Date(items.description.appointment_date);

          $scope.dateOptions = {
              minDate: new Date(),
              showWeeks: false,
              startingDay: 0
          };

          $scope.open1 = function() {
              $scope.popup1.opened = true;
          };

          $scope.setDate = function(year, month, day) {
              $scope.formData.fromDate = new Date(year, month, day);
          };

          $scope.formats = ['dd-MMMM-yyyy', 'yyyy/MM/dd', 'dd.MM.yyyy', 'shortDate', 'dd/MM/yyyy'];
          $scope.format = $scope.formats[4];
          $scope.altInputFormats = ['M!/d!/yyyy'];

          $scope.popup1 = {
              opened: false
          };

          //datepicker end
          // // console.log("fd" , $scope.formData ,  moment(items.description.appointment_date , "YYYY-MM-DD").toDate() ) ; 

          var inputJson = {};
          inputJson.subscriber_id = items.description.subscriber_id;
          inputJson.office_id = items.description.office;
          inputJson.patient = items.description.patient._id;
          inputJson.diagId = items.description.diagnosis._id;
          inputJson.apptTypeId = items.description.appt_type;
          inputJson.refererId = items.description.referrer;


          AppointmentSchedulingService.getTasksEstimatedTime(inputJson, function(response) {

              var completeTaskArray = angular.copy(response.data);
              $scope.completeTaskArray = completeTaskArray;
              // // console.log("completeTaskArray", completeTaskArray)
              var taskListData = $scope.data.description.appointment_tasks;
              // // console.log("taskListData", taskListData)
              var taskArray = [];

              // console.log("taskArray", taskArray);

              //  modal that adds a task to frontEnd array
              $scope.addTask = function() {
                  taskArray = [];
                  var completeTaskArray = $scope.completeTaskArray;
                  var taskListData = $scope.data.description.appointment_tasks;
                  // // console.log("completeTaskArray", completeTaskArray, "taskListData", taskListData);
                  angular.forEach(completeTaskArray, function(value, key) {
                      // // console.log("key", key, value);
                      var flag = false;
                      for (var i = 0; i < taskListData.length; i++) {
                          // // console.log(value._id, taskListData[i].task, taskListData[i]._id, "matched!", taskListData[i])
                          if (value._id == taskListData[i].task || value._id == taskListData[i]._id) {
                              // // console.log("matched here ");
                              flag = true;
                          }
                      }
                      if (!flag) {
                          taskArray.push(value);
                          // completeTaskArray.pop(value);
                      }

                  });



                  var data = {
                      "diagnosis": items.description.diagnosis,
                      task: taskArray,
                      isEditMode: true
                  };
                  // console.log("data", data)
                  var modalInstance = $uibModal.open({
                      templateUrl: 'addschedulingtask.html',
                      size: 'sm',
                      controller: 'ApptSchedulingTaskController',
                      // windowClass: 'small-modal-box',
                      resolve: {
                          items: function() {
                              return data;
                          }
                      }
                  });
                  modalInstance.result.then(function() {
                      // console.log('Modal opened at: ' + new Date());
                  }, function() {
                      // console.log('Modal dismissed at: ' + new Date());
                  });
              }

              $rootScope.$on("TaskAddedFromEdit", function(event, data) {
                  // // console.log(event , data);
                  $scope.data.description.appointment_tasks.push(data);

              })


              $scope.$watchCollection("data.description.appointment_tasks", function(n, o) {
                  if (typeof n !== "undefined") {
                      // // console.log("Task Changed ", n, "Old ", o);
                      $scope.calculateAppointmentTotalTime();
                  }
              });


              $scope.calculateAppointmentTotalTime = function() {
                  var data = $scope.data.description.appointment_tasks;

                  var totalTime = 0;

                  data.forEach(function(item) {
                      totalTime = totalTime + item.time;
                  })

                  // // console.log("totalTime is ", totalTime);
                  $scope.formData.totalTime = totalTime;

                  if ($scope.formData.totalTime) {

                      if ($scope.formData.appointment && $scope.formData.appointment.start_time) {
                          var start_time = moment($scope.formData.appointment.start_time, "hh:mm")
                      } else {
                          var start_time = moment($scope.data.description.appointment_start_time, "hh:mm")
                      }

                      var end_time = start_time.add(totalTime, 'm')
                      var end_time = end_time.clone().format("HH:mm")
                      $scope.formData.end_time = end_time;
                  }

              }

              $scope.calculateAppointmentTotalTime();

          });


      }])

  .controller('ApptModalControllerView', ['$scope', '$uibModalInstance', 'items', function($scope, $uibModalInstance, items) {
          // console.log("items", items)
          $scope.data = items;
          $scope.cancel = function() {
              $uibModalInstance.dismiss('cancel');
          }
      }])
      .controller('ManagerOverrideModalController', ['$scope', '$uibModalInstance', 'items', '$timeout', '$rootScope', '$localStorage', function($scope, $uibModalInstance, items, $timeout, $rootScope, $localStorage) {
          // console.log("items", items)
          $scope.data = items;
          $scope.cancel = function() {
              $uibModalInstance.dismiss('cancel');
          }

          $scope.yes = function() {
              $uibModalInstance.close({
                  managerOverride: true,
                  listofConstraints: $scope.data.listOfFailedConstraints
              });
          }

          $scope.no = function() {
              $uibModalInstance.close({
                  managerOverride: false,
                  listofConstraints: $scope.data.listOfFailedConstraints
              });
          }


          $scope.isEditGrid = false;
          // console.log("$localStorage.userType" , $localStorage.userType , $localStorage )
          if ($localStorage.userType == 1 || $localStorage.userType == 2) {
              $scope.isEditGrid = true;
          } else if ($localStorage.userPermissions) {
              var permission = $localStorage.userPermissions;
              for (var i = 0; i < permission.length; i++) {
                  if (permission[i] == 5) {
                      $scope.isEditGrid = true;
                      break;
                  }
              }
          }
      }])
