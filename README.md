# MMM-WeatherChart

Hourly Forecast (temparature and weather icons)

![image](https://user-images.githubusercontent.com/48573325/93776105-2a98be00-fc5e-11ea-9476-77ff54cbd1af.png)

Daily Forecast (max and min temparature and weather icons)

![image](https://user-images.githubusercontent.com/48573325/93776263-5ae05c80-fc5e-11ea-82f3-c05056284ddb.png)

MagicMirror module for displaying weather forecasts from [OpenWeather](https://openweathermap.org/). Weather forecasts are diplayed by using [Chart.js](https://www.chartjs.org/), an open-source free library for drawing graph.

This module can work with free OpenWeather API, which only requires to sign up and get an API key.

## Installation

Clone this repository and place it on MagicMirror module directory.

```
$ cd ~/MagicMirror/modules
$ git clone https://github.com/mtatsuma/MMM-WeatherChart.git
```

## Configuration

### Configuration Exmaple
```
   modules: [
        {
            "module": "MMM-WeatherChart",
            "position": "top_right",
            "config": {
                "apiKey": "xxxx",
                "dataNum": 12,
                "dataType": "hourly",
                "height": "500px",
                "width": "800px"
                "lat": 35.571337,
                "lon": 139.633989,
                "units": "metric",
            }
        }
   ]
```

### Configuration Options

| Options | Required | Default | Description |
|:--------|:--------:|:--------|:------------|
| updateInterval | | `10 * 60 * 1000` | Weather data update interval (miliseconds) |
| retryDelay | | `5 * 1000` | Delay for retry to get weather data (miliseconds) |
| apiBase | | `https://api.openweathermap.org/data/` | Base URL of [OpenWeather](https://openweathermap.org/) API |
| apiVersion | | `2.5` | Version of [OpenWeather](https://openweathermap.org/) API |
| apiEndpoint | | `onecall` | [OpenWeather](https://openweathermap.org/) API endpoint. [One Call API](https://openweathermap.org/api/one-call-api) is used by default, which is available for Free subscription. Note: Don't change this option because other endpoint is not supported! |
| apiKey | yes | | API key to call [OpenWeather](https://openweathermap.org/) API. You can get the API key by signing up [OpenWeather](https://openweathermap.org/). |
| lat | yes | | longitude of the place you want to get weather information |
| lon | yes | | latitude of the place you want to get weather information |
| units | | `standard` | Units of measurement documented in [OpenWeather API document](https://openweathermap.org/api/one-call-api). `standard`, `metric` and `imperial` units are available. |
| chartjsVersion | | `2.9.3` | Version of [Chart.js](https://www.chartjs.org/) |
| chartjsDatalablesVersion | | `0.7.0` | Version of Chart.js [Datalabels plugin](https://github.com/chartjs/chartjs-plugin-datalabels) |
| height | | `300px` | Height of the chart area |
| width | | `500px` | Width of the chart area |
| fontSize | | `16` | Font size of characters in the chart |
| timeOffsetHours | | `0` | Offset in hours. This is used when your timezone is different from the timezone set in MagicMirror server. |
| title | | `Weather Forecast` | Title of the chart to display |
| iconURLBase | | `https://openweathermap.org/img/wn/` | Base URL to get weather icons. By default, icons provided from OpenWeather is used. If you want to use your own icons, you must prepare icon image files whose name is the `<icon ID>.png`. The icon ID is documented in [Weather conditions](https://openweathermap.org/weather-conditions#How-to-get-icon-URL) |
| dataType | | `hourly` | Data type to display. `hourly` or `daily` is available. |
| dataNum | | `24` | Number of data to display. When you set this value as larger than the maximum number of data returned from [OpenWeather API document](https://openweathermap.org/api/one-call-api) API, the number of data is automatically set as the maximum number of data from [OpenWeather API document](https://openweathermap.org/api/one-call-api) API. |
