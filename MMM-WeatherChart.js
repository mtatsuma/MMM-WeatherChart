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
        showIcon: false,
        showRain: false,
        color: 'rgba(255, 255, 255, 1)',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        fillColor: 'rgba(255, 255, 255, 0.1)',
        dailyLabel: 'date'
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

    getDayString: function (num) {
        let dayString = [];
        dayString.push('Su.');
        dayString.push('Mo.');
        dayString.push('Tu.');
        dayString.push('We.');
        dayString.push('Tu.');
        dayString.push('Fr.');
        dayString.push('Sa.');

        return dayString[num];
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
            rains = [],
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
            if (data[i].rain) {
                rains.push(Math.round(data[i].rain["1h"] * 10) / 10);
            } else {
                rains.push(0)
            }
            iconIDs.push(iconID);
        };

        const minTemp = temps.reduce((a, b) => Math.min(a, b)),
            maxTemp = temps.reduce((a, b) => Math.max(a, b)),
            maxRain = rains.reduce((a, b) => Math.max(a, b)),
            iconLine = [],
            icons = [];

        // Create dummy line for icons
        for (let i = 0; i < temps.length; i++) {
            let v = maxTemp;
            if (this.config.showIcon) {
                v = maxTemp + (maxTemp - minTemp) * 0.3;
            };
            iconLine.push(v);
            let img = new Image();
            img.src = this.config.iconURLBase + iconIDs[i] + ".png";
            icons.push(img);
        };

        const datasets = []
        datasets.push({
            label: 'Day Temparature',
            backgroundColor: this.config.backgroundColor,
            borderColor: this.config.color,
            pointBackgroundColor: this.config.color,
            datalabels: {
                color: this.config.color,
                align: 'top'
            },
            data: dayTemps,
            yAxisID: "y1"
        });
        datasets.push({
            label: 'Night Temparature',
            backgroundColor: this.config.backgroundColor,
            borderColor: this.config.color,
            pointBackgroundColor: this.config.color,
            borderDash: this.config.nightBorderDash,
            datalabels: {
                color: this.config.color,
                align: 'top'
            },
            data: nightTemps,
            yAxisID: "y1"
        });
        if (this.config.showIcon) {
            datasets.push({
                label: 'Icons',
                backgroundColor: this.config.backgroundColor,
                borderColor: this.config.backgroundColor,
                data: iconLine,
                pointStyle: icons,
                datalabels: {
                    display: false
                },
                yAxisID: "y1"
            })
        };
        if (this.config.showRain) {
            datasets.push({
                label: 'Rain Volume (mm)',
                backgroundColor: this.config.fillColor,
                borderColor: this.config.color,
                borderWidth: 1,
                pointBackgroundColor: this.config.color,
                datalabels: {
                    color: this.config.color,
                    align: 'top'
                },
                data: rains,
                yAxisID: "y2"
            })
        };

        // Set Y-Axis range not to overlap each other
        let y1_max = iconLine[0] + (maxTemp - minTemp) * 0.1,
            y1_min = minTemp - (maxTemp - minTemp) * 0.2,
            y2_max = Math.max(maxRain * 2.5, 0.1),
            y2_min = 0;
        if (this.config.showRain) {
            y1_min = y1_min - (maxTemp - minTemp);
        };
        const ranges = {
            "y1": {
                "min": y1_min,
                "max": y1_max
            },
            "y2": {
                "min": y2_min,
                "max": y2_max
            }
        };

        return { labels: labels, datasets: datasets, ranges: ranges };
    },

    getDailyDataset: function () {
        const data = this.weatherdata.daily,
            maxTemps = [],
            minTemps = [],
            rains = [],
            labels = [],
            iconIDs = [];
        data.sort(function (a, b) {
            if (a.dt < b.dt) return -1;
            if (a.dt > b.dt) return 1;
            return 0;
        });
        for (let i = 0; i < Math.min(this.config.dataNum, data.length); i++) {
            const dateTime = new Date(data[i].dt * 1000 + this.config.timeOffsetHours * 60 * 60 * 1000)
            if (this.config.dailyLabel == "date") {
                labels.push(dateTime.getDate());
            } else if (this.config.dailyLabel == "days_of_week") {
                labels.push(this.getDayString(dateTime.getDay()))
            } else if (this.config.dailyLabel == "date+days_of_week") {
                labels.push(this.getDayString(dateTime.getDay()) + ' ' + dateTime.getDate())
            }
            maxTemps.push(Math.round(data[i].temp.max * 10) / 10);
            minTemps.push(Math.round(data[i].temp.min * 10) / 10);
            if (data[i].rain) {
                rains.push(Math.round(data[i].rain * 10) / 10);
            } else {
                rains.push(0)
            }
            iconIDs.push(data[i].weather[0].icon);
        };

        const minValue = minTemps.reduce((a, b) => Math.min(a, b)),
            maxValue = maxTemps.reduce((a, b) => Math.max(a, b)),
            maxRain = rains.reduce((a, b) => Math.max(a, b)),
            iconLine = [],
            icons = [];

        // Create dummy line for icons
        for (let i = 0; i < minTemps.length; i++) {
            let v = maxValue;
            if (this.config.showIcon) {
                v = maxValue + (maxValue - minValue) * 0.3;
            }
            iconLine.push(v);
            let img = new Image();
            img.src = this.config.iconURLBase + iconIDs[i] + ".png";
            icons.push(img);
        };

        const datasets = []
        datasets.push({
            label: 'Minimum Temparature',
            backgroundColor: this.config.backgroundColor,
            borderColor: this.config.color,
            pointBackgroundColor: this.config.color,
            datalabels: {
                color: this.config.color,
                align: 'top'
            },
            data: minTemps,
            yAxisID: "y1"
        });
        datasets.push({
            label: 'Maximum Temparature',
            backgroundColor: this.config.backgroundColor,
            borderColor: this.config.color,
            pointBackgroundColor: this.config.color,
            datalabels: {
                color: this.config.color,
                align: 'top'
            },
            data: maxTemps,
            yAxisID: "y1"
        });
        if (this.config.showIcon) {
            datasets.push({
                label: 'Icons',
                backgroundColor: this.config.backgroundColor,
                borderColor: this.config.backgroundColor,
                data: iconLine,
                pointStyle: icons,
                datalabels: {
                    display: false
                },
                yAxisID: "y1"
            })
        };
        if (this.config.showRain) {
            datasets.push({
                label: 'Rain Volume (mm)',
                backgroundColor: this.config.fillColor,
                borderColor: this.config.color,
                borderWidth: 1,
                pointBackgroundColor: this.config.color,
                datalabels: {
                    color: this.config.color,
                    align: 'top'
                },
                data: rains,
                yAxisID: "y2"
            })
        };


        // Set Y-Axis range not to overlap each other
        let y1_max = iconLine[0] + (maxValue - minValue) * 0.1,
            y1_min = minValue - (maxValue - minValue) * 0.2,
            y2_max = Math.max(maxRain * 2.5, 0.1),
            y2_min = 0;
        if (this.config.showRain) {
            y1_min = y1_min - (maxValue - minValue);
        };
        const ranges = {
            "y1": {
                "min": y1_min,
                "max": y1_max
            },
            "y2": {
                "min": y2_min,
                "max": y2_max
            }
        };

        return { labels: labels, datasets: datasets, ranges: ranges }
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
            Chart.defaults.global.defaultColor = this.config.color
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
                                id: "y1",
                                position: "left",
                                display: false,
                                ticks: {
                                    min: dataset.ranges.y1.min,
                                    max: dataset.ranges.y1.max
                                }
                            },
                            {
                                id: "y2",
                                position: "right",
                                display: false,
                                ticks: {
                                    min: dataset.ranges.y2.min,
                                    max: dataset.ranges.y2.max
                                }
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
