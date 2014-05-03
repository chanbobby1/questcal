var DEFAULT_DESCRIPTION = "Exported from Quest";
var DEFAULT_REMINDER_MIN_BEFORE = 30;
var GOOGLEAPPS_API_KEY = "AIzaSyCqJ1uf5KmxQIf-7_p7cfcnjzlSXer8vcc";
var GOOGLEAPPS_API_CLIENT_ID = "58571194028-bdjgsi5l9pp3k2u0dv49b9vuc7jdgs9j.apps.googleusercontent.com";

// Load Calendar API
function loadedGAPI() {
	gapi.client.load('calendar', 'v3', function () {
		console.log('loaded.');
	});
	gapi.client.setApiKey(GOOGLEAPPS_API_KEY);
}

// Convert Date object to RFC3339 Format
function ISODateString(d) {
	function pad(n) {
		return n < 10 ? '0' + n : n
	}
	return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z'
}

// Convert Date object to RFC3339 Format without separators
function ISODateStringWithoutSeparators(d) {
	return ISODateString(d).replace(/-/g, "").replace(/:/g, "");
}

// Authenticate Google App
function auth() {
	var config = {
		'client_id': GOOGLEAPPS_API_CLIENT_ID,
		'scope': 'https://www.googleapis.com/auth/calendar'
	};
	gapi.auth.authorize(config, function () {
		QuestCal.init();
	});
}

var QuestCal = {
	schedule: [],

	init: function () {
		this.parseSchedule();
		this.addClassScheduleToGoogleCal();
	},

	createClass: function(courseTitle, section, component, daysTimes, startEndDate, location, instructor) {
		return {
			courseTitle: courseTitle,
			section: section,
			component: component,
			daysTimes: daysTimes,
			startEndDate: startEndDate,
			location: location,
			instructor: instructor
		};
	},

	convertClassToGoogleCalResource: function(courseClass) {
		var title = courseClass.courseTitle.split(" - ")[0];
		var classTitle = title + " " + courseClass.component + " - " + courseClass.section;

		var daysTimes = courseClass.daysTimes;

		var days = (daysTimes.split(" ")[0]).match(/([A-Z][a-z]?)/g);

		var times12Hrs = daysTimes.match(/(\d{1,2}:\d{2}(AM|PM))/g);

		var times = [];

		if(typeof times12Hrs != "undefined" && times12Hrs != null && times12Hrs.length > 0) {

			// Change from 12hr clock times (AM, PM) to 24hr times
			for(var i = 0; i < times12Hrs.length; i++) {
				var time = times12Hrs[i];
				if(time.match(/\d{1,2}:\d{2}AM/g)) {
					times12Hrs[i] = time.replace("AM", "");
				} else if (time.match(/\d{1,2}:\d{2}PM/g)) {
					time = time.replace("PM", "");
					var hrs = parseInt(time.split(":")[0]);
					if(hrs < 12) {
						hrs += 12;
					}
					var min = time.split(":")[1];
					times12Hrs[i] = hrs+":"+min;
				}
			}

			times = times12Hrs;
		} else {
			var times24Hrs = daysTimes.match(/(\d{1,2}:\d{2})/g);

			times = times24Hrs;
		}

		// Convert date from Quest format to RRULE format.
		for(var i = 0; i < days.length; i++) {
			var day = days[i];
			if(day == "M") {
				days[i] = "MO";
			} else if(day == "T") {
				days[i] = "TU";
			} else if(day == "W") {
				days[i] = "WE";
			} else if(day == "Th") {
				days[i] = "TH";
			} else if(day == "F") {
				days[i] = "FR";
			} else if(day == "SA") {
				days[i] = "SA";
			} else if(day == "SU") {
				days[i] = "SU";
			}
		}

		var rawTermStartDate = courseClass.startEndDate.split(" - ")[0];
		var rawTermEndDate = courseClass.startEndDate.split(" - ")[1];

		var termStartDate = moment(rawTermStartDate, "DD/MM/YYYY");
		var termEndDate = moment(rawTermEndDate, "DD/MM/YYYY").endOf("day");
		var oneTimeEvent = (rawTermStartDate == rawTermEndDate);
		var startDateTime = moment(rawTermStartDate + " " + times[0], "DD/MM/YYYY HH:mm");
		var startDayNum = 0;
		if(days[0] == "MO") {
			startDayNum = 1;
		} else if(days[0] == "TU") {
			startDayNum = 2;
		} else if(days[0] == "WE") {
			startDayNum = 3;
		} else if(days[0] == "TH") {
			startDayNum = 4;
		} else if(days[0] == "FR") {
			startDayNum = 5;
		} else if(days[0] == "SA") {
			startDayNum = 6;
		} else if(days[0] == "SU") {
			startDayNum = 0;
		}
		console.log(classTitle + ": " + startDayNum + " - " +startDateTime.date());
		// Adjust from the start day of the term (eg Monday) to the class start day(eg. Tuesday)
		startDateTime.day(startDayNum);

		var endDateTime = moment(rawTermStartDate + " " + times[1], "DD/MM/YYYY HH:mm");

		// Adjust from the start day of the term (eg Monday) to the class start day(eg. Tuesday)
		endDateTime.day(startDayNum);

		var googleCalResource = {
			"summary": classTitle,
			"location": courseClass.location.replace(/\s+/g, " "),
			"start": {
				"dateTime": ISODateString(startDateTime.toDate()), //startDateTime.format("YYYY-MM-DDTHH:mm:ssZ"),
				"timeZone": "America/Toronto"
			},
			"end": {
				"dateTime": ISODateString(endDateTime.toDate()), //endDateTime.format("YYYY-MM-DDTHH:mm:ssZ"),
				"timeZone": "America/Toronto"
			},
			"description" : DEFAULT_DESCRIPTION,
			"reminders": {
				"overrides": [{
					"method": "popup",
					"minutes": DEFAULT_REMINDER_MIN_BEFORE
				}],
				"useDefault": "false"
			}
		};

		if(!oneTimeEvent) {
			googleCalResource.recurrence = ["RRULE:FREQ=WEEKLY;UNTIL="+ISODateStringWithoutSeparators(termEndDate.toDate())+";WKST=SU;BYDAY=" + days.join(",")];
		}

		return googleCalResource;
	},

	parseSchedule: function () {
		$(".PSGROUPBOXWBO").each(function () {
			var courseTable = $(this);
			var courseTitle = courseTable.find("td.PAGROUPDIVIDER").text();
			var enrollmentStatus = courseTable.find("*[id^=STATUS]").text();
			var components = courseTable.find(".PSLEVEL3GRIDNBO tr[id^=trCLASS]");
			components.each(function () {
				var cmpt = $(this);
				var section = cmpt.find("td:eq(1) span").text();
				var component = cmpt.find("td:eq(2) span").text();
				var daysTimes = cmpt.find("td:eq(3) span").text();
				var location = cmpt.find("td:eq(4) span").text();
				var instructor = cmpt.find("td:eq(5) span").text();
				var startEndDate = cmpt.find("td:eq(6) span").text();
				if (component.trim().length > 0 && daysTimes.trim().length > 0 && enrollmentStatus == "Enrolled") {

					var classComponent = QuestCal.createClass(courseTitle, section, component, daysTimes, startEndDate, location, instructor);
					console.log(classComponent);
					QuestCal.schedule.push(classComponent);
				}
			});
		});


	},
	addClassScheduleToGoogleCal: function () {

		QuestCal.insertNewCalendarToGoogleCal();

	},
	// Create new calendar for the term.
	insertNewCalendarToGoogleCal: function() {
		var term = $("span.SSSPAGEKEYTEXT").text().split(" | ")[0];

		var newCalendar = {
			'summary': term,
			'description': DEFAULT_DESCRIPTION,
			'timeZone': "America/Toronto"
		};

		var request = gapi.client.calendar.calendars.insert({
			'resource': newCalendar
		});

		request.execute(function (resp) {
			console.log(resp);
			QuestCal.googleCalendarId = resp.id;

			// Insert each class schedule into new term calendar.
			for(var i = 0; i < QuestCal.schedule.length; i++) {
				var classSchedule = QuestCal.schedule[i];
				var googleCalResource = QuestCal.convertClassToGoogleCalResource(classSchedule);
				QuestCal.insertEventToGoogleCal(googleCalResource);
			}

			QuestCal.openGoogleCalWindow();
		});
	},

	insertEventToGoogleCal: function (eventResource) {

		var request = gapi.client.calendar.events.insert({
			'calendarId': ((typeof QuestCal.googleCalendarId != "undefined")? QuestCal.googleCalendarId : 'primary'),
			'resource': eventResource
		});
		request.execute(function (resp) {
			if(typeof resp.error != "undefined") {
				console.log("ERROR!");
				alert("Error Inserting Event \"" + eventResource.summary + "\"");
			}
			console.log(eventResource);
			console.log(resp);
			console.log("");
		});
	},

	openGoogleCalWindow: function() {
		window.open("http://www.google.com/calendar/", "_target");
	},

	setupButton: function() {
		var $button = $("<a></a>").text("Add to Google Calendar")
			.attr({
				"id": "addToCal",
				"href": "javascript:;"
			})
			.css('margin-left', '15px')
			.text("Add to Google Calendar")
			.addClass('btn btn-info btn-xs')
			.click(auth);

		if ($("#DERIVED_REGFRM1_SS_TRANSACT_TITLE #addToCal").length === 0) {
			$("#DERIVED_REGFRM1_SS_TRANSACT_TITLE").append($button);
		}
	}
};

$(document).ready(function() {
	QuestCal.setupButton();
});
