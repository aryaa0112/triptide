# TripTide — Find Your Forecast Window

TripTide is a travel-weather planner built with HTML, CSS, and JavaScript. Choose a destination, a trip vibe, and a duration in days; TripTide compares consecutive departure-date options and highlights the forecast windows that look most comfortable. The idea is to help travelers decide **when** to take a trip, not just check the weather after picking dates.

## Features

- Search for a destination or use your current location
- View current conditions and a five-day destination outlook
- Compare up to three departure-date options for trips of 1, 2, 3, 5, 7, or 10 days
- Choose a trip vibe: city exploring, active outdoors, or slow and sunny
- See why the top date ranks first and how each alternative compares on trip score and peak rain chance
- Ask Gemini whether the top-ranked trip is a good plan, why it may not be, and ask follow-up questions
- Get an explainable comfort score and practical packing or backup suggestions
- Responsive layout for desktop and mobile

## How the planner works

TripTide requests a 16-day forecast from Open-Meteo. It groups hourly data into local destination dates and scores daytime hours from 7:00 a.m. to 8:00 p.m. Each hour starts at 100 points; the score is reduced for apparent temperatures outside the selected profile's preferred range, precipitation probability, strong wind, and rainy or stormy weather codes. Daily scores are averaged across each complete trip. Candidate trips are ranked by average score and weakest-day score, with peak rain, temperature comfort, and wind used to break ties. Each recommendation explains why the top pick leads and compares alternatives' score, feels-like temperature, and peak rain chance.

Departures start tomorrow so that every compared trip uses complete forecast days. A trip is shown only when all of its days fall inside the available forecast. Longer-range forecasts are less certain, so treat later dates and all comfort scores as planning hints—not guarantees. The score is not a probability, safety assessment, or substitute for official alerts. Air quality, UV, and local travel conditions are not included.

## Technologies and data

- HTML, CSS, and vanilla JavaScript
- Open-Meteo forecast API and geocoding API
- Google Gemini Interactions API through a server-side Vercel Function
- No frontend build step required

## Configure Gemini on Vercel

The AI brief uses the Gemini `gemini-3.8-flash` model by default, with automatic fallback to `gemini-3.6-flash` and then `gemini-3.5-flash` when a model is temporarily unavailable. Its API key is read only by the serverless function in [api/trip-brief.js](api/trip-brief.js); never add the key to `app.js`, HTML, or a committed `.env` file.

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey).
2. In Vercel, open the project's **Settings → Environment Variables**.
3. Add `GEMINI_API_KEY` with the key as its value, for the environments you use.
4. Redeploy the Vercel project so the function receives the environment variable.
5. Open the deployed site, select a destination and trip length, then choose **Ask Gemini**.

The model can be changed with an optional `GEMINI_MODEL` Vercel environment variable; if it is omitted, the function uses `gemini-3.8-flash`.

The AI brief requires the Vercel Function runtime; it will not run when opening `index.html` directly or using a static-only server. For local testing, use the Vercel CLI (`vercel dev`) and configure `GEMINI_API_KEY` in a local, untracked `.env.local` file. Do not commit that file or share the key.

Gemini only receives the destination, trip vibe, current date, the already-ranked weather summaries, and any follow-up question you submit. It answers whether the top-ranked trip is a reasonable plan, gives a short reason and AI confidence estimate, and can answer questions about the trip using the supplied forecast. The estimate is not measured historical accuracy or a guarantee; Gemini does not fetch or change weather data. Forecast ranking continues to work without an AI key.

## Run locally

Open `index.html` in a browser, or serve the project folder with a local static server. An internet connection is needed for weather and location search.

## Project files

- [index.html](index.html) — page structure and planner controls
- [styles.css](styles.css) — visual design and responsive layout
- [app.js](app.js) — forecast requests, trip ranking, and UI rendering
- [api/trip-brief.js](api/trip-brief.js) — validates trip data and calls Gemini without exposing the API key

## Deploy to Vercel

Upload or commit these files to the project root connected to your Vercel deployment. For a Git-connected Vercel project, push the changes to its repository to trigger a deployment. Editing a separate local copy does not update the deployed site automatically.
