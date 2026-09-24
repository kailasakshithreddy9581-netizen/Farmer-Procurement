# 🌾 Farmer Weather & Mandi Harvest Forecast Integration

This document outlines the real-time weather and 7-day agricultural forecast integration designed exclusively for the **Farmer Section** of the Farmer-Procurement platform.

---

## 🌟 Key Features

1. **Hyperlocal Live Weather Forecast**:
   - Real-time temperature (°C), "Feels Like" temperature, and weather condition badges.
   - Key agricultural metrics: Relative Humidity (%), Precipitation (mm), Wind Speed (km/h), and Today's High/Low temperatures.
   - One-click farm GPS detection using HTML5 Geolocation (`Use My GPS`).
   - Quick-select dropdown for Kerala's 14 districts and agricultural mandis/mandals (Palakkad Alathur, Kuttanad, Thrissur Kole, Wayanad, Kottayam, Kozhikode, Kannur, etc.).

2. **Whole Week (7-Day) Agricultural Outlook**:
   - Day-by-day forecast table with weather icons, high/low temperatures, precipitation probability (%), and wind speeds.
   - Visual agricultural indicator tag for every single day:
     - 🟢 **Favorable Mandi Window**: Safe to transport open or bagged produce.
     - 🟡 **Caution: Carry Tarpaulin**: Passing showers possible.
     - 🔴 **Wet: Keep Produce Sheltered**: Rain expected; postpone open delivery.

3. **Next 24-Hour Hourly Timeline**:
   - Hourly temperature and rain probability slider to help farmers plan morning tractor/trolley trips to the APMC mandi.

4. **Actionable Mandi Procurement & Harvest Advisories**:
   - **🌾 Grain Moisture Content Risk**:
     - Evaluates humidity and rain risk against the standard **≤14% APMC moisture threshold**.
     - Provides clear warnings to sun-dry crop or cover grain bags to avoid moisture price deductions or rejection.
   - **🚜 Mandi Transport Safety Window**:
     - Alerts farmers whether open trolleys can travel safely or waterproof tarpaulins must be lashed down.
   - **☀️ Reaping & Threshing Window**:
     - Guides farmers whether the next 3 days are safe for combine harvesters.

5. **Integrated Voice Broadcast (Multilingual / Illiterate Farmers)**:
   - Built-in `VoiceSpeakerBtn` support in **Malayalam (മലയാളം)**, **Telugu (తెలుగు)**, **Hindi (हिन्दी)**, and **English**.
   - Farmers can tap the speaker icon to hear the live weather and harvest recommendations read aloud.

6. **Dedicated to the Farmer Portal**:
   - Accessible only in **🌾 Farmer Mode** via the navigation bar (`Weather Forecast`), the Farmer Dashboard mini-widget, and the quick-action grid.
   - Kept completely isolated from Mandi Centre Admin and Superior Government Officer portals.

---

## 🔑 Google Weather API Configuration

The weather service supports the **Google Maps Platform Weather API** with automatic, high-reliability fallback to the **Open-Meteo High-Resolution Satellite Feed** if no key is configured.

### Setting up Google Weather API:
1. Obtain an API key with **Weather API** (Google Maps Platform Environment APIs) enabled from the [Google Cloud Console](https://console.cloud.google.com/).
2. Add the key to your environment:
   - In `client/.env`:
     ```env
     REACT_APP_GOOGLE_WEATHER_API_KEY=YOUR_GOOGLE_MAPS_WEATHER_API_KEY
     ```
   - In `server/.env`:
     ```env
     GOOGLE_WEATHER_API_KEY=YOUR_GOOGLE_MAPS_WEATHER_API_KEY
     ```
3. If no key is set, the application automatically uses the real-time satellite meteorological feed without breaking or displaying any error screens.
