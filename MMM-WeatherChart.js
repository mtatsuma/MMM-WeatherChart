/* Magic Mirror
 * Module: MMM-WeatherChart
 *
 * By Tatsuma Matsuki
 * MIT Licensed.
 * Some code is borrowed from 
 * https://github.com/roramirez/MagicMirror-Module-Template
 * https://github.com/sathyarajv/MMM-OpenmapWeather
 */

Module.register("MMM-WeatherChart", {
	defaults: {
		updateInterval: 10 * 60 * 1000,
		retryDelay: 5000,
		apiBase: "https://api.openweathermap.org/data/",
		apiVersion: "2.5",
		apiEndpoint: "onecall",
		apiKey: "",
		lat: "",
		lon: "",
		units: "metric",
		lang: "en",
		chartjsVersion: "2.9.3",
		chartjsDatalablesVersion: "0.7.0",
		height: "300px",
		width: "500px",
		dataNum: 24,
		timeOffsetHours: 0,
		title: "Temparature Forecast",
		iconBase: "https://openweathermap.org/img/wn/"
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
		if (this.config.lat === "" && this.config.lon === "") {
			Log.error(self.name + ": location (lat and lon) must be specified");
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
		params += "lat=" + this.config.lat;
		params += "&lon=" + this.config.lon;
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

		const wrapper = document.createElement("div");
		wrapper.setAttribute(
			"style",
			"height: " + this.config.height + "; width: " + this.config.width + ";"
		);
		if (this.weatherdata) {
			const wrapperCanvas = document.createElement("canvas"),
				ctx = wrapperCanvas.getContext('2d'),
				labels = [],
				temps = [],
				iconIDs = [],
				hourlydata = this.weatherdata.hourly

			for (let i = 0; i < Math.min(this.config.dataNum, hourlydata.length); i++) {
				const dateTime = new Date(hourlydata[i].dt * 1000 + this.config.timeOffsetHours * 60 * 60 * 1000)
				labels.push(dateTime.getHours())
				temps.push(Math.round(hourlydata[i].temp * 10) / 10)
				iconIDs.push(hourlydata[i].weather[0].icon)
			}

			const minTemp = temps.reduce((a, b) => Math.min(a, b)),
				maxTemp = temps.reduce((a, b) => Math.max(a, b)),
				underLine = [],
				icons = []
			for (let i = 0; i < temps.length; i++) {
				underLine.push(minTemp - (maxTemp - minTemp) * 0.2)
				let img = new Image()
				img.src = this.config.iconBase + iconIDs[i] + ".png"
				icons.push(img)
			}
			this.chart = new Chart(ctx, {
				type: 'line',
				data: {
					labels: labels,
					datasets: [{
						label: 'Temparature',
						backgroundColor: 'rgba(0, 0, 0, 0)',
						borderColor: 'rgb(255, 255, 255)',
						datalabels: {
							color: 'rgb(255, 255, 255)',
							align: 'top'
						},
						data: temps
					},
					{
						label: 'Icons',
						backgroundColor: 'rgba(0, 0, 0, 0)',
						borderColor: 'rgba(0, 0, 0, 0)',
						data: underLine,
						pointStyle: icons,
						datalabels: {
							display: false
						}
					}]
				},
				options: {
					title: {
						display: true,
						text: this.config.title
					},
					legend: {
						display: false
					},
					scales: {
						yAxes: [
							{
								display: false
							}
						]
					},
					layout: {
						padding: {
							left: 20,
							right: 20
						}
					}
				}
			});
			wrapper.appendChild(wrapperCanvas);
		}

		// Data from helper
		if (this.dataNotification) {
			var wrapperDataNotification = document.createElement("div");
			// translations  + datanotification
			wrapperDataNotification.innerHTML = "Updated at " + this.dataNotification.date;

			wrapper.appendChild(wrapperDataNotification);
		}
		return wrapper;
	},

	getScripts: function () {
		// Load chart.js from CDN
		return [
			"https://cdn.jsdelivr.net/npm/chart.js@" + this.config.chartjsVersion + "/dist/Chart.min.js",
			"https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@" + this.config.chartjsDatalablesVersion + "/dist/chartjs-plugin-datalabels.min.js"
		];
	},

	getStyles: function () {
		return [];
	},

	getTranslations: function () {
		return false;
	},

	processData: function (data) {
		var self = this;
		this.weatherdata = data;
		if (this.loaded === false) { self.updateDom(self.config.animationSpeed); }
		this.loaded = true;

		// the data if load
		// send notification to helper
		this.sendSocketNotification("MMM-WeatherChart-NOTIFICATION", data);
	},

	// socketNotificationReceived from helper
	socketNotificationReceived: function (notification, payload) {
		if (notification === "MMM-WeatherChart-NOTIFICATION") {
			// set dataNotification
			this.dataNotification = payload;
			this.updateDom();
		}
	},
});
