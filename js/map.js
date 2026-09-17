/**
 * Modul Peta Utama (Leaflet Map Engine)
 */
import { CONFIG } from "./config.js";
import { Storage } from "./storage.js";

export class MapManager {
    constructor(containerId = "map") {
        this.containerId = containerId;
        this.map = null;
        this.activeTileLayer = null;
        this.overlayLayers = {};
        this.searchMarker = null;
        this.clickMarker = null;
        this.userLocationMarker = null;
        this.userAccuracyCircle = null;
        this.routeMarkers = [];
        this.routePolyline = null;
        this.currentLayerKey = Storage.getSettings().activeLayer || "streets";
    }

    init() {
        // Inisialisasi peta Leaflet dengan kontrol default dinonaktifkan untuk UI ala Google Maps
        this.map = L.map(this.containerId, {
            center: CONFIG.DEFAULT_CENTER,
            zoom: CONFIG.DEFAULT_ZOOM,
            minZoom: CONFIG.MIN_ZOOM,
            maxZoom: CONFIG.MAX_ZOOM,
            zoomControl: false, // Digantikan dengan kontrol kustom di kanan bawah
            attributionControl: false, // Kita buatkan kontrol atribusi kustom
        });

        // Tambahkan atribusi Leaflet di pojok kanan bawah
        L.control
            .attribution({ position: "bottomright", prefix: false })
            .addTo(this.map);

        // Terapkan layer dasar
        this.setBaseLayer(this.currentLayerKey);

        return this.map;
    }

    setBaseLayer(layerKey) {
        const layerConfig =
            CONFIG.TILE_LAYERS[layerKey] || CONFIG.TILE_LAYERS.streets;

        // Hapus layer lama jika ada
        if (this.activeTileLayer) {
            this.map.removeLayer(this.activeTileLayer);
        }
        if (this.overlayLayers.satelliteLabels) {
            this.map.removeLayer(this.overlayLayers.satelliteLabels);
            delete this.overlayLayers.satelliteLabels;
        }

        // Tambahkan layer baru
        this.activeTileLayer = L.tileLayer(layerConfig.url, {
            attribution: layerConfig.attribution,
            maxZoom: layerConfig.maxZoom || 19,
            subdomains: layerConfig.subdomains || "abc",
        }).addTo(this.map);

        // Jika satelit dipilih, tambahkan layer teks/label jalan di atasnya
        if (layerKey === "satellite") {
            const labelConfig = CONFIG.TILE_LAYERS.satelliteLabels;
            this.overlayLayers.satelliteLabels = L.tileLayer(labelConfig.url, {
                maxZoom: labelConfig.maxZoom || 18,
                pane: "overlayPane",
            }).addTo(this.map);
        }

        this.currentLayerKey = layerKey;
        Storage.saveSetting("activeLayer", layerKey);
    }

    // --- Ikon Kustom Ala Google Maps ---
    createGooglePinIcon(color = "#EA4335", pulse = false) {
        return L.divIcon({
            className: `gmaps-pin-container ${pulse ? "pulse-pin" : ""}`,
            html: `
        <div class="gmaps-pin" style="--pin-color: ${color};">
          <svg viewBox="0 0 24 24" width="34" height="42" fill="${color}">
            <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 7.13 15.34 7.43 15.76.29.4.86.4 1.14 0C12.87 23.34 20 13.25 20 8c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
          </svg>
          <div class="pin-shadow"></div>
        </div>
      `,
            iconSize: [34, 42],
            iconAnchor: [17, 40],
            popupAnchor: [0, -38],
        });
    }

    createWaypointIcon(type = "origin") {
        const isOrigin = type === "origin";
        const bg = isOrigin ? "#10B981" : "#EA4335"; // Hijau untuk Asal, Merah untuk Tujuan
        const label = isOrigin ? "A" : "B";

        return L.divIcon({
            className: "gmaps-waypoint-container",
            html: `
        <div class="gmaps-waypoint" style="background-color: ${bg};">
          <span>${label}</span>
        </div>
      `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14],
        });
    }

    createUserLocationIcon() {
        return L.divIcon({
            className: "gmaps-user-location",
            html: `
        <div class="user-pulse-circle"></div>
        <div class="user-center-dot"></div>
      `,
            iconSize: [22, 22],
            iconAnchor: [11, 11],
        });
    }

    // --- Penanda Lokasi (Markers) ---
    setSearchMarker(lat, lng, title) {
        if (this.searchMarker) {
            this.map.removeLayer(this.searchMarker);
        }
        const icon = this.createGooglePinIcon("#EA4335", true);
        this.searchMarker = L.marker([lat, lng], { icon, title }).addTo(
            this.map,
        );
        this.map.flyTo([lat, lng], 16, { duration: 1.2 });
        return this.searchMarker;
    }

    clearSearchMarker() {
        if (this.searchMarker) {
            this.map.removeLayer(this.searchMarker);
            this.searchMarker = null;
        }
    }

    setClickMarker(lat, lng) {
        if (this.clickMarker) {
            this.map.removeLayer(this.clickMarker);
        }
        const icon = this.createGooglePinIcon("#EA4335", false);
        this.clickMarker = L.marker([lat, lng], { icon }).addTo(this.map);
        return this.clickMarker;
    }

    clearClickMarker() {
        if (this.clickMarker) {
            this.map.removeLayer(this.clickMarker);
            this.clickMarker = null;
        }
    }

    // --- Geolocation (Lokasi Saya) ---
    locateUser(onSuccess, onError) {
        if (!navigator.geolocation) {
            if (onError)
                onError(
                    new Error("Geolocation tidak didukung pada peramban ini."),
                );
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;

                if (this.userLocationMarker)
                    this.map.removeLayer(this.userLocationMarker);
                if (this.userAccuracyCircle)
                    this.map.removeLayer(this.userAccuracyCircle);

                // Buat lingkaran akurasi
                this.userAccuracyCircle = L.circle([latitude, longitude], {
                    radius: Math.max(accuracy, 30),
                    color: "#4285F4",
                    fillColor: "#4285F4",
                    fillOpacity: 0.15,
                    weight: 1,
                }).addTo(this.map);

                // Buat titik biru
                this.userLocationMarker = L.marker([latitude, longitude], {
                    icon: this.createUserLocationIcon(),
                    zIndexOffset: 1000,
                }).addTo(this.map);

                this.map.flyTo([latitude, longitude], 16, { duration: 1.2 });

                if (onSuccess) onSuccess({ latitude, longitude, accuracy });
            },
            (err) => {
                console.warn("Gagal mendapatkan lokasi:", err);
                if (onError) onError(err);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
        );
    }

    // --- Zoom Controls ---
    zoomIn() {
        this.map.zoomIn();
    }

    zoomOut() {
        this.map.zoomOut();
    }

    resetView() {
        this.map.flyTo(CONFIG.DEFAULT_CENTER, CONFIG.DEFAULT_ZOOM, {
            duration: 1,
        });
    }
}
