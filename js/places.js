/**
 * Modul Informasi Lokasi (Reverse Geocoding & Place Details)
 */
import { CONFIG } from "./config.js";
import { Storage } from "./storage.js";
import { WeatherManager } from "./weather.js";

export class PlacesManager {
    constructor(mapManager, uiElements = {}, callbacks = {}) {
        this.mapManager = mapManager;
        this.elements = uiElements;
        this.callbacks = callbacks;
        this.weatherManager = new WeatherManager();

        this.currentPlace = null;
        this.abortController = null;

        this.init();
    }

    init() {
        // Listener klik pada peta
        this.mapManager.map.on("click", (e) => {
            const { lat, lng } = e.latlng;
            this.fetchPlaceDetails(lat, lng);
        });

        // Listener tombol kartu detail tempat
        if (this.elements.closeBtn) {
            this.elements.closeBtn.addEventListener("click", () => {
                this.hideCard();
            });
        }

        if (this.elements.saveBtn) {
            this.elements.saveBtn.addEventListener("click", () => {
                this.toggleSaveCurrentPlace();
            });
        }

        if (this.elements.copyCoordsBtn) {
            this.elements.copyCoordsBtn.addEventListener("click", () => {
                this.copyCoordinates();
            });
        }

        if (this.elements.directionsBtn) {
            this.elements.directionsBtn.addEventListener("click", () => {
                if (this.currentPlace && this.callbacks.onRequestDirections) {
                    this.callbacks.onRequestDirections(this.currentPlace);
                }
            });
        }

        if (this.elements.shareBtn) {
            this.elements.shareBtn.addEventListener("click", () => {
                this.sharePlace();
            });
        }
    }

    async fetchPlaceDetails(lat, lng, knownName = null) {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        // Pasang penanda di titik klik
        this.mapManager.setClickMarker(lat, lng);
        this.showLoadingCard(lat, lng);

        try {
            const url = `${CONFIG.GEOCODING.REVERSE_URL}?format=json&addressdetails=1&lat=${lat}&lon=${lng}`;

            const geoRes = await fetch(url, {
                signal: this.abortController.signal,
                headers: {
                    Accept: "application/json",
                    "Accept-Language": "id,en",
                },
            });

            if (!geoRes.ok) throw new Error("Gagal memuat detail tempat");
            const data = await geoRes.json();

            const addr = data.address || {};
            let placeName = knownName;
            if (!placeName) {
                if (data.name) {
                    placeName = data.name;
                } else if (data.address) {
                    placeName =
                        addr.road ||
                        addr.suburb ||
                        addr.town ||
                        addr.neighbourhood ||
                        addr.city ||
                        "Titik Terpilih";
                } else {
                    placeName = "Titik Terpilih";
                }
            }

            const bpsHierarchy = this.formatBpsHierarchy(addr);

            // Ambil cuaca dengan konteks alamat dan nama tempat untuk mencocokkan stasiun BMKG
            const weatherData = await this.weatherManager.fetchWeather(
                lat,
                lng,
                {
                    name: placeName,
                    address: data.display_name,
                    details: addr,
                },
            );

            this.currentPlace = {
                name: placeName,
                address:
                    data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                lat,
                lng,
                details: addr,
                bpsHierarchy,
                weather: weatherData,
            };

            this.renderPlaceCard(this.currentPlace);
        } catch (err) {
            if (err.name !== "AbortError") {
                const weatherData = await this.weatherManager.fetchWeather(
                    lat,
                    lng,
                    { name: knownName },
                );
                this.currentPlace = {
                    name: knownName || "Titik Koordinat",
                    address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                    lat,
                    lng,
                    bpsHierarchy: "Data wilayah belum tersedia",
                    weather: weatherData,
                };
                this.renderPlaceCard(this.currentPlace);
            }
        }
    }

    formatBpsHierarchy(addr) {
        const parts = [];
        if (addr.state) parts.push(`<strong>Prov:</strong> ${addr.state}`);
        const kab = addr.city || addr.county || addr.municipality;
        if (kab) parts.push(`<strong>Kab/Kota:</strong> ${kab}`);
        const kec = addr.city_district || addr.suburb || addr.town;
        if (kec) parts.push(`<strong>Kec:</strong> ${kec}`);
        const kel = addr.village || addr.quarter || addr.neighbourhood;
        if (kel) parts.push(`<strong>Desa/Kel:</strong> ${kel}`);
        if (addr.postcode)
            parts.push(`<strong>Kodepos:</strong> ${addr.postcode}`);

        return parts.length > 0 ? parts.join(" &bull; ") : "Indonesia";
    }

    showLoadingCard(lat, lng) {
        if (!this.elements.cardContainer) return;
        this.elements.cardContainer.classList.add("active");
        this.elements.placeTitle.textContent = "Memuat informasi tempat...";
        this.elements.placeAddress.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        this.elements.placeCoords.textContent = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

        const weatherCond = document.getElementById("place-weather-cond");
        if (weatherCond) weatherCond.textContent = "Memuat cuaca BMKG...";
        const bpsEl = document.getElementById("place-bps-hierarchy");
        if (bpsEl) bpsEl.textContent = "Memuat data wilayah...";
    }

    renderPlaceCard(place) {
        if (!this.elements.cardContainer) return;

        this.elements.cardContainer.classList.add("active");
        this.elements.placeTitle.textContent = place.name;
        this.elements.placeAddress.textContent = place.address;
        this.elements.placeCoords.textContent = `${place.lat.toFixed(6)}, ${place.lng.toFixed(6)}`;

        // Render data cuaca jika tersedia
        const weatherIcon = document.getElementById("place-weather-icon");
        const weatherTemp = document.getElementById("place-weather-temp");
        const weatherCond = document.getElementById("place-weather-cond");
        const weatherExtra = document.getElementById("place-weather-extra");

        if (place.weather) {
            if (weatherIcon) weatherIcon.textContent = place.weather.icon;
            if (weatherTemp)
                weatherTemp.textContent = `${place.weather.temperature}°C`;
            if (weatherCond) weatherCond.textContent = place.weather.condition;
            if (weatherExtra) {
                const sourceBadge = place.weather.source
                    ? ` &bull; 📡 ${place.weather.source}`
                    : "";
                weatherExtra.innerHTML = `Terasa ${place.weather.apparentTemperature}°C &bull; 💧 ${place.weather.humidity}% &bull; 💨 ${place.weather.windSpeed} km/j${sourceBadge}`;
            }
        } else {
            if (weatherCond) weatherCond.textContent = "Cuaca tidak tersedia";
        }

        // Render hierarki BPS
        const bpsEl = document.getElementById("place-bps-hierarchy");
        if (bpsEl) {
            bpsEl.innerHTML = place.bpsHierarchy || "Wilayah Indonesia";
        }

        // Update status tombol favorit
        const isFav = Storage.isFavorite(place.lat, place.lng);
        this.updateSaveButtonUI(isFav);
    }

    updateSaveButtonUI(isSaved) {
        if (!this.elements.saveBtn) return;
        const textSpan = this.elements.saveBtn.querySelector("span");
        const svg = this.elements.saveBtn.querySelector("svg");

        if (isSaved) {
            this.elements.saveBtn.classList.add("saved");
            if (textSpan) textSpan.textContent = "Tersimpan";
            if (svg) svg.setAttribute("fill", "#EA4335");
        } else {
            this.elements.saveBtn.classList.remove("saved");
            if (textSpan) textSpan.textContent = "Simpan";
            if (svg) svg.setAttribute("fill", "none");
        }
    }

    toggleSaveCurrentPlace() {
        if (!this.currentPlace) return;

        const isFav = Storage.isFavorite(
            this.currentPlace.lat,
            this.currentPlace.lng,
        );
        if (isFav) {
            const favorites = Storage.getFavorites();
            const target = favorites.find(
                (f) =>
                    Math.abs(f.lat - this.currentPlace.lat) < 0.0001 &&
                    Math.abs(f.lng - this.currentPlace.lng) < 0.0001,
            );
            if (target) {
                Storage.removeFavorite(target.id);
                this.updateSaveButtonUI(false);
                this.showToast("Tempat dihapus dari favorit");
            }
        } else {
            Storage.addFavorite(this.currentPlace);
            this.updateSaveButtonUI(true);
            this.showToast("Tempat berhasil disimpan ke favorit!");
        }

        if (this.callbacks.onFavoritesUpdated) {
            this.callbacks.onFavoritesUpdated();
        }
    }

    copyCoordinates() {
        if (!this.currentPlace) return;
        const text = `${this.currentPlace.lat.toFixed(6)}, ${this.currentPlace.lng.toFixed(6)}`;
        navigator.clipboard
            .writeText(text)
            .then(() => {
                this.showToast(`Koordinat disalin: ${text}`);
            })
            .catch(() => {
                this.showToast("Gagal menyalin koordinat");
            });
    }

    sharePlace() {
        if (!this.currentPlace) return;
        const url = new URL(window.location.href);
        url.searchParams.set("lat", this.currentPlace.lat.toFixed(6));
        url.searchParams.set("lng", this.currentPlace.lng.toFixed(6));
        url.searchParams.set(
            "name",
            encodeURIComponent(this.currentPlace.name),
        );

        navigator.clipboard
            .writeText(url.toString())
            .then(() => {
                this.showToast("Tautan lokasi disalin ke clipboard!");
            })
            .catch(() => {
                this.showToast("Gagal menyalin tautan");
            });
    }

    hideCard() {
        if (this.elements.cardContainer) {
            this.elements.cardContainer.classList.remove("active");
        }
        this.mapManager.clearClickMarker();
        this.currentPlace = null;
    }

    showToast(message) {
        let toast = document.getElementById("gmap-toast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "gmap-toast";
            toast.className = "gmap-toast";
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add("visible");

        setTimeout(() => {
            toast.classList.remove("visible");
        }, 2800);
    }
}
