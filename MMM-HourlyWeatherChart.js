/* Magic Mirror
 * Module: MMM-HourlyWeatherChart
 *
 * By Tatsuma Matsuki
 * MIT Licensed.
 * Some code is borrowed from 
 * https://github.com/roramirez/MagicMirror-Module-Template
 * https://github.com/sathyarajv/MMM-OpenmapWeather
 */

Module.register("MMM-HourlyWeatherChart", {
	defaults: {
		updateInterval: 30 * 60 * 1000,
		retryDelay: 5000,
		apiUrl: "https://api.openweathermap.org/data/",
		apiVersion: "2.5",
		apiEndpoint: "forecast/hourly",
		apiKey: "",
		location: false,
		locationID: false,
		units: "metric",
		lang: "en"
	},

	requiresVersion: "2.12.0",

	start: function () {
		var self = this;
		var dataRequest = null;
		var dataNotification = null;

		//Flag for check if module is loaded
		this.loaded = false;

		// Schedule update timer.
		this.getData();
		setInterval(function () {
			self.updateDom();
		}, this.config.updateInterval);
	},

	/*
	 * getData
	 * function example return data and show it in the module wrapper
	 * get a URL request
	 *
	 */
	getData: function () {
		var self = this;

		if (this.config.apiKey === "") {
			Log.error(self.name + ": apiKey must be specified");
			return;
		}
		if (!this.config.location && !this.config.locationID) {
			Log.error(self.name + ": location or locationID must be specified");
			return;
		}

		var url = this.config.apiBase + this.config.apiVersion + "/" + this.config.apiEndpoint + this.getParams();
		var retry = true;

		fetch(url)
			.then((res) => {
				if (res.status == 401) {
					retry = false;
					throw new Error(self.name + ": apiKey is invalid");
				} else if (!res.ok) {
					throw new Error(self.name + ": failed to get api response");
				}
				return res.json();
			})
			.then((json) => {
				self.processData(json);
			})
			.catch((msg) => {
				Log.error(msg)
			})
		if (retry) {
			self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
		}
	},

	getParams: function () {
		var params = "?";
		if (this.config.locationID) {
			params += "id=" + this.config.locationID;
		} else if (this.config.location) {
			params += "q=" + this.config.location;
		}
		params += "&units=" + this.config.units;
		params += "&lang=" + this.config.lang;
		params += "&appid=" + this.config.apiKey;

		return params;
	},


	/* scheduleUpdate()
	 * Schedule next update.
	 *
	 * argument delay number - Milliseconds before next update.
	 *  If empty, this.config.updateInterval is used.
	 */
	scheduleUpdate: function (delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}
		nextLoad = nextLoad;
		var self = this;
		setTimeout(function () {
			self.getData();
		}, nextLoad);
	},

	getDom: function () {
		var self = this;

		// create element wrapper for show into the module
		var wrapper = document.createElement("div");
		// If this.dataRequest is not empty
		if (this.weatherdata) {
			var wrapperWeatherData = document.createElement("div");
			wrapperWeatherData.innerHTML = this.weatherdata.city.name + ": " + this.weatherdata.list[0].temp;

			wrapper.appendChild(wrapperWeatherData);
		}

		// Data from helper
		if (this.dataNotification) {
			var wrapperDataNotification = document.createElement("div");
			// translations  + datanotification
			wrapperDataNotification.innerHTML = this.translate("UPDATE") + ": " + this.dataNotification.date;

			wrapper.appendChild(wrapperDataNotification);
		}
		return wrapper;
	},

	getScripts: function () {
		return [];
	},

	getStyles: function () {
		return [];
	},

	// Load translations files
	getTranslations: function () {
		return {};
	},

	processData: function (data) {
		var self = this;
		this.weatherdata = data;
		if (this.loaded === false) { self.updateDom(self.config.animationSpeed); }
		this.loaded = true;

		// the data if load
		// send notification to helper
		this.sendSocketNotification("MMM-HourlyWeatherChart-NOTIFICATION", data);
	},

	// socketNotificationReceived from helper
	socketNotificationReceived: function (notification, payload) {
		if (notification === "MMM-HourlyWeatherChart-NOTIFICATION") {
			// set dataNotification
			this.dataNotification = payload;
			this.updateDom();
		}
	},
});
