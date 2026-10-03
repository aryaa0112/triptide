const state = {
  city: "London",
  lat: 51.5072,
  lon: -0.1276,
  forecast: null,
  aiBriefRequestId: 0,
  aiQuestionRequestId: 0,
};

const elements = {
  cityName: document.getElementById("cityName"),
  dateText: document.getElementById("dateText"),
  weatherIcon: document.getElementById("weatherIcon"),
  currentTemp: document.getElementById("currentTemp"),
  currentDesc: document.getElementById("currentDesc"),
  feelsLike: document.getElementById("feelsLike"),
  humidity: document.getElementById("humidity"),
  wind: document.getElementById("wind"),
  rainChance: document.getElementById("rainChance"),
  forecastList: document.getElementById("forecastList"),
  statusMessage: document.getElementById("statusMessage"),
  searchForm: document.getElementById("searchForm"),
  cityInput: document.getElementById("cityInput"),
  locateBtn: document.getElementById("locateBtn"),
  activitySelect: document.getElementById("activitySelect"),
  durationSelect: document.getElementById("durationSelect"),
  plannerStatus: document.getElementById("plannerStatus"),
  plannerList: document.getElementById("plannerList"),
  aiBrief: document.getElementById("aiBrief"),
  aiBriefButton: document.getElementById("aiBriefButton"),
  aiBriefStatus: document.getElementById("aiBriefStatus"),
  aiBriefResult: document.getElementById("aiBriefResult"),
  aiQuestionForm: document.getElementById("aiQuestionForm"),
  aiQuestionInput: document.getElementById("aiQuestionInput"),
  aiQuestionButton: document.getElementById("aiQuestionButton"),
  aiQuestionStatus: document.getElementById("aiQuestionStatus"),
  planAdvice: document.getElementById("planAdvice"),
};

function setStatus(message, isError = false) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.style.color = isError ? "#b84d32" : "";
}

function formatDate(timestamp) {
  const date = typeof timestamp === "string" && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)
    ? new Date(`${timestamp}T12:00:00Z`)
    : new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(typeof timestamp === "string" && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)
      ? { timeZone: "UTC" }
      : {}),
  });
}

function getWeatherEmoji(code) {
  if (code === 0) return "☀️";
  if (code <= 3) return "🌤️";
  if (code <= 48) return "☁️";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄️";
  if ([95, 96, 99].includes(code)) return "⛈️";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
  return "🌤️";
}

function getDescription(code) {
  const map = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow",
    73: "Moderate snow",
    75: "Heavy snow",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with hail",
    99: "Thunderstorm with hail",
    85: "Slight snow showers",
    86: "Heavy snow showers",
  };
  return map[code] || "Weather update";
}

const activityProfiles = {
  walk: {
    label: "city exploring",
    minTemp: 10,
    maxTemp: 27,
    maxWind: 30,
    rainWeight: 1.2,
    coldTip: "Pack a light layer for cooler sightseeing days.",
    rainTip: "Keep a compact umbrella handy for exploring.",
  },
  cycling: {
    label: "active outdoors",
    minTemp: 10,
    maxTemp: 25,
    maxWind: 20,
    rainWeight: 1.6,
    coldTip: "A light layer may help on cooler adventure days.",
    rainTip: "Plan a flexible route in case of wet weather.",
  },
  picnic: {
    label: "slow, sunny getaways",
    minTemp: 18,
    maxTemp: 29,
    maxWind: 18,
    rainWeight: 1.8,
    coldTip: "Pack a warm layer for cooler, slower days.",
    rainTip: "Save a sheltered café or indoor stop as a backup.",
  },
};

function scoreHour(hour, profile) {
  let score = 100;
  const temperature = hour.apparent_temperature;
  const rainChance = hour.precipitation_probability;
  const wind = hour.wind_speed_10m;

  if (temperature < profile.minTemp) {
    score -= (profile.minTemp - temperature) * 4;
  } else if (temperature > profile.maxTemp) {
    score -= (temperature - profile.maxTemp) * 4;
  }

  score -= rainChance * profile.rainWeight;
  score -= Math.max(0, wind - profile.maxWind) * 1.5;

  if (hour.weather_code >= 95) {
    score -= 60;
  } else if (
    (hour.weather_code >= 51 && hour.weather_code <= 77)
    || (hour.weather_code >= 80 && hour.weather_code <= 86)
  ) {
    score -= 20;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getTemperatureDistance(temperature, profile) {
  if (temperature < profile.minTemp) return profile.minTemp - temperature;
  if (temperature > profile.maxTemp) return temperature - profile.maxTemp;
  return 0;
}

function getTripReason(trip, topTrip, rank, profile) {
  const preferredTemperature = `${profile.minTemp}–${profile.maxTemp}°C`;
  if (rank === 0) {
    return `Highest whole-trip score. Daytime feels-like averages ${trip.averageTemp}°C (preferred ${preferredTemperature}), peak rain is ${trip.maxRain}%, and even its weakest day scores ${trip.worstDay}/100.`;
  }

  const scoreGap = topTrip.score - trip.score;
  if (scoreGap === 0 && trip.worstDay === topTrip.worstDay) {
    if (trip.maxRain !== topTrip.maxRain) {
      return `Tied with the top pick on average and weakest-day scores. It ranks lower because peak rain is ${trip.maxRain}% versus ${topTrip.maxRain}%.`;
    }
    const temperatureGap =
      getTemperatureDistance(trip.averageTemp, profile)
      - getTemperatureDistance(topTrip.averageTemp, profile);
    if (temperatureGap > 0) {
      return `Tied on average and weakest-day scores, but daytime feels-like is farther from your preferred ${preferredTemperature} range.`;
    }
    if (trip.maxWind !== topTrip.maxWind) {
      return `Tied on average and weakest-day scores. Daytime wind peaks at ${Math.round(trip.maxWind)} km/h versus ${Math.round(topTrip.maxWind)} km/h for the top pick.`;
    }
    return "It ties the top pick on the planner's main comfort scores; the forecast indicators are very similar.";
  }

  const scoreExplanation = scoreGap === 0
    ? `It matches the top pick's ${trip.score}/100 average, but its weakest day scores ${trip.worstDay}/100 versus ${topTrip.worstDay}/100.`
    : `${scoreGap} ${scoreGap === 1 ? "point" : "points"} below the top pick on the whole-trip score.`;
  const rainComparison = trip.maxRain === topTrip.maxRain
    ? `Peak rain chance matches the top pick at ${trip.maxRain}%.`
    : `Peak rain chance is ${trip.maxRain}% versus ${topTrip.maxRain}% for the top pick.`;
  return `${scoreExplanation} Feels-like averages ${trip.averageTemp}°C (preferred ${preferredTemperature}). ${rainComparison} Wind and weather conditions also count.`;
}

function formatForecastDate(date) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function getPlanAdvice(trip, profile, duration) {
  const decision = trip.score >= 75
    ? "This stretch looks promising."
    : trip.score >= 50
      ? "This trip could work with a little flexibility."
      : "You may want to keep a backup date.";
  const tips = [];

  if (trip.averageTemp < profile.minTemp + 3) tips.push(profile.coldTip);
  if (trip.maxRain >= 35) tips.push(profile.rainTip);
  if (trip.maxWind > profile.maxWind) tips.push("Expect some breezier-than-usual days.");
  if (tips.length === 0) tips.push("Conditions look fairly comfortable for this style of trip.");

  return {
    title: `${decision} ${duration} ${duration === 1 ? "day" : "days"} for ${profile.label}.`,
    detail: tips.join(" "),
    tag: trip.score >= 75 ? "GO FOR IT" : trip.score >= 50 ? "PLAN AHEAD" : "STAY FLEXIBLE",
  };
}

function resetAiBrief() {
  state.aiBriefRequestId += 1;
  state.aiQuestionRequestId += 1;
  elements.aiBrief.hidden = true;
  elements.aiBriefButton.disabled = false;
  elements.aiQuestionInput.disabled = false;
  elements.aiQuestionButton.disabled = false;
  elements.aiBriefButton.innerHTML = '<span aria-hidden="true">✦</span> Ask Gemini';
  elements.aiBriefStatus.textContent = "";
  elements.aiBriefStatus.classList.remove("is-error");
  elements.aiBriefResult.replaceChildren();
  elements.aiBriefResult.hidden = true;
  elements.aiQuestionInput.value = "";
  elements.aiQuestionStatus.textContent = "";
  elements.aiQuestionStatus.classList.remove("is-error");
}

function renderAiBrief(decision, confidence, reason) {
  elements.aiBriefResult.replaceChildren();
  const decisionLabel = document.createElement("span");
  decisionLabel.textContent = "Plan";
  const decisionValue = document.createElement("strong");
  decisionValue.className = `ai-brief-decision is-${decision.toLowerCase()}`;
  decisionValue.textContent = decision;
  const confidenceLabel = document.createElement("span");
  confidenceLabel.textContent = "Confidence";
  const confidenceValue = document.createElement("strong");
  confidenceValue.className = "ai-brief-confidence";
  confidenceValue.textContent = `${confidence}%`;
  elements.aiBriefResult.append(
    decisionLabel,
    decisionValue,
    confidenceLabel,
    confidenceValue
  );
  if (decision === "NO") {
    const reasonLabel = document.createElement("span");
    reasonLabel.textContent = "Why not";
    const reasonValue = document.createElement("p");
    reasonValue.className = "ai-brief-reason";
    reasonValue.textContent = reason;
    elements.aiBriefResult.append(reasonLabel, reasonValue);
  }
  elements.aiBriefResult.hidden = false;
}

function getAiTripContext() {
  const profile = activityProfiles[elements.activitySelect.value];
  const duration = Number(elements.durationSelect.value);
  const trips = state.rankedTrips.map((trip, index) => ({
    rank: index + 1,
    startDate: trip.days[0].date,
    endDate: trip.days[trip.days.length - 1].date,
    comfortScore: trip.score,
    weakestDayScore: trip.worstDay,
    averageFeelsLikeC: trip.averageTemp,
    preferredFeelsLikeRangeC: [profile.minTemp, profile.maxTemp],
    maxPrecipitationProbability: trip.maxRain,
    maxDaytimeWindKph: Math.round(trip.maxWind),
    weather: trip.days.map((day) => ({
      date: day.date,
      description: getDescription(day.weatherCode),
      highC: day.maxTemp,
      lowC: day.minTemp,
      precipitationProbability: day.maxRain,
    })),
  }));

  return {
    destination: elements.cityName.textContent,
    currentDate: state.forecast.currentTime.slice(0, 10),
    tripVibe: profile.label,
    durationDays: duration,
    tripOptions: trips,
  };
}

async function requestAiBrief() {
  if (!state.rankedTrips?.length || elements.aiBriefButton.disabled) return;

  const requestId = ++state.aiBriefRequestId;
  elements.aiBriefButton.disabled = true;
  elements.aiBriefButton.textContent = "Checking your plan…";
  elements.aiBriefStatus.textContent = "Gemini is checking the top trip option.";
  elements.aiBriefStatus.classList.remove("is-error");
  elements.aiBriefResult.hidden = true;

  try {
    const response = await fetch("/api/trip-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(getAiTripContext()),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMessage = response.status === 404
        ? "The Gemini endpoint isn't deployed yet. Deploy this project on Vercel to use AI briefs."
        : data.error || "Gemini could not create a trip brief.";
      throw new Error(errorMessage);
    }
    if (
      !["YES", "NO"].includes(data.decision)
      || !Number.isInteger(data.confidence)
      || data.confidence < 0
      || data.confidence > 100
      || typeof data.reason !== "string"
      || !data.reason.trim()
    ) {
      throw new Error("Gemini returned an unreadable trip decision. Please try again.");
    }

    if (requestId !== state.aiBriefRequestId) return;
    renderAiBrief(data.decision, data.confidence, data.reason.trim());
    elements.aiBriefStatus.textContent = "AI confidence estimate · not measured forecast accuracy";
    elements.aiBriefButton.textContent = "Check again";
  } catch (error) {
    if (requestId !== state.aiBriefRequestId) return;
    elements.aiBriefStatus.textContent = error.message;
    elements.aiBriefStatus.classList.add("is-error");
    elements.aiBriefButton.innerHTML = '<span aria-hidden="true">✦</span> Try again';
  } finally {
    if (requestId === state.aiBriefRequestId) elements.aiBriefButton.disabled = false;
  }
}

async function requestAiQuestion(event) {
  event.preventDefault();
  const question = elements.aiQuestionInput.value.trim();
  if (!question || !state.rankedTrips?.length || elements.aiQuestionButton.disabled) return;

  const questionRequestId = ++state.aiQuestionRequestId;
  elements.aiQuestionButton.disabled = true;
  elements.aiQuestionInput.disabled = true;
  elements.aiQuestionButton.textContent = "Asking…";
  elements.aiQuestionStatus.textContent = "Gemini is checking the forecast for an answer.";
  elements.aiQuestionStatus.classList.remove("is-error");

  try {
    const response = await fetch("/api/trip-brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...getAiTripContext(), question }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || "Gemini could not answer that question.");
    }
    if (typeof data.answer !== "string" || !data.answer.trim()) {
      throw new Error("Gemini returned an empty answer. Please try again.");
    }
    if (questionRequestId !== state.aiQuestionRequestId) return;
    elements.aiQuestionStatus.textContent = data.answer.trim();
    elements.aiQuestionInput.value = "";
  } catch (error) {
    if (questionRequestId !== state.aiQuestionRequestId) return;
    elements.aiQuestionStatus.textContent = error.message;
    elements.aiQuestionStatus.classList.add("is-error");
  } finally {
    if (questionRequestId === state.aiQuestionRequestId) {
      elements.aiQuestionButton.disabled = false;
      elements.aiQuestionInput.disabled = false;
      elements.aiQuestionButton.textContent = "Ask";
    }
  }
}

function renderTripPlanner(hourly, daily, currentTime) {
  state.forecast = { hourly, daily, currentTime };
  const profile = activityProfiles[elements.activitySelect.value];
  const duration = Number(elements.durationSelect.value);
  const hourlyFields = [
    hourly?.time,
    hourly?.apparent_temperature,
    hourly?.precipitation_probability,
    hourly?.wind_speed_10m,
    hourly?.weather_code,
  ];

  if (
    !hourlyFields[0]?.length
    || hourlyFields.some(
      (values) => !Array.isArray(values) || values.length !== hourlyFields[0].length
    )
  ) {
    elements.plannerStatus.textContent = "Hourly forecast is unavailable for this destination.";
    elements.plannerList.replaceChildren();
    resetAiBrief();
    elements.planAdvice.hidden = true;
    return;
  }

  const dailyFields = [
    daily?.time,
    daily?.weather_code,
    daily?.temperature_2m_min,
    daily?.temperature_2m_max,
    daily?.precipitation_probability_max,
  ];
  if (
    dailyFields.some((values) => !Array.isArray(values) || values.length !== dailyFields[0]?.length)
    || !dailyFields[0]?.length
  ) {
    elements.plannerStatus.textContent = "Daily forecast data is incomplete for this destination.";
    elements.plannerList.replaceChildren();
    resetAiBrief();
    elements.planAdvice.hidden = true;
    return;
  }

  const hourlyByDate = new Map();
  const today = currentTime.slice(0, 10);
  hourly.time.forEach((time, index) => {
    const hour = Number(time.slice(11, 13));
    if (hour < 7 || hour >= 20) return;
    const values = {
      apparent_temperature: hourly.apparent_temperature[index],
      precipitation_probability: hourly.precipitation_probability[index],
      wind_speed_10m: hourly.wind_speed_10m[index],
      weather_code: hourly.weather_code[index],
    };
    if (Object.values(values).some((value) => !Number.isFinite(value))) return;
    const date = time.slice(0, 10);
    if (!hourlyByDate.has(date)) hourlyByDate.set(date, []);
    hourlyByDate.get(date).push(values);
  });

  const days = daily.time.map((date, index) => {
    const hours = hourlyByDate.get(date) || [];
    const minTemp = daily.temperature_2m_min[index];
    const maxTemp = daily.temperature_2m_max[index];
    const maxRain = daily.precipitation_probability_max[index];
    const weatherCode = daily.weather_code[index];
    if (
      hours.length < 10
      || [minTemp, maxTemp, maxRain, weatherCode].some((value) => !Number.isFinite(value))
    ) return null;
    const score = Math.round(
      hours.reduce((total, hour) => total + scoreHour(hour, profile), 0) / hours.length
    );
    return {
      date,
      score,
      averageTemp: Math.round(
        hours.reduce((total, hour) => total + hour.apparent_temperature, 0) / hours.length
      ),
      minTemp: Math.round(minTemp),
      maxTemp: Math.round(maxTemp),
      maxRain: Math.round(maxRain),
      maxWind: Math.max(...hours.map((hour) => hour.wind_speed_10m)),
      weatherCode,
    };
  });

  const firstDeparture = daily.time.findIndex((date) => date > today);
  const forecastDays = [];
  for (let index = firstDeparture; index >= 0 && index < days.length; index += 1) {
    if (!days[index]) break;
    forecastDays.push(days[index]);
  }
  const trips = [];
  for (let index = 0; index + duration <= forecastDays.length; index += 1) {
    const tripDays = forecastDays.slice(index, index + duration);
    if (tripDays.length !== duration) continue;
    trips.push({
      days: tripDays,
      score: Math.round(tripDays.reduce((total, day) => total + day.score, 0) / duration),
      worstDay: Math.min(...tripDays.map((day) => day.score)),
      averageTemp: Math.round(
        tripDays.reduce((total, day) => total + day.averageTemp, 0) / duration
      ),
      minTemp: Math.min(...tripDays.map((day) => day.minTemp)),
      maxTemp: Math.max(...tripDays.map((day) => day.maxTemp)),
      maxRain: Math.max(...tripDays.map((day) => day.maxRain)),
      maxWind: Math.max(...tripDays.map((day) => day.maxWind)),
    });
  }

  if (trips.length === 0) {
    elements.plannerStatus.textContent =
      `There aren't ${duration} complete forecast days left to compare. Try a shorter trip.`;
    elements.plannerList.replaceChildren();
    resetAiBrief();
    elements.planAdvice.hidden = true;
    return;
  }

  trips.sort((a, b) =>
    b.score - a.score
    || b.worstDay - a.worstDay
    || a.maxRain - b.maxRain
    || getTemperatureDistance(a.averageTemp, profile) - getTemperatureDistance(b.averageTemp, profile)
    || a.maxWind - b.maxWind
  );
  const bestTrips = trips.slice(0, 3);
  state.rankedTrips = bestTrips;
  resetAiBrief();
  elements.aiBrief.hidden = false;
  const firstDate = forecastDays[0].date;
  const lastDate = forecastDays[forecastDays.length - duration].date;
  elements.plannerStatus.textContent =
    `${trips.length} possible ${duration}-day ${trips.length === 1 ? "trip" : "trips"} · departure dates ${formatForecastDate(firstDate)}–${formatForecastDate(lastDate)} · local forecast`;
  const advice = getPlanAdvice(bestTrips[0], profile, duration);
  elements.planAdvice.innerHTML = `
    <p><strong>${advice.title}</strong>${advice.detail}</p>
    <p class="advice-tag">${advice.tag}</p>
  `;
  elements.planAdvice.hidden = false;
  elements.plannerList.innerHTML = bestTrips.map((trip, index) => {
    const start = trip.days[0];
    const end = trip.days[trip.days.length - 1];
    const reason = getTripReason(trip, bestTrips[0], index, profile);
    return `
    <article class="planner-window ${index === 0 ? "is-best" : ""}">
      <div class="trip-card-heading">
        <strong>${index === 0 ? "THE ONE TO BEAT" : `OPTION 0${index}`}</strong>
        <span class="trip-rank">${index === 0 ? "TOP PICK" : `#${index + 1}`}</span>
      </div>
      <span class="trip-dates">${formatForecastDate(start.date)}${duration > 1 ? ` – ${formatForecastDate(end.date)}` : ""}</span>
      <span class="trip-duration">${duration}-day trip · ${getWeatherEmoji(start.weatherCode)} ${getDescription(start.weatherCode)}</span>
      <div class="score-line">
        <span class="planner-score">${trip.score} <small>/ 100 COMFORT</small></span>
        <span class="score-track" aria-hidden="true"><span style="width: ${trip.score}%"></span></span>
      </div>
      <span>Feels around ${trip.averageTemp}°C · rain up to ${trip.maxRain}% · temperatures ${trip.minTemp}°–${trip.maxTemp}°C</span>
      <div class="trip-reason">
        <span class="reason-label">${index === 0 ? "WHY IT LEADS" : "THE TRADE-OFF"}</span>
        <p>${reason}</p>
      </div>
    </article>
  `; }).join("");
}

async function fetchWeather(cityName = state.city, coordinates = null) {
  setStatus("Loading weather…");

  try {
    let result;
    if (coordinates) {
      result = { name: cityName, country: "" };
      state.city = cityName;
      state.lat = coordinates.latitude;
      state.lon = coordinates.longitude;
    } else {
      const geoResponse = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`
      );
      if (!geoResponse.ok) throw new Error("City search request failed.");
      const geoData = await geoResponse.json();

      if (!geoData.results?.length) {
        setStatus("City not found. Try another place.", true);
        return;
      }

      result = geoData.results[0];
      state.city = result.name;
      state.lat = result.latitude;
      state.lon = result.longitude;
    }

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${state.lat}&longitude=${state.lon}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature&hourly=apparent_temperature,precipitation_probability,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=16`
    );
    if (!weatherResponse.ok) throw new Error("Weather forecast request failed.");
    const weatherData = await weatherResponse.json();

    if (weatherData.error) {
      throw new Error(weatherData.reason || "Weather service returned an error.");
    }
    renderWeather(weatherData, result);
  } catch (error) {
    console.error(error);
    setStatus("Unable to load weather right now. Please try again later.", true);
  }
}

function renderWeather(weatherData, result) {
  const current = weatherData.current;
  const daily = weatherData.daily;

  elements.cityName.textContent = result.country
    ? `${result.name}, ${result.country}`
    : result.name;
  elements.dateText.textContent = formatDate(Date.now());
  elements.weatherIcon.textContent = getWeatherEmoji(current.weather_code);
  elements.currentTemp.textContent = `${Math.round(current.temperature_2m)}°C`;
  elements.currentDesc.textContent = getDescription(current.weather_code);
  elements.feelsLike.textContent = `${Math.round(current.apparent_temperature)}°C`;
  elements.humidity.textContent = `${Math.round(current.relative_humidity_2m)}%`;
  elements.wind.textContent = `${Math.round(current.wind_speed_10m)} km/h`;
  elements.rainChance.textContent = `${Math.round(daily.precipitation_probability_max[0])}%`;
  renderTripPlanner(weatherData.hourly, daily, current.time);

  const cards = daily.time.slice(0, 5).map((date, index) => {
    const code = daily.weather_code[index];
    const maxTemp = Math.round(daily.temperature_2m_max[index]);
    const minTemp = Math.round(daily.temperature_2m_min[index]);

    return `
      <article class="forecast-item">
        <div class="day">${formatDate(date)}</div>
        <div class="icon">${getWeatherEmoji(code)}</div>
        <div>${getDescription(code)}</div>
        <div>${maxTemp}° / ${minTemp}°</div>
      </article>
    `;
  });

  elements.forecastList.innerHTML = cards.join("");
  setStatus("Weather updated successfully.");
}

async function locateUser() {
  if (!navigator.geolocation) {
    setStatus("Geolocation is not supported on this browser.", true);
    return;
  }

  setStatus("Finding your location…");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      fetchWeather("Your location", { latitude: lat, longitude: lon });
    },
    () => {
      setStatus("Location access was denied. Try a city search instead.", true);
    }
  );
}

elements.searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const query = elements.cityInput.value.trim();
  if (query) {
    fetchWeather(query);
  }
});

elements.locateBtn.addEventListener("click", locateUser);

function updatePlannerPreferences() {
  if (state.forecast) {
    renderTripPlanner(
      state.forecast.hourly,
      state.forecast.daily,
      state.forecast.currentTime
    );
  }
}

elements.activitySelect.addEventListener("change", updatePlannerPreferences);
elements.durationSelect.addEventListener("change", updatePlannerPreferences);
elements.aiBriefButton.addEventListener("click", requestAiBrief);
elements.aiQuestionForm.addEventListener("submit", requestAiQuestion);

fetchWeather();
