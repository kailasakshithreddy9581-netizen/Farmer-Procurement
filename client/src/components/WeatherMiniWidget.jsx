import React, { useState, useEffect } from 'react';
import { CloudSun, CloudRain, Sun, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { fetchWeatherData, DEFAULT_MANDI_LOCATIONS } from '../services/weatherService';
import VoiceSpeakerBtn from './VoiceSpeakerBtn';

export default function WeatherMiniWidget({ language = 'en', onOpenFullForecast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      try {
        const def = DEFAULT_MANDI_LOCATIONS[0];
        const res = await fetchWeatherData(def.lat, def.lon, def.name, language);
        if (isMounted) setData(res);
      } catch (e) {
        console.warn('Mini weather widget fetch error:', e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [language]);

  if (loading) {
    return (
      <div className="weather-dashboard-widget" style={{ opacity: 0.8 }}>
        <div className="widget-left">
          <div className="widget-icon-pill">
            <CloudSun size={26} />
          </div>
          <div className="widget-info">
            <h3 style={{ fontSize: '0.95rem' }}>Loading Live Mandi Weather...</h3>
            <p>Checking satellite forecast and moisture advisory</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const current = data.current;
  const moisture = data.advisories.moisture;
  const isSafe = moisture.risk === 'Safe';

  return (
    <div className="weather-dashboard-widget">
      <div className="widget-left">
        <div className="widget-icon-pill">
          {current.rain > 0 ? (
            <CloudRain size={26} color="#38bdf8" />
          ) : current.isDay ? (
            <Sun size={26} color="#facc15" />
          ) : (
            <CloudSun size={26} color="#38bdf8" />
          )}
        </div>
        <div className="widget-info">
          <h3>
            <span>
              {data.location.name}: {current.temperature}°C, {current.condition}
            </span>
            {isSafe ? (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontSize: '0.75rem',
                  background: '#065f46',
                  color: '#34d399',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px'
                }}
              >
                <ShieldCheck size={12} /> Safe for Mandi
              </span>
            ) : (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  fontSize: '0.75rem',
                  background: '#7f1d1d',
                  color: '#f87171',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '12px'
                }}
              >
                <AlertTriangle size={12} /> Cover Grain
              </span>
            )}
          </h3>
          <p>
            🌧️ Rain chance: {data.daily[0]?.rainProb}% • 💧 Humidity: {current.humidity}% • {moisture.title}
          </p>
        </div>
      </div>

      <div className="widget-actions">
        {data.advisories.voicePrompt && (
          <VoiceSpeakerBtn
            text={data.advisories.voicePrompt}
            language={language}
            label="Listen weather summary"
            size={16}
          />
        )}
        <button
          type="button"
          className="widget-view-btn"
          onClick={onOpenFullForecast}
          title="Open complete 7-day agricultural weather forecast"
        >
          <span>7-Day Forecast</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
