import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  CloudLightning,
  CloudDrizzle,
  CloudSunRain,
  Wind,
  Droplets,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  MapPin,
  Calendar,
  Sparkles,
  Wheat,
  ShieldAlert,
  ArrowRight,
  Navigation,
  Thermometer
} from 'lucide-react';
import {
  fetchWeatherData,
  DEFAULT_MANDI_LOCATIONS,
  reverseGeocodeCoords,
  getLiveGpsCoordinates
} from '../services/weatherService';
import VoiceSpeakerBtn from './VoiceSpeakerBtn';
import { translations } from '../languages';
import '../styles/WeatherForecast.css';

// Helper to render Lucide weather icon dynamically
function WeatherIcon({ name, size = 24, className = '' }) {
  switch (name) {
    case 'Sun':
      return <Sun size={size} className={className} />;
    case 'CloudSun':
      return <CloudSun size={size} className={className} />;
    case 'Cloud':
      return <Cloud size={size} className={className} />;
    case 'CloudRain':
      return <CloudRain size={size} className={className} />;
    case 'CloudDrizzle':
      return <CloudDrizzle size={size} className={className} />;
    case 'CloudLightning':
      return <CloudLightning size={size} className={className} />;
    case 'CloudSunRain':
      return <CloudSunRain size={size} className={className} />;
    default:
      return <CloudSun size={size} className={className} />;
  }
}

export default function WeatherForecast({ language = 'en', farmerData, onNavigateBooking }) {
  const t = translations[language] || translations.en;

  const [selectedLocation, setSelectedLocation] = useState(DEFAULT_MANDI_LOCATIONS[0]);
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [locatingStatus, setLocatingStatus] = useState('Accessing your farm GPS location...');

  // Load weather for location
  const loadWeather = useCallback(async (lat, lon, name) => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchWeatherData(lat, lon, name, language);
      setWeatherData(data);
    } catch (err) {
      console.error('Error fetching weather data:', err);
      setError(err.message || 'Unable to load real-time weather information.');
    } finally {
      setLoading(false);
      setLocatingStatus('');
    }
  }, [language]);

  // Automatic Location Detection on Component Mount
  useEffect(() => {
    let isMounted = true;

    async function autoDetectFarmerLocation() {
      try {
        setLoading(true);
        setLocatingStatus('Accessing your farm GPS location for exact forecast...');
        const coords = await getLiveGpsCoordinates();
        if (!isMounted) return;

        setLocatingStatus('Locating your village, taluk & district...');
        const placeName = await reverseGeocodeCoords(coords.lat, coords.lon);
        const gpsLoc = {
          name: placeName,
          lat: coords.lat,
          lon: coords.lon,
          state: 'Kerala (Live GPS)'
        };

        if (isMounted) {
          setSelectedLocation(gpsLoc);
          setIsGpsActive(true);
          await loadWeather(coords.lat, coords.lon, placeName);
        }
      } catch (err) {
        console.log('Auto GPS not granted or unavailable, defaulting to Kerala primary hub:', err.message);
        if (isMounted) {
          setIsGpsActive(false);
          const def = DEFAULT_MANDI_LOCATIONS[0];
          setSelectedLocation(def);
          await loadWeather(def.lat, def.lon, def.name);
        }
      }
    }

    autoDetectFarmerLocation();
    return () => {
      isMounted = false;
    };
  }, [loadWeather]);

  // Handle Location Dropdown Change
  const handleSelectLocation = (e) => {
    const found = DEFAULT_MANDI_LOCATIONS.find((loc) => loc.name === e.target.value);
    if (found) {
      setSelectedLocation(found);
      setIsGpsActive(false);
      loadWeather(found.lat, found.lon, found.name);
    }
  };

  // Handle Manual GPS Detect Button
  const handleDetectGps = async () => {
    try {
      setLoading(true);
      setLocatingStatus('Detecting high-precision farm GPS coordinates...');
      const coords = await getLiveGpsCoordinates();
      setLocatingStatus('Resolving location details...');
      const placeName = await reverseGeocodeCoords(coords.lat, coords.lon);
      const gpsLoc = {
        name: placeName,
        lat: coords.lat,
        lon: coords.lon,
        state: 'Kerala (Live GPS)'
      };
      setSelectedLocation(gpsLoc);
      setIsGpsActive(true);
      await loadWeather(coords.lat, coords.lon, placeName);
    } catch (err) {
      console.warn('Geolocation access denied or failed:', err);
      alert('Could not access device GPS. Please allow browser location permissions or choose your Kerala district from the list below.');
      setLoading(false);
      setLocatingStatus('');
    }
  };

  return (
    <div className="weather-forecast-container">
      {/* Header Bar */}
      <div className="weather-header">
        <div className="weather-header-top">
          <div className="weather-title-area">
            <div className="weather-icon-badge">
              <CloudSun size={28} />
            </div>
            <div>
              <h1>
                <span>🌾 {t.weatherForecast || 'Live & 7-Day Weather Forecast'}</span>
              </h1>
              <p>
                {t.weatherNotice || 'Hyperlocal weather data and agricultural harvest & mandi transport advisory'}
              </p>
            </div>
          </div>

          <div className="weather-header-actions">
            {weatherData && (
              <span className="provider-badge" title="Live meteorological data with Google Weather API support">
                <span className="provider-dot"></span>
                <span>{weatherData.provider}</span>
              </span>
            )}
            {weatherData?.advisories?.voicePrompt && (
              <VoiceSpeakerBtn
                text={weatherData.advisories.voicePrompt}
                language={language}
                label="Listen to Weather Advisory"
                size={18}
              />
            )}
          </div>
        </div>

        {/* Location Selector */}
        <div className="location-selector-bar">
          <div className="location-dropdown-wrap">
            <MapPin size={18} color="#0284c7" />
            <select
              value={selectedLocation.name}
              onChange={handleSelectLocation}
            >
              {isGpsActive && (
                <option value={selectedLocation.name}>
                  🟢 {selectedLocation.name} (Live Farm GPS Active)
                </option>
              )}
              {DEFAULT_MANDI_LOCATIONS.map((loc) => (
                <option key={loc.name} value={loc.name}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="gps-btn"
            onClick={handleDetectGps}
            title="Detect GPS coordinates directly from your device"
          >
            <Navigation size={15} />
            <span>Use My GPS</span>
          </button>

          <button
            type="button"
            className="refresh-btn"
            onClick={() => loadWeather(selectedLocation.lat, selectedLocation.lon, selectedLocation.name)}
            title="Refresh weather data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && !weatherData && (
        <div className="weather-loading-box">
          <div className="weather-loading-spinner"></div>
          <p>{locatingStatus || 'Syncing live meteorological data and harvest advisories...'}</p>
        </div>
      )}

      {/* Error State */}
      {error && !weatherData && (
        <div className="weather-error-box">
          <AlertTriangle size={36} color="#ef4444" />
          <h3>Weather Data Temporarily Unavailable</h3>
          <p>{error}</p>
          <button
            className="gps-btn"
            onClick={() => loadWeather(selectedLocation.lat, selectedLocation.lon, selectedLocation.name)}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Main Weather Display */}
      {weatherData && (
        <>
          {/* Hero Live Current Conditions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="weather-hero-card"
          >
            <div className="hero-main-row">
              <div className="hero-temp-group">
                <div className="hero-weather-icon">
                  <WeatherIcon name={weatherData.current.icon} size={44} />
                </div>
                <div>
                  <div className="hero-degrees">{weatherData.current.temperature}°C</div>
                  <div className="hero-meta">
                    <span className="hero-condition-pill">{weatherData.current.condition}</span>
                    <span className="hero-feels-like">
                      Feels like {weatherData.current.feelsLike}°C • Updated at {weatherData.updatedAt}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Audio Voice Reader for illiterates */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Voice Weather Broadcast</span>
                <VoiceSpeakerBtn
                  text={weatherData.advisories.voicePrompt}
                  language={language}
                  size={20}
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="hero-metrics-grid">
              <div className="metric-box">
                <div className="metric-box-icon">
                  <Droplets size={22} />
                </div>
                <div className="metric-box-data">
                  <h4>Humidity</h4>
                  <p>{weatherData.current.humidity}%</p>
                </div>
              </div>

              <div className="metric-box">
                <div className="metric-box-icon">
                  <CloudRain size={22} />
                </div>
                <div className="metric-box-data">
                  <h4>Precipitation</h4>
                  <p>{weatherData.current.rain || weatherData.current.precipitation} mm</p>
                </div>
              </div>

              <div className="metric-box">
                <div className="metric-box-icon">
                  <Wind size={22} />
                </div>
                <div className="metric-box-data">
                  <h4>Wind Speed</h4>
                  <p>{weatherData.current.windSpeed} km/h</p>
                </div>
              </div>

              <div className="metric-box">
                <div className="metric-box-icon">
                  <Thermometer size={22} />
                </div>
                <div className="metric-box-data">
                  <h4>Today High/Low</h4>
                  <p>
                    {weatherData.daily[0]?.tempMax}° / {weatherData.daily[0]?.tempMin}°
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Agricultural Procurement & Mandi Advisory Section */}
          <div className="agri-advisories-section">
            <div className="section-headline">
              <div className="section-headline-title">
                <Sparkles size={20} color="#059669" />
                <span>Agricultural Procurement Advisories (Mandi Safety)</span>
              </div>
              <VoiceSpeakerBtn
                text={`${weatherData.advisories.moisture.title}. ${weatherData.advisories.moisture.description} ${weatherData.advisories.transport.title}. ${weatherData.advisories.transport.description}`}
                language={language}
                size={16}
              />
            </div>

            <div className="advisories-grid">
              {/* 1. Grain Moisture Risk */}
              <div className={`advisory-card ${weatherData.advisories.moisture.risk.toLowerCase()}`}>
                <div>
                  <div className="advisory-card-header">
                    <span
                      className="advisory-tag"
                      style={{
                        background: `${weatherData.advisories.moisture.color}20`,
                        color: weatherData.advisories.moisture.color
                      }}
                    >
                      Grain Moisture
                    </span>
                    <Wheat size={18} color={weatherData.advisories.moisture.color} />
                  </div>
                  <h3 style={{ marginTop: '0.5rem', color: weatherData.advisories.moisture.color }}>
                    {weatherData.advisories.moisture.title}
                  </h3>
                  <p style={{ marginTop: '0.4rem' }}>{weatherData.advisories.moisture.description}</p>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem' }}>
                  💡 Mandi Standard: Maintain &le;14% moisture to receive 100% full MSP price without deductions.
                </div>
              </div>

              {/* 2. Mandi Transport Window */}
              <div className={`advisory-card ${weatherData.advisories.transport.status.toLowerCase()}`}>
                <div>
                  <div className="advisory-card-header">
                    <span
                      className="advisory-tag"
                      style={{
                        background: `${weatherData.advisories.transport.color}20`,
                        color: weatherData.advisories.transport.color
                      }}
                    >
                      Mandi Transport
                    </span>
                    {weatherData.advisories.transport.status === 'Favorable' ? (
                      <CheckCircle size={18} color={weatherData.advisories.transport.color} />
                    ) : (
                      <ShieldAlert size={18} color={weatherData.advisories.transport.color} />
                    )}
                  </div>
                  <h3 style={{ marginTop: '0.5rem', color: weatherData.advisories.transport.color }}>
                    {weatherData.advisories.transport.title}
                  </h3>
                  <p style={{ marginTop: '0.4rem' }}>{weatherData.advisories.transport.description}</p>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem' }}>
                  🚜 Route Status: Check that tractor trolleys are covered before departing the farm.
                </div>
              </div>

              {/* 3. Harvest Recommendation */}
              <div className="advisory-card safe">
                <div>
                  <div className="advisory-card-header">
                    <span className="advisory-tag" style={{ background: '#ecfdf5', color: '#059669' }}>
                      Harvest Window
                    </span>
                    <Calendar size={18} color="#059669" />
                  </div>
                  <h3 style={{ marginTop: '0.5rem', color: '#065f46' }}>
                    {weatherData.advisories.harvest.status}
                  </h3>
                  <p style={{ marginTop: '0.4rem' }}>{weatherData.advisories.harvest.description}</p>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem' }}>
                  🌾 Threshing Advice: Store newly threshed grains in dry, elevated gunny bags.
                </div>
              </div>
            </div>
          </div>

          {/* 7-Day Whole Week Weather Forecast */}
          <div className="weekly-forecast-card">
            <div className="section-headline">
              <div className="section-headline-title">
                <Calendar size={20} color="#0284c7" />
                <span>{t.weeklyOutlook || '7-Day Whole Week Agricultural Forecast'}</span>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Planning your harvest & slot booking
              </span>
            </div>

            <div className="days-scroll-grid">
              {weatherData.daily.map((day, idx) => (
                <div key={day.date} className={`day-column-card ${idx === 0 ? 'is-today' : ''}`}>
                  <span className="day-name">{day.dayName}</span>
                  <span className="day-date">{day.date.slice(5)}</span>
                  <div className="day-weather-icon">
                    <WeatherIcon name={day.icon} size={28} />
                  </div>
                  <div className="day-temps">
                    <span className="day-max">{day.tempMax}°</span>
                    <span className="day-min">{day.tempMin}°</span>
                  </div>
                  <div className="day-rain-prob" title="Probability of Rain">
                    <Droplets size={12} />
                    <span>{day.rainProb}%</span>
                  </div>
                  <div
                    className="day-mandi-tag"
                    style={{
                      background: `${day.mandiBadgeColor}18`,
                      color: day.mandiBadgeColor
                    }}
                  >
                    {day.mandiStatus}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Timeline (Next 24 Hours) */}
          {weatherData.hourly && weatherData.hourly.length > 0 && (
            <div className="hourly-timeline-card">
              <div className="section-headline">
                <div className="section-headline-title">
                  <ClockIcon size={18} color="#475569" />
                  <span>Next 24 Hours Hourly Outlook (Mandi Arrival Timing)</span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Horizontal scroll &rarr;
                </span>
              </div>

              <div className="hourly-scroll-strip">
                {weatherData.hourly.map((h, i) => (
                  <div key={i} className="hour-pill">
                    <span className="hour-time">{h.time}</span>
                    <WeatherIcon name={h.icon} size={20} />
                    <span className="hour-temp">{h.temp}°</span>
                    <span className="hour-rain">{h.rainProb}% rain</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Call to Action: Book Slot Based on Safe Weather */}
          <div className="weather-booking-cta">
            <div className="cta-text">
              <h3>Ready to bring your grain to the procurement center?</h3>
              <p>
                Check the sunny weather window above and reserve your priority delivery slot now to avoid long queues.
              </p>
            </div>
            {onNavigateBooking && (
              <button type="button" className="cta-btn" onClick={onNavigateBooking}>
                <span>Book Procurement Slot</span>
                <ArrowRight size={18} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ClockIcon({ size = 18, color = '#64748b' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
  );
}
