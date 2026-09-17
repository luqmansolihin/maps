/**
 * Modul Petunjuk Arah & Rute (OSRM Routing Engine)
 */
import { CONFIG } from "./config.js";
import { WeatherManager } from "./weather.js";

export class RouteManager {
    constructor(mapManager, uiCallbacks = {}) {
        this.mapManager = mapManager;
        this.callbacks = uiCallbacks;
        this.weatherManager = new WeatherManager();

        this.origin = null; // { lat, lng, name }
        this.destination = null; // { lat, lng, name }
        this.transportMode = "driving"; // 'driving', 'cycling', 'walking'

        this.routePolyline = null;
        this.routePolylineBorder = null;
        this.originMarker = null;
        this.destinationMarker = null;
        this.stepMarker = null;
        this.weatherMarkers = [];
    }

    setOrigin(place) {
        this.origin = place;
        if (this.originMarker) {
            this.mapManager.map.removeLayer(this.originMarker);
        }
        if (place && place.lat && place.lng) {
            const icon = this.mapManager.createWaypointIcon("origin");
            this.originMarker = L.marker([place.lat, place.lng], {
                icon,
                zIndexOffset: 800,
            }).addTo(this.mapManager.map);
        }
        if (this.origin && this.destination) {
            this.calculateRoute();
        }
    }

    setDestination(place) {
        this.destination = place;
        if (this.destinationMarker) {
            this.mapManager.map.removeLayer(this.destinationMarker);
        }
        if (place && place.lat && place.lng) {
            const icon = this.mapManager.createWaypointIcon("destination");
            this.destinationMarker = L.marker([place.lat, place.lng], {
                icon,
                zIndexOffset: 800,
            }).addTo(this.mapManager.map);
        }
        if (this.origin && this.destination) {
            this.calculateRoute();
        }
    }

    setMode(mode) {
        this.transportMode = mode;
        if (this.origin && this.destination) {
            this.calculateRoute();
        }
    }

    swapOriginDestination() {
        const temp = this.origin;
        this.origin = this.destination;
        this.destination = temp;

        // Refresh marker icons
        if (this.originMarker)
            this.mapManager.map.removeLayer(this.originMarker);
        if (this.destinationMarker)
            this.mapManager.map.removeLayer(this.destinationMarker);

        if (this.origin) {
            const icon = this.mapManager.createWaypointIcon("origin");
            this.originMarker = L.marker([this.origin.lat, this.origin.lng], {
                icon,
                zIndexOffset: 800,
            }).addTo(this.mapManager.map);
        }
        if (this.destination) {
            const icon = this.mapManager.createWaypointIcon("destination");
            this.destinationMarker = L.marker(
                [this.destination.lat, this.destination.lng],
                { icon, zIndexOffset: 800 },
            ).addTo(this.mapManager.map);
        }

        if (this.callbacks.onSwap) {
            this.callbacks.onSwap(this.origin, this.destination);
        }

        if (this.origin && this.destination) {
            this.calculateRoute();
        }
    }

    async calculateRoute() {
        if (!this.origin || !this.destination) return;

        if (this.callbacks.onLoading) {
            this.callbacks.onLoading(true);
        }

        try {
            // Koordinat OSRM: [lon1, lat1];[lon2, lat2]
            const coords = `${this.origin.lng},${this.origin.lat};${this.destination.lng},${this.destination.lat}`;
            const baseUrl =
                CONFIG.ROUTING[this.transportMode] || CONFIG.ROUTING.driving;
            const url = `${baseUrl}/${coords}?overview=full&geometries=geojson&steps=true`;

            let res = await fetch(url);
            if (!res.ok) {
                // Fallback ke OSRM driving jika server bike/walk khusus gagal
                if (this.transportMode !== "driving") {
                    const fallbackUrl = `${CONFIG.ROUTING.driving}/${coords}?overview=full&geometries=geojson&steps=true`;
                    res = await fetch(fallbackUrl);
                }
            }

            if (!res.ok)
                throw new Error("Gagal menghitung rute dari server navigasi.");
            const data = await res.json();

            if (!data.routes || data.routes.length === 0) {
                throw new Error("Tidak ditemukan rute antara dua lokasi ini.");
            }

            const route = data.routes[0];
            this.renderRoute(route);

            // Ambil data cuaca di sepanjang rute perjalanan
            let routeWeather = [];
            try {
                routeWeather = await this.weatherManager.fetchRouteWeather(
                    route.geometry.coordinates,
                );
                this.renderRouteWeatherMarkers(routeWeather);
            } catch (e) {
                console.warn("Gagal memuat cuaca rute:", e);
            }

            if (this.callbacks.onSuccess) {
                this.callbacks.onSuccess(
                    route,
                    this.transportMode,
                    routeWeather,
                );
            }
        } catch (err) {
            console.error("Error kalkulasi rute:", err);
            if (this.callbacks.onError) {
                this.callbacks.onError(
                    err.message || "Terjadi kesalahan saat memuat rute.",
                );
            }
        } finally {
            if (this.callbacks.onLoading) {
                this.callbacks.onLoading(false);
            }
        }
    }

    renderRoute(route) {
        this.clearRouteGraphics();

        const coordinates = route.geometry.coordinates.map((coord) => [
            coord[1],
            coord[0],
        ]); // GeoJSON [lng, lat] ke Leaflet [lat, lng]

        // Buat garis luar (border/glow) untuk gaya khas Google Maps
        this.routePolylineBorder = L.polyline(coordinates, {
            color: "#1A73E8",
            weight: 8,
            opacity: 0.9,
            lineCap: "round",
            lineJoin: "round",
        }).addTo(this.mapManager.map);

        // Buat garis dalam dengan warna biru cerah
        this.routePolyline = L.polyline(coordinates, {
            color: "#4285F4",
            weight: 5,
            opacity: 1,
            lineCap: "round",
            lineJoin: "round",
        }).addTo(this.mapManager.map);

        // Pusatkan kamera ke seluruh bentang rute
        const bounds = this.routePolyline.getBounds();
        this.mapManager.map.fitBounds(bounds, {
            padding: [80, 80],
            maxZoom: 17,
        });
    }

    highlightStep(location) {
        if (this.stepMarker) {
            this.mapManager.map.removeLayer(this.stepMarker);
        }
        if (!location) return;

        const icon = L.divIcon({
            className: "step-highlight-marker",
            html: '<div class="step-dot"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8],
        });

        this.stepMarker = L.marker([location[1], location[0]], {
            icon,
            zIndexOffset: 900,
        }).addTo(this.mapManager.map);
        this.mapManager.map.panTo([location[1], location[0]], {
            animate: true,
            duration: 0.5,
        });
    }

    clearStepHighlight() {
        if (this.stepMarker) {
            this.mapManager.map.removeLayer(this.stepMarker);
            this.stepMarker = null;
        }
    }

    clearRoute() {
        this.clearRouteGraphics();
        if (this.originMarker) {
            this.mapManager.map.removeLayer(this.originMarker);
            this.originMarker = null;
        }
        if (this.destinationMarker) {
            this.mapManager.map.removeLayer(this.destinationMarker);
            this.destinationMarker = null;
        }
        this.origin = null;
        this.destination = null;
    }

    clearRouteGraphics() {
        if (this.routePolyline) {
            this.mapManager.map.removeLayer(this.routePolyline);
            this.routePolyline = null;
        }
        if (this.routePolylineBorder) {
            this.mapManager.map.removeLayer(this.routePolylineBorder);
            this.routePolylineBorder = null;
        }
        this.clearStepHighlight();
        this.clearWeatherMarkers();
    }

    renderRouteWeatherMarkers(weatherPoints) {
        this.clearWeatherMarkers();
        if (!weatherPoints || !weatherPoints.length) return;

        weatherPoints.forEach((point) => {
            if (!point.weather) return;
            const w = point.weather;
            const icon = L.divIcon({
                className: "route-weather-marker-container",
                html: `
                    <div class="route-weather-marker severity-${w.severity}" title="${point.label}: ${w.condition} (${w.temperature}°C)">
                        <span class="marker-weather-icon">${w.icon}</span>
                        <span class="marker-weather-temp">${w.temperature}°</span>
                    </div>
                `,
                iconSize: [46, 26],
                iconAnchor: [23, 13],
            });

            const marker = L.marker([point.lat, point.lng], {
                icon,
                zIndexOffset: 750,
            }).addTo(this.mapManager.map);

            marker.bindPopup(`
                <div class="weather-map-popup">
                    <div class="popup-title"><strong>${point.label}</strong></div>
                    <div class="popup-cond">${w.icon} ${w.condition} (${w.temperature}°C)</div>
                    <div class="popup-meta">💧 Kelembapan: ${w.humidity}% &bull; 💨 Angin: ${w.windSpeed} km/j</div>
                </div>
            `);

            this.weatherMarkers.push(marker);
        });
    }

    clearWeatherMarkers() {
        if (this.weatherMarkers && this.weatherMarkers.length) {
            this.weatherMarkers.forEach((m) =>
                this.mapManager.map.removeLayer(m),
            );
            this.weatherMarkers = [];
        }
    }

    // --- Helper Format Jarak & Durasi ---
    static formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        }
        return `${(meters / 1000).toFixed(1)} km`;
    }

    static formatDuration(seconds) {
        const mins = Math.round(seconds / 60);
        if (mins < 60) {
            return `${mins} mnt`;
        }
        const hours = Math.floor(mins / 60);
        const remainingMins = mins % 60;
        if (remainingMins === 0) {
            return `${hours} jam`;
        }
        return `${hours} jam ${remainingMins} mnt`;
    }

    // Menerjemahkan instruksi manuver OSRM ke Bahasa Indonesia
    static formatManeuver(step) {
        const type = step.maneuver.type;
        const modifier = step.maneuver.modifier;
        const street = step.name ? `ke <strong>${step.name}</strong>` : "";

        let text = "Lanjutkan perjalanan";
        let icon = "straight";

        switch (type) {
            case "depart":
                text = `Mulai perjalanan ke arah ${RouteManager.translateModifier(modifier)} ${street}`;
                icon = "depart";
                break;
            case "arrive":
                text = "Anda telah tiba di tujuan";
                icon = "arrive";
                break;
            case "turn":
                if (modifier === "left" || modifier === "sharp left") {
                    text = `Belok kiri ${street}`;
                    icon = "turn-left";
                } else if (modifier === "slight left") {
                    text = `Belok sedikit ke kiri ${street}`;
                    icon = "slight-left";
                } else if (modifier === "right" || modifier === "sharp right") {
                    text = `Belok kanan ${street}`;
                    icon = "turn-right";
                } else if (modifier === "slight right") {
                    text = `Belok sedikit ke kanan ${street}`;
                    icon = "slight-right";
                } else if (modifier === "uturn") {
                    text = `Putar balik ${street}`;
                    icon = "uturn";
                } else {
                    text = `Lanjutkan ${street}`;
                    icon = "straight";
                }
                break;
            case "roundabout":
            case "rotary":
                text = `Masuk bundaran dan ambil jalan keluar ${street}`;
                icon = "roundabout";
                break;
            case "fork":
                text = `Ambil jalur ${modifier === "left" ? "kiri" : "kanan"} ${street}`;
                icon = modifier === "left" ? "fork-left" : "fork-right";
                break;
            case "merge":
                text = `Bergabung dengan jalan ${street}`;
                icon = "merge";
                break;
            case "on ramp":
                text = `Ambil jalan masuk ${street}`;
                icon = "ramp-enter";
                break;
            case "off ramp":
                text = `Ambil jalan keluar ${street}`;
                icon = "ramp-exit";
                break;
            default:
                text = `Lurus terus ${street}`;
                icon = "straight";
        }

        return { text, icon };
    }

    static translateModifier(mod) {
        const map = {
            north: "utara",
            south: "selatan",
            east: "timur",
            west: "barat",
            northeast: "timur laut",
            northwest: "barat laut",
            southeast: "tenggara",
            southwest: "barat daya",
        };
        return map[mod] || "";
    }
}
