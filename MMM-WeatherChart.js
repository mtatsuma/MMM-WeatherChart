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
        chartjsVersion: "3.9.1",
        chartjsDatalabelsVersion: "2.2.0",
        height: "300px",
        width: "500px",
        fontSize: 16,
        fontWeight: "normal",
        dataNum: 24,
        timeOffsetHours: 0,
        title: "Weather Forecast",
        iconURLBase: "https://openweathermap.org/img/wn/",
        dataType: "hourly",
        nightBorderDash: [5, 1],
        pressureBorderDash: [5, 1],
        showIcon: false,
        showPressure: false,
        showRain: false,
        showZeroRain: true,
        rainUnit: "mm",
        rainMinHeight: 0.01,
        includeSnow: false,
        showSnow: false,
        showZeroSnow: true,
        color: "rgba(255, 255, 255, 1)",
        colorMin: "rgba(255, 255, 255, 1)",
        colorMax: "rgba(255, 255, 255, 1)",
        colorRain: "rgba(255, 255, 255, 1)",
        colorSnow: "rgba(255, 255, 255, 1)",
        colorPressure: "rgba(255, 255, 255, 1)",
        backgroundColor: "rgba(0, 0, 0, 0)",
        fillColor: "rgba(255, 255, 255, 0.1)",
        dailyLabel: "date",
        hourFormat: "24h",
        curveTension: 0.4,
        datalabelsDisplay: "auto",
        datalabelsOffset: 4,
        datalabelsRoundDecimalPlace: 1,
        largeOpenWeatherIcon: false,
    },

    requiresVersion: "2.15.0",

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

        var url =
            this.config.apiBase +
            this.config.apiVersion +
            "/" +
            this.config.apiEndpoint +
            this.getParams();
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
                Log.error(msg);
            });
        if (retry) {
            self.scheduleUpdate(self.loaded ? -1 : self.config.retryDelay);
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

    getDayString: function (dateTime) {
        return dateTime
            .toLocaleString(moment.locale(), { weekday: "short" })
            .substring(0, 2);
    },

    getHourString: function (hour) {
        if (this.config.hourFormat == "12h") {
            let ampm = hour < 12 ? "am" : "pm";
            let h = hour % 12;
            h = h ? h : 12;
            return `${h}${ampm}`;
        } else {
            return hour;
        }
    },

    formatRain: function (rain) {
        if (this.config.rainUnit == "inch") {
            return rain / 25.4;
        }
        return rain;
    },

    getIconImage: function (iconId, callback) {
        let self = this;
        let iconImage = new Image();
        if (iconId) {
            if (this.config.largeOpenWeatherIcon) {
                iconImage.src = this.config.iconURLBase + iconId + "@2x.png";
            } else {
                iconImage.src = this.config.iconURLBase + iconId + ".png";
            }
        }
        return iconImage;
    },

    // Get min value from arrays including NaN value
    getMin: function (array) {
        let min;
        for (let i = 0, l = array.length; i < l; i++) {
            let n = array[i];
            if (!isNaN(n)) {
                if (min) {
                    min = Math.min(min, n);
                } else {
                    min = n;
                }
            }
        }
        return min;
    },

    // Get max value from arrays including NaN value
    getMax: function (array) {
        let max;
        for (let i = 0, l = array.length; i < l; i++) {
            let n = array[i];
            if (!isNaN(n)) {
                if (max) {
                    max = Math.max(max, n);
                } else {
                    max = n;
                }
            }
        }
        return max;
    },

    getPressureValue(hPa) {
        if (this.config.units == "imperial") {
            return hPa * 0.029529983071445; // return value as inHg
        } else {
            return hPa;
        }
    },

    // Calculate MarginFactors from the simultanious equations
    //
    // x = iconSize/2 * ((1 + x + y + z)/h)
    // y = (dataLabelOffset + fontSize + iconSize) * ((1 + x + y + z)/h)
    // z = (dataLabelOffset * 2 + fontSize * a) * ((1 + x + y + z)/h)
    //
    // where
    // x is the margin on the top of Weather icons,
    // y is the margin on the below of Weather icons,
    // z is the margin between temperature and rain lines,
    // a is 2 when dataType is hourly and show rain or snow,
    // a is 2.5 when dataType is daily and show rain or snow,
    // a is 1 when rain or snow is not shown.
    getTempRainMarginFactor: function (showRain = true, iconSize = 50) {
        // Calculate z
        const h = parseInt(this.config.height);
        let c1 = iconSize / 2.0;
        c1 = c1 / (h - iconSize);
        let c2 = this.config.datalabelsOffset + this.config.fontSize + iconSize;
        c2 = c1 + c2;
        c2 = c2 / (h - c2);
        let c3;
        let a;
        if (showRain) {
            if (this.config.dataType == "hourly") {
                a = 2;
            } else {
                a = 2.5;
            }
        } else {
            a = 1;
        }
        c3 = this.config.datalabelsOffset * 2 + this.config.fontSize * a;
        let z = (c3 * (1 + c1 + c2 * c1 + c2)) / (h - (c2 + c2 * c3 + c3 + 1));
        if (z < 0) z = 0;
        if (showRain) z = z * 2;
        return z;
    },

    getIconBelowMarginFactor: function (
        z = this.getTempRainMarginFactor(),
        showRain = true,
        iconSize = 50
    ) {
        // Calculate y
        const h = parseInt(this.config.height);
        let c1 = iconSize / 2.0;
        c1 = c1 / (h - iconSize);
        let c2 = this.config.datalabelsOffset + this.config.fontSize + iconSize;
        c2 = c1 + c2;
        c2 = c2 / (h - c2);
        let y = c2 * (1 + z / 2.0);
        if (y < 0) y = 0;
        if (showRain) y = y * 2;
        return y;
    },

    getIconTopMarginFactor: function (
        y = this.getIconBelowMarginFactor(),
        z = this.getTempRainMarginFactor(),
        showRain = true,
        iconSize = 50
    ) {
        // Calculate x
        const h = parseInt(this.config.height);
        let c1 = iconSize / 2.0;
        c1 = c1 / (h - iconSize);
        let x = c1 * (1 + (y + z) / 2.0);
        if (x < 0) x = 0;
        if (showRain) x = x * 2;
        return x;
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
        const self = this;
        const data = this.weatherdata.hourly;

        const temps = [],
            rains = [],
            snows = [],
            dayTemps = [],
            nightTemps = [],
            labels = [],
            iconIDs = [],
            pressures = [];

        data.sort(function (a, b) {
            if (a.dt < b.dt) return -1;
            if (a.dt > b.dt) return 1;
            return 0;
        });
        let dayTime;
        for (let i = 0; i < Math.min(this.config.dataNum, data.length); i++) {
            pressures.push(this.getPressureValue(data[i].pressure));

            let dateTime = new Date(
                data[i].dt * 1000 + this.config.timeOffsetHours * 60 * 60 * 1000
            );
            let iconID = data[i].weather[0].icon;
            let temp = data[i].temp;
            if (i === 0) {
                dayTime = Boolean(iconID.match(/d$/));
            }
            labels.push(this.getHourString(dateTime.getHours()));
            if (iconID.match(/d$/)) {
                dayTemps.push(temp);
                if (!dayTime) {
                    nightTemps.push(temp);
                } else {
                    nightTemps.push(NaN);
                }
                dayTime = true;
            }
            if (iconID.match(/n$/)) {
                nightTemps.push(temp);
                if (dayTime) {
                    dayTemps.push(temp);
                } else {
                    dayTemps.push(NaN);
                }
                dayTime = false;
            }
            temps.push(temp);
            if (data[i].rain) {
                if (data[i].snow && this.config.includeSnow) {
                    rains.push(
                        this.formatRain(data[i].rain["1h"] + data[i].snow["1h"])
                    );
                } else {
                    rains.push(this.formatRain(data[i].rain["1h"]));
                }
            } else {
                if (data[i].snow && this.config.includeSnow) {
                    rains.push(this.formatRain(data[i].snow["1h"]));
                } else {
                    rains.push(0);
                }
            }
            if (data[i].snow) {
                snows.push(this.formatRain(data[i].snow["1h"]));
            } else {
                snows.push(0);
            }
            iconIDs.push(iconID);
        }

        const minTemp = this.getMin(temps),
            maxTemp = this.getMax(temps),
            maxRain = this.getMax(rains),
            maxSnow = this.getMax(snows),
            maxPressure = this.getMax(pressures),
            minPressure = this.getMin(pressures),
            iconLine = [],
            icons = [];

        let showRainSnow = false;
        if (this.config.showRain || this.config.showSnow) {
            if (
                this.config.showZeroRain ||
                maxRain > 0 ||
                this.config.showZeroSnow ||
                maxSnow > 0
            ) {
                showRainSnow = true;
            }
        }
        const tempRainMargin = this.getTempRainMarginFactor(showRainSnow);
        const iconBelowMargin = this.getIconBelowMarginFactor(
            tempRainMargin,
            showRainSnow
        );
        const iconTopMargin = this.getIconTopMarginFactor(
            iconBelowMargin,
            tempRainMargin,
            showRainSnow
        );

        // Create dummy line for icons
        for (let i = 0; i < temps.length; i++) {
            let v = maxTemp + (maxTemp - minTemp) * iconBelowMargin;
            iconLine.push(v);
            icons.push(this.getIconImage(iconIDs[i]));
        }

        const datasets = [];
        datasets.push({
            label: "Day Temparature",
            borderColor: this.config.color,
            pointBackgroundColor: this.config.color,
            datalabels: {
                color: this.config.color,
                align: "top",
                offset: this.config.datalabelsOffset,
                font: {
                    weight: this.config.fontWeight,
                },
                display: this.config.datalabelsDisplay,
                formatter: function (value) {
                    let place = 10 ** self.config.datalabelsRoundDecimalPlace;
                    let label = Math.round(value * place) / place;
                    return label;
                },
            },
            data: dayTemps,
            yAxisID: "y1",
        });
        datasets.push({
            label: "Night Temparature",
            borderColor: this.config.color,
            pointBackgroundColor: this.config.color,
            borderDash: this.config.nightBorderDash,
            datalabels: {
                color: this.config.color,
                align: "top",
                offset: this.config.datalabelsOffset,
                font: {
                    weight: this.config.fontWeight,
                },
                display: this.config.datalabelsDisplay,
                formatter: function (value) {
                    let place = 10 ** self.config.datalabelsRoundDecimalPlace;
                    let label = Math.round(value * place) / place;
                    return label;
                },
            },
            data: nightTemps,
            yAxisID: "y1",
        });
        if (this.config.showPressure) {
            datasets.push({
                label: "Pressure",
                borderColor: this.config.colorPressure,
                pointBackgroundColor: this.config.colorPressure,
                borderDash: this.config.pressureBorderDash,
                datalabels: {
                    color: this.config.color,
                    align: "top",
                    offset: this.config.datalabelsOffset,
                    font: {
                        weight: this.config.fontWeight,
                    },
                    display: this.config.datalabelsDisplay,
                    formatter: function (value) {
                        let place =
                            10 ** self.config.datalabelsRoundDecimalPlace;
                        let label = Math.round(value * place) / place;
                        return label;
                    },
                },
                data: pressures,
                //pointStyle: "star",
                //fill: true,
                yAxisID: "y3",
            });
        }
        if (this.config.showIcon) {
            datasets.push({
                label: "Icons",
                borderWidth: 0,
                data: iconLine,
                pointStyle: icons,
                datalabels: {
                    display: false,
                },
                yAxisID: "y1",
            });
        }
        if (this.config.showRain) {
            if (this.config.showZeroRain || maxRain > 0) {
                datasets.push({
                    label: "Rain Volume",
                    backgroundColor: this.config.fillColor,
                    borderColor: this.config.color,
                    borderWidth: 1,
                    pointBackgroundColor: this.config.color,
                    datalabels: {
                        color: this.config.color,
                        align: "top",
                        offset: this.config.datalabelsOffset,
                        font: {
                            weight: this.config.fontWeight,
                        },
                        display: this.config.datalabelsDisplay,
                        formatter: function (value) {
                            let place =
                                10 ** self.config.datalabelsRoundDecimalPlace;
                            let label = Math.round(value * place) / place;
                            return self.config.showZeroRain || value > 0
                                ? label
                                : "";
                        },
                    },
                    data: rains,
                    fill: true,
                    yAxisID: "y2",
                });
            }
        }
        if (this.config.showSnow) {
            if (this.config.showZeroSnow || maxSnow > 0) {
                datasets.push({
                    label: "Snow Volume",
                    backgroundColor: this.config.fillColor,
                    borderColor: this.config.color,
                    borderWidth: 1,
                    pointBackgroundColor: this.config.color,
                    datalabels: {
                        color: this.config.color,
                        display: this.config.showRain ? false : true,
                        align: "top",
                        offset: this.config.datalabelsOffset,
                        font: {
                            weight: this.config.fontWeight,
                        },
                        display: this.config.datalabelsDisplay,
                        formatter: function (value) {
                            let place =
                                10 ** self.config.datalabelsRoundDecimalPlace;
                            let label = Math.round(value * place) / place;
                            return self.config.showZeroSnow || value > 0
                                ? label
                                : "";
                        },
                    },
                    data: snows,
                    fill: true,
                    pointStyle: "star",
                    pointRadius: function (context) {
                        let value = context.dataset.data[context.dataIndex];
                        return value == 0 ? 3 : 6;
                    },
                    yAxisID: "y2",
                });
            }
        }

        // Set Y-Axis range not to overlap each other
        let y1_max = iconLine[0] + (maxTemp - minTemp) * iconTopMargin,
            y1_min = minTemp - (maxTemp - minTemp) * tempRainMargin,
            y2_max =
                Math.max(maxRain, maxSnow, this.config.rainMinHeight) *
                (2 + iconTopMargin + iconBelowMargin + tempRainMargin),
            y2_min = 0,
            y3_min = minPressure - (maxPressure - minPressure) * 0.1,
            y3_max =
                maxPressure +
                (maxPressure - minPressure) *
                    ((iconTopMargin + iconBelowMargin) / 2);

        if (showRainSnow) y1_min = y1_min - (maxTemp - minTemp);
        const ranges = {
            y1: {
                min: y1_min,
                max: y1_max,
            },
            y2: {
                min: y2_min,
                max: y2_max,
            },
            y3: {
                min: y3_min,
                max: y3_max,
            },
        };

        return { labels: labels, datasets: datasets, ranges: ranges };
    },

    getDailyDataset: function () {
        const self = this;
        const data = this.weatherdata.daily;

        const maxTemps = [],
            minTemps = [],
            rains = [],
            snows = [],
            labels = [],
            iconIDs = [],
            pressures = [];

        data.sort(function (a, b) {
            if (a.dt < b.dt) return -1;
            if (a.dt > b.dt) return 1;
            return 0;
        });
        for (let i = 0; i < Math.min(this.config.dataNum, data.length); i++) {
            pressures.push(this.getPressureValue(data[i].pressure));

            const dateTime = new Date(
                data[i].dt * 1000 + this.config.timeOffsetHours * 60 * 60 * 1000
            );
            if (this.config.dailyLabel == "date") {
                labels.push(dateTime.getDate());
            } else if (this.config.dailyLabel == "days_of_week") {
                labels.push(this.getDayString(dateTime));
            } else if (this.config.dailyLabel == "date+days_of_week") {
                labels.push(
                    this.getDayString(dateTime) + " " + dateTime.getDate()
                );
            }
            maxTemps.push(data[i].temp.max);
            minTemps.push(data[i].temp.min);
            if (data[i].rain) {
                if (data[i].snow && this.config.includeSnow) {
                    rains.push(this.formatRain(data[i].rain + data[i].snow));
                } else {
                    rains.push(this.formatRain(data[i].rain));
                }
            } else {
                if (data[i].snow && this.config.includeSnow) {
                    rains.push(this.formatRain(data[i].snow));
                } else {
                    rains.push(0);
                }
            }
            if (data[i].snow) {
                snows.push(this.formatRain(data[i].snow));
            } else {
                snows.push(0);
            }
            iconIDs.push(data[i].weather[0].icon);
        }

        const minValue = this.getMin(minTemps),
            maxValue = this.getMax(maxTemps),
            maxRain = this.getMax(rains),
            maxSnow = this.getMax(snows),
            iconLine = [],
            icons = [];

        let showRainSnow = false;
        if (this.config.showRain || this.config.showSnow) {
            if (
                this.config.showZeroRain ||
                maxRain > 0 ||
                this.config.showZeroSnow ||
                maxSnow > 0
            ) {
                showRainSnow = true;
            }
        }
        const tempRainMargin = this.getTempRainMarginFactor(showRainSnow);
        const iconBelowMargin = this.getIconBelowMarginFactor(
            tempRainMargin,
            showRainSnow
        );
        const iconTopMargin = this.getIconTopMarginFactor(
            iconBelowMargin,
            tempRainMargin,
            showRainSnow
        );

        // Create dummy line for icons
        for (let i = 0; i < minTemps.length; i++) {
            let v = maxValue + (maxValue - minValue) * iconBelowMargin;
            iconLine.push(v);
            icons.push(this.getIconImage(iconIDs[i]));
        }

        const datasets = [];
        datasets.push({
            label: "Minimum Temperature",
            borderColor: this.config.colorMin,
            pointBackgroundColor: this.config.colorMin,
            datalabels: {
                color: this.config.color,
                align: "bottom",
                offset: this.config.datalabelsOffset,
                font: {
                    weight: this.config.fontWeight,
                },
                display: this.config.datalabelsDisplay,
                formatter: function (value) {
                    let place = 10 ** self.config.datalabelsRoundDecimalPlace;
                    let label = Math.round(value * place) / place;
                    return label;
                },
            },
            data: minTemps,
            yAxisID: "y1",
        });
        datasets.push({
            label: "Maximum Temperature",
            borderColor: this.config.colorMax,
            pointBackgroundColor: this.config.colorMax,
            datalabels: {
                color: this.config.color,
                align: "top",
                offset: this.config.datalabelsOffset,
                font: {
                    weight: this.config.fontWeight,
                },
                display: this.config.datalabelsDisplay,
                formatter: function (value) {
                    let place = 10 ** self.config.datalabelsRoundDecimalPlace;
                    let label = Math.round(value * place) / place;
                    return label;
                },
            },
            data: maxTemps,
            yAxisID: "y1",
        });
        if (this.config.showPressure) {
            datasets.push({
                label: "Pressure",
                borderColor: this.config.colorPressure,
                pointBackgroundColor: this.config.colorPressure,
                borderDash: this.config.pressureBorderDash,
                datalabels: {
                    color: this.config.colorPressure,
                    align: "top",
                    offset: this.config.datalabelsOffset,
                    font: {
                        weight: this.config.fontWeight,
                    },
                    display: this.config.datalabelsDisplay,
                    formatter: function (value) {
                        let place =
                            10 ** self.config.datalabelsRoundDecimalPlace;
                        let label = Math.round(value * place) / place;
                        return label;
                    },
                },
                data: pressures,
                yAxisID: "y3",
            });
        }
        if (this.config.showIcon) {
            datasets.push({
                label: "Icons",
                borderWidth: 0,
                data: iconLine,
                pointStyle: icons,
                datalabels: {
                    display: false,
                },
                yAxisID: "y1",
            });
        }
        if (this.config.showRain) {
            if (this.config.showZeroRain || maxRain > 0) {
                datasets.push({
                    label: "Rain Volume",
                    backgroundColor: this.config.fillColor,
                    borderColor: this.config.colorRain,
                    borderWidth: 1,
                    pointBackgroundColor: this.config.colorRain,
                    datalabels: {
                        color: this.config.color,
                        align: "top",
                        offset: this.config.datalabelsOffset,
                        font: {
                            weight: this.config.fontWeight,
                        },
                        display: this.config.datalabelsDisplay,
                        formatter: function (value) {
                            let place =
                                10 ** self.config.datalabelsRoundDecimalPlace;
                            let label = Math.round(value * place) / place;
                            return self.config.showZeroRain || value > 0
                                ? label
                                : "";
                        },
                    },
                    data: rains,
                    fill: true,
                    yAxisID: "y2",
                });
            }
        }
        if (this.config.showSnow) {
            if (this.config.showZeroSnow || maxSnow > 0) {
                datasets.push({
                    label: "Snow Volume",
                    backgroundColor: this.config.fillColor,
                    borderColor: this.config.colorSnow,
                    borderWidth: 1,
                    pointBackgroundColor: this.config.colorSnow,
                    datalabels: {
                        color: this.config.color,
                        display: this.config.showRain ? false : true,
                        align: "top",
                        offset: this.config.datalabelsOffset,
                        font: {
                            weight: this.config.fontWeight,
                        },
                        display: this.config.datalabelsDisplay,
                        formatter: function (value) {
                            let place =
                                10 ** self.config.datalabelsRoundDecimalPlace;
                            let label = Math.round(value * place) / place;
                            return self.config.showZeroSnow || value > 0
                                ? label
                                : "";
                        },
                    },
                    data: snows,
                    fill: true,
                    pointStyle: "star",
                    pointRadius: function (context) {
                        let value = context.dataset.data[context.dataIndex];
                        return value == 0 ? 3 : 6;
                    },
                    yAxisID: "y2",
                });
            }
        }

        minPressure = this.getMin(pressures);
        maxPressure = this.getMax(pressures);

        // Set Y-Axis range not to overlap each other
        let y1_max = iconLine[0] + (maxValue - minValue) * iconTopMargin,
            y1_min = minValue - (maxValue - minValue) * tempRainMargin,
            y2_max =
                Math.max(maxRain, maxSnow, this.config.rainMinHeight) *
                (2 + (iconTopMargin + iconBelowMargin + tempRainMargin) * 2),
            y2_min = 0,
            y3_min = minPressure - (maxPressure - minPressure) * 0.1,
            y3_max =
                maxPressure +
                (maxPressure - minPressure) *
                    ((iconTopMargin + iconBelowMargin) / 2);

        if (showRainSnow) y1_min = y1_min - (maxValue - minValue);
        const ranges = {
            y1: {
                min: y1_min,
                max: y1_max,
            },
            y2: {
                min: y2_min,
                max: y2_max,
            },
            y3: {
                min: y3_min,
                max: y3_max,
            },
        };

        return { labels: labels, datasets: datasets, ranges: ranges };
    },

    getDom: function () {
        var self = this;

        const wrapper = document.createElement("div");
        wrapper.setAttribute(
            "style",
            "height: " +
                this.config.height +
                "; width: " +
                this.config.width +
                ";"
        );
        if (this.weatherdata) {
            const wrapperCanvas = document.createElement("canvas"),
                ctx = wrapperCanvas.getContext("2d");

            let dataset;
            if (this.config.dataType === "hourly") {
                dataset = this.getHourlyDataset();
            } else if (this.config.dataType == "daily") {
                dataset = this.getDailyDataset();
            }

            Chart.defaults.font.size = this.config.fontSize;
            Chart.defaults.font.weight = this.config.fontWeight;
            Chart.defaults.color = this.config.color;
            Chart.register(ChartDataLabels);

            // Plugin for background color config
            // Refer:
            // https://www.chartjs.org/docs/latest/configuration/canvas-background.html#color
            const plugin = {
                id: "custom_canvas_background_color",
                beforeDraw: (chart) => {
                    const ctx = chart.canvas.getContext("2d");
                    ctx.save();
                    ctx.globalCompositeOperation = "destination-over";
                    ctx.fillStyle = this.config.backgroundColor;
                    ctx.fillRect(0, 0, chart.width, chart.height);
                    ctx.restore();
                },
            };

            if (this.chart) {
                this.chart.destroy();
            }
            this.chart = new Chart(ctx, {
                type: "line",
                data: {
                    labels: dataset.labels,
                    datasets: dataset.datasets,
                },
                plugins: [plugin],
                options: {
                    maintainAspectRatio: false,
                    tension: this.config.curveTension,
                    title: {
                        display: true,
                        text: this.config.title,
                    },
                    plugins: {
                        legend: {
                            display: false,
                        },
                    },
                    scales: {
                        x: {
                            grid: {
                                display: false,
                                borderWidth: 0,
                            },
                            clip: false,
                            offset: true,
                        },
                        y1: {
                            display: false,
                            min: dataset.ranges.y1.min,
                            max: dataset.ranges.y1.max,
                        },
                        y2: {
                            display: false,
                            min: dataset.ranges.y2.min,
                            max: dataset.ranges.y2.max,
                        },
                        y3: {
                            display: false,
                            min: dataset.ranges.y3.min,
                            max: dataset.ranges.y3.max,
                        },
                    },
                    animation: { duration: 500 },
                },
            });
            this.chart.update();
            wrapper.appendChild(wrapperCanvas);
        }

        // Data from helper
        if (this.dataNotification) {
            var wrapperDataNotification = document.createElement("div");
            // translations  + datanotification
            wrapperDataNotification.innerHTML =
                "Updated at " + this.dataNotification.date;

            wrapper.appendChild(wrapperDataNotification);
        }
        return wrapper;
    },

    getScripts: function () {
        // Load chart.js from CDN
        let chartjsFileName = "chart.min.js";
        if (Number(this.config.chartjsVersion.split(".")[0]) < 3) {
            chartjsFileName = "Chart.min.js";
        }
        return [
            "https://cdn.jsdelivr.net/npm/chart.js@" +
                this.config.chartjsVersion +
                "/dist/" +
                chartjsFileName,
            "https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@" +
                this.config.chartjsDatalabelsVersion +
                "/dist/chartjs-plugin-datalabels.min.js",
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
        if (this.loaded === false) {
            self.updateDom(self.config.animationSpeed);
        }
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
