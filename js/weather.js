/**
 * Modul Cuaca (Weather Engine - Standar BMKG / WMO)
 * Menyediakan data cuaca real-time untuk lokasi tunggal dan di sepanjang rute perjalanan
 */
import { CONFIG } from './config.js';

export const WMO_WEATHER_CODES = {
  0: { label: 'Cerah', icon: '☀️', severity: 'normal' },
  1: { label: 'Cerah Berawan', icon: '🌤️', severity: 'normal' },
  2: { label: 'Sebagian Berawan', icon: '⛅', severity: 'normal' },
  3: { label: 'Berawan Tebal', icon: '☁️', severity: 'normal' },
  45: { label: 'Berkabut', icon: '🌫️', severity: 'warning' },
  48: { label: 'Kabut Tebal Berembun', icon: '🌫️', severity: 'warning' },
  51: { label: 'Gerimis Ringan', icon: '🌦️', severity: 'normal' },
  53: { label: 'Gerimis Sedang', icon: '🌦️', severity: 'normal' },
  55: { label: 'Gerimis Lebat', icon: '🌧️', severity: 'warning' },
  61: { label: 'Hujan Ringan', icon: '🌧️', severity: 'normal' },
  63: { label: 'Hujan Sedang', icon: '🌧️', severity: 'warning' },
  65: { label: 'Hujan Lebat', icon: '⛈️', severity: 'danger' },
  71: { label: 'Salju Ringan', icon: '🌨️', severity: 'warning' },
  80: { label: 'Hujan Lokal Ringan', icon: '🌦️', severity: 'normal' },
  81: { label: 'Hujan Deras', icon: '🌧️', severity: 'danger' },
  82: { label: 'Hujan Sangat Deras', icon: '⛈️', severity: 'danger' },
  95: { label: 'Badai Petir', icon: '⛈️⚡', severity: 'danger' },
  96: { label: 'Badai Petir & Es Ringan', icon: '⛈️⚡', severity: 'danger' },
  99: { label: 'Badai Petir Sangat Lebat', icon: '⛈️⚡', severity: 'danger' },
};

export class WeatherManager {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Mengambil cuaca untuk koordinat tertentu
   */
  async fetchWeather(lat, lng) {
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    if (this.cache.has(key)) {
      const cached = this.cache.get(key);
      // Cache selama 10 menit
      if (Date.now() - cached.timestamp < 10 * 60 * 1000) {
        return cached.data;
      }
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=Asia%2FJakarta`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Gagal mengambil data cuaca');
      const json = await res.json();

      const current = json.current || {};
      const code = current.weather_code ?? 0;
      const meta = WMO_WEATHER_CODES[code] || { label: 'Cerah Berawan', icon: '🌤️', severity: 'normal' };

      const weatherData = {
        temperature: Math.round(current.temperature_2m ?? 28),
        apparentTemperature: Math.round(current.apparent_temperature ?? 30),
        humidity: current.relative_humidity_2m ?? 70,
        windSpeed: Math.round(current.wind_speed_10m ?? 10),
        precipitation: current.precipitation ?? 0,
        weatherCode: code,
        condition: meta.label,
        icon: meta.icon,
        severity: meta.severity,
        updatedAt: current.time || new Date().toISOString()
      };

      this.cache.set(key, { timestamp: Date.now(), data: weatherData });
      return weatherData;
    } catch (e) {
      console.warn('Error fetching weather:', e);
      return null;
    }
  }

  /**
   * Mengambil cuaca di sepanjang jalur rute (Sampling Titik Awal, Tengah, dan Tujuan)
   * @param {Array} coordinates - Array koordinat GeoJSON [lng, lat]
   */
  async fetchRouteWeather(coordinates) {
    if (!coordinates || coordinates.length < 2) return [];

    const total = coordinates.length;
    const samples = [];

    // Titik Awal (0%)
    samples.push({
      label: 'Titik Awal',
      lat: coordinates[0][1],
      lng: coordinates[0][0],
      percentage: 0
    });

    // Titik Jalur Tengah (25%, 50%, 75% jika rute panjang, atau 50% jika rute pendek)
    if (total >= 40) {
      const idxMid1 = Math.floor(total * 0.33);
      const idxMid2 = Math.floor(total * 0.66);
      samples.push({
        label: 'Area Perjalanan 1',
        lat: coordinates[idxMid1][1],
        lng: coordinates[idxMid1][0],
        percentage: 33
      });
      samples.push({
        label: 'Area Perjalanan 2',
        lat: coordinates[idxMid2][1],
        lng: coordinates[idxMid2][0],
        percentage: 66
      });
    } else if (total >= 10) {
      const idxMid = Math.floor(total * 0.5);
      samples.push({
        label: 'Area Perjalanan',
        lat: coordinates[idxMid][1],
        lng: coordinates[idxMid][0],
        percentage: 50
      });
    }

    // Titik Tujuan (100%)
    samples.push({
      label: 'Titik Tujuan',
      lat: coordinates[total - 1][1],
      lng: coordinates[total - 1][0],
      percentage: 100
    });

    // Ambil cuaca secara bersamaan (concurrent)
    const results = await Promise.all(
      samples.map(async (sample) => {
        const weather = await this.fetchWeather(sample.lat, sample.lng);
        return {
          ...sample,
          weather
        };
      })
    );

    return results;
  }
}
