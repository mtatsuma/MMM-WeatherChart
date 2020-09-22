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
		units: "standard",
		lang: "en",
		chartjsVersion: "2.9.3",
		chartjsDatalablesVersion: "0.7.0",
		height: "300px",
		width: "500px",
		fontSize: 16,
		dataNum: 24,
		timeOffsetHours: 0,
		title: "Weather Forecast",
		iconURLBase: "https://openweathermap.org/img/wn/",
		dataType: "hourly",
		nightBorderDash: [5, 1],
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

	getHourlyDataset: function () {
		const data = this.weatherdata.hourly,
			temps = [],
			dayTemps = [],
			nightTemps = [],
			labels = [],
			iconIDs = [];
		data.sort(function (a, b) {
			if (a.dt < b.dt) return -1;
			if (a.dt > b.dt) return 1;
			return 0;
		});
		let dayTime;
		for (let i = 0; i < Math.min(this.config.dataNum, data.length); i++) {
			let dateTime = new Date(data[i].dt * 1000 + this.config.timeOffsetHours * 60 * 60 * 1000);
			let iconID = data[i].weather[0].icon;
			let temp = Math.round(data[i].temp * 10) / 10;
			if (i === 0) {
				dayTime = Boolean(iconID.match(/d$/))
			};
			labels.push(dateTime.getHours());
			if (iconID.match(/d$/)) {
				dayTemps.push(temp);
				if (!dayTime) {
					nightTemps.push(temp);
				} else {
					nightTemps.push(NaN);
				}
				dayTime = true;
			};
			if (iconID.match(/n$/)) {
				nightTemps.push(temp);
				if (dayTime) {
					dayTemps.push(temp);
				} else {
					dayTemps.push(NaN);
				};
				dayTime = false;
			};
			temps.push(temp);
			iconIDs.push(iconID);
		};

		const minTemp = temps.reduce((a, b) => Math.min(a, b)),
			maxTemp = temps.reduce((a, b) => Math.max(a, b)),
			underLine = [],
			icons = [];
		for (let i = 0; i < temps.length; i++) {
			underLine.push(minTemp - (maxTemp - minTemp) * 0.2);
			let img = new Image();
			img.src = this.config.iconURLBase + iconIDs[i] + ".png";
			icons.push(img);
		};
		const datasets = [{
			label: 'Day Temparature',
			backgroundColor: 'rgba(0, 0, 0, 0)',
			borderColor: 'rgba(255, 255, 255, 1)',
			pointBackgroundColor: 'rgba(255, 255, 255, 1)',
			datalabels: {
				color: 'rgba(255, 255, 255, 1)',
				align: 'top'
			},
			data: dayTemps
		},
		{
			label: 'Night Temparature',
			backgroundColor: 'rgba(0, 0, 0, 0)',
			borderColor: 'rgba(255, 255, 255, 1)',
			borderDash: this.config.nightBorderDash,
			pointBackgroundColor: 'rgba(255, 255, 255, 1)',
			datalabels: {
				color: 'rgba(255, 255, 255, 1)',
				align: 'top'
			},
			data: nightTemps
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
		}];
		return { labels: labels, datasets: datasets }
	},

	getDailyDataset: function () {
		const data = this.weatherdata.daily,
			maxTemps = [],
			minTemps = [],
			labels = [],
			iconIDs = [];
		data.sort(function (a, b) {
			if (a.dt < b.dt) return -1;
			if (a.dt > b.dt) return 1;
			return 0;
		});
		for (let i = 0; i < Math.min(this.config.dataNum, data.length); i++) {
			const dateTime = new Date(data[i].dt * 1000 + this.config.timeOffsetHours * 60 * 60 * 1000)
			labels.push(dateTime.getDate());
			maxTemps.push(Math.round(data[i].temp.max * 10) / 10);
			minTemps.push(Math.round(data[i].temp.min * 10) / 10);
			iconIDs.push(data[i].weather[0].icon);
		};

		const minValue = minTemps.reduce((a, b) => Math.min(a, b)),
			maxValue = minTemps.reduce((a, b) => Math.max(a, b)),
			underLine = [],
			icons = [];
		for (let i = 0; i < minTemps.length; i++) {
			underLine.push(minValue - (maxValue - minValue) * 0.2);
			let img = new Image();
			img.src = this.config.iconURLBase + iconIDs[i] + ".png";
			icons.push(img);
		};
		const datasets = [{
			label: 'Minimum Temparature',
			backgroundColor: 'rgba(0, 0, 0, 0)',
			borderColor: 'rgba(255, 255, 255, 1)',
			pointBackgroundColor: 'rgba(255, 255, 255, 1)',
			datalabels: {
				color: 'rgba(255, 255, 255, 1)',
				align: 'top'
			},
			data: minTemps
		},
		{
			label: 'Maximum Temparature',
			backgroundColor: 'rgba(0, 0, 0, 0)',
			borderColor: 'rgba(255, 255, 255, 1)',
			pointBackgroundColor: 'rgba(255, 255, 255, 1)',
			datalabels: {
				color: 'rgba(255, 255, 255, 1)',
				align: 'top'
			},
			data: maxTemps
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
		}];
		return { labels: labels, datasets: datasets }
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
				ctx = wrapperCanvas.getContext('2d');

			let dataset;
			if (this.config.dataType === "hourly") {
				dataset = this.getHourlyDataset();
			} else if (this.config.dataType == "daily") {
				dataset = this.getDailyDataset();
			}

			Chart.defaults.global.defaultFontSize = this.config.fontSize
			this.chart = new Chart(ctx, {
				type: 'line',
				data: {
					labels: dataset.labels,
					datasets: dataset.datasets
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
