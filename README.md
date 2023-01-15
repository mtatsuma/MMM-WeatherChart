# MMM-WeatherChart

Hourly Forecast (temperature, weather icons on the top, rain volume on the bottom)

![image](https://user-images.githubusercontent.com/48573325/94290828-b0d23e80-ff95-11ea-8c32-b9c4b13d2b8a.png)

Daily Forecast (max and min temperature, weather icons on the top, rain volume (include snow) on the bottom)

![image](https://user-images.githubusercontent.com/48573325/102897630-abf52c00-44ab-11eb-9baa-224532511f65.png)

MagicMirror module for displaying weather forecasts from [OpenWeather](https://openweathermap.org/). Weather forecasts are displayed by using [Chart.js](https://www.chartjs.org/), an open-source free library for drawing charts.

This module can work with free OpenWeather API, which only requires to sign up and get an API key.

## Installation

Clone this repository and place it on MagicMirror module directory.

```
$ cd ~/MagicMirror/modules
$ git clone https://github.com/mtatsuma/MMM-WeatherChart.git
```

or if you want to use an old version, clone it with the version.
```
$ cd ~/MagicMirror/modules
$ git clone -b <version> https://github.com/mtatsuma/MMM-WeatherChart.git
```

You can check [available MMM-WeatherChart versions](https://github.com/mtatsuma/MMM-WeatherChart/releases).

## Configuration

### Configuration Example

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
                "width": "800px",
                "lat": 35.571337,
                "lon": 139.633989,
                "units": "metric",
                "showRain": true,
                "includeSnow": true,
                "showSnow": true,
                "showIcon": true
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
| lat | yes | | latitude of the place you want to get weather information |
| lon | yes | | longitude of the place you want to get weather information |
| units | | `standard` | Units of measurement documented in [OpenWeather API document](https://openweathermap.org/api/one-call-api). `standard`, `metric` and `imperial` units are available. |
| chartjsVersion | | `3.4.0` | Version of [Chart.js](https://www.chartjs.org/) |
| chartjsDatalabelsVersion | | `2.0.0` | Version of Chart.js [Datalabels plugin](https://github.com/chartjs/chartjs-plugin-datalabels) |
| height | | `300px` | Height of the chart area in px |
| width | | `500px` | Width of the chart area in px |
| fontSize | | `16` | Font size of characters in the chart |
| fontWeight | | `normal` | Font weight of characters in the chart. See https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight for checking available values. |
| timeOffsetHours | | `0` | Offset in hours. This is used when your timezone is different from the timezone set in MagicMirror server. |
| title | | `Weather Forecast` | Title of the chart to display |
| iconURLBase | | `https://openweathermap.org/img/wn/` | Base URL to get weather icons. By default, icons provided from OpenWeather is used. If you want to use your own icons, you must prepare icon image files whose name is the `<icon ID>.png`. The icon ID is documented in [Weather conditions](https://openweathermap.org/weather-conditions#How-to-get-icon-URL) |
| dataType | | `hourly` | Data type to display. `hourly` or `daily` is available. |
| dataNum | | `24` | Number of data to display. When you set this value as larger than the maximum number of data returned from [OpenWeather API](https://openweathermap.org/api/one-call-api), the number of data is automatically set as the maximum number of data from [OpenWeather API document](https://openweathermap.org/api/one-call-api) API. |
| nightBorderDash | | `[5, 1]` | Style of dash line for nighttime (`[<line length>, <blank length>]`). This option is available only for `hourly` data type. |
| showIcon | | `false` | Show weather Icon on the top |
| showRain | | `false` | Show rain volume on the bottom |
| showZeroRain | | `true` | Show rain chart even when there is no rain volume. This option is effective only when `showRain` is true. |
| rainUnit | | `mm` | Unit of rain volume (`mm` or `inch`) |
| rainMinHeight | | `0.01` | Minimum height (in mm or inch) of the rain volume chart. When the max rain volume in the chart is less than this value, the height of chart is set as this value. Otherwise, the height of the chart is set acoording to the max rain volume. |
| includeSnow | | `false` | If true, snow volume is included in the rain volume chart and the chart means rain + snow volume (i.e. precipitation). |
| showSnow | | `false` | Show snow volume line in the rain volume chart. If you enable both of showRain and showSnow, datalabels for snow volume is not appeared because those can overlap with the rain volume datalabels. |
| showZeroSnow | | `true` | Show snow chart even when there is no snow volume. This option is effective only when `showSnow` is true. |
| color | | `rgba(255, 255, 255, 1)` | Color of line and letters |
| colorMin | | `rgba(255, 255, 255, 1)` | Color of the minimum temperature line e.g. yellow |
| colorMax | | `rgba(255, 255, 255, 1)` | Color of the maximum temperature line e.g. orange |
| colorRain | | `rgba(255, 255, 255, 1)` | Color of the rain line e.g. blue |
| colorSnow | | `rgba(255, 255, 255, 1)` | Color of the snow line |
| backgroundColor | | `rgba(0, 0, 0, 0)` | Color of background |
| fillColor | | `rgba(255, 255, 255, 0.1)` | Color for filling rain volume line |
| dailyLabel | | `date` | Label of x-axis for the daily forecast chart. The available labels are `date` or `days_of_week` or `date+days_of_week` |
| hourFormat | | `24h` | Hour label format for hourly forecast charts (`24h` or `12h`). If it's `24h`, the format is [0, 1, 2, ..., 22, 23]. If it's `12h`, the format is [12am, 1am, 2am, ..., 10pm, 11pm]. |
| curveTension | | `0.4` | Tension of line chart in Chart.js. See https://www.chartjs.org/docs/latest/charts/line.html#line-styling for details. |
| datalabelsDisplay | | `auto` | Visibility of data labels. See https://chartjs-plugin-datalabels.netlify.app/guide/positioning.html#visibility for details. 
| datalabelsOffset | | `4` | Offset of data labels. See https://chartjs-plugin-datalabels.netlify.app/guide/positioning.html#alignment-and-offset for details.
| datalabelsRoundDecimalPlace | | `1` | Decimal place to which round for data labels on charts. When you set this option as `0`, the labels are rounded to integer. This option is affected only on the labels (not affected on the data values). |
| largeOpenWeatherIcon | | `false` | `true` or `false`. Weather Icons from OpenWeather becomes 2 times larger (100 x 100) if true. |
| showPressure | | `false` | `true` or `false`. Toggles display of pressure values. Notes if units is 'imperial', will display in inHg |
| colorPressure | | `rgba(255, 255, 225, 1)` | Color of the pressure line, if shown |
|pressureBorderDash | | `[5, 1]` | Style of dash line for pressure (`[<line length>, <blank length>]`). This option is available only for `hourly` data type. |
