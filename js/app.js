/**
 * Aplikasi Utama (Main Application Entry Point)
 */
import { CONFIG } from "./config.js";
import { MapManager } from "./map.js";
import { SearchManager } from "./search.js";
import { RouteManager } from "./routing.js";
import { PlacesManager } from "./places.js";
import { Storage } from "./storage.js";

document.addEventListener("DOMContentLoaded", () => {
    // 1. Inisialisasi Peta
    const mapManager = new MapManager("map");
    mapManager.init();

    // 2. Inisialisasi Detail Tempat (Places)
    const placesManager = new PlacesManager(
        mapManager,
        {
            cardContainer: document.getElementById("place-card"),
            closeBtn: document.getElementById("place-card-close"),
            placeTitle: document.getElementById("place-title"),
            placeAddress: document.getElementById("place-address"),
            placeCoords: document.getElementById("place-coords"),
            saveBtn: document.getElementById("place-save-btn"),
            copyCoordsBtn: document.getElementById("place-copy-coords-btn"),
            directionsBtn: document.getElementById("place-directions-btn"),
            shareBtn: document.getElementById("place-share-btn"),
        },
        {
            onRequestDirections: (place) => {
                openDirectionsPanel(null, place);
            },
            onFavoritesUpdated: () => {
                renderSavedPlacesList();
            },
        },
    );

    // 3. Inisialisasi Modul Rute (Routing)
    const routePanel = document.getElementById("route-panel");
    const routeSummary = document.getElementById("route-summary");
    const routeStepsList = document.getElementById("route-steps-list");
    const routeLoading = document.getElementById("route-loading");
    const routeError = document.getElementById("route-error");

    const routeOriginInput = document.getElementById("route-origin-input");
    const routeDestInput = document.getElementById("route-dest-input");

    const routeManager = new RouteManager(mapManager, {
        onLoading: (isLoading) => {
            routeLoading.style.display = isLoading ? "flex" : "none";
            if (isLoading) {
                routeError.style.display = "none";
            }
        },
        onSuccess: (route, mode) => {
            routeError.style.display = "none";
            routeSummary.style.display = "block";

            // Isi ringkasan jarak & waktu
            document.getElementById("route-duration").textContent =
                RouteManager.formatDuration(route.duration);
            document.getElementById("route-distance").textContent =
                RouteManager.formatDistance(route.distance);

            // Render daftar langkah navigasi
            renderRouteSteps(route);
        },
        onError: (msg) => {
            routeSummary.style.display = "none";
            routeError.textContent = msg;
            routeError.style.display = "block";
        },
        onSwap: (origin, dest) => {
            routeOriginInput.value = origin ? origin.name : "";
            routeDestInput.value = dest ? dest.name : "";
        },
    });

    // Simpan referensi global untuk kontrol rute & interaksi kartu tempat
    window._mapManager = mapManager;
    window._placesManager = placesManager;
    window._routeManager = routeManager;

    // 4. Inisialisasi Pencarian (Search)
    const searchContainer = document.getElementById("search-container");
    const searchManager = new SearchManager({
        searchInput: document.getElementById("search-input"),
        clearBtn: document.getElementById("search-clear-btn"),
        resultsContainer: document.getElementById("search-results"),
        onSelectPlace: (place) => {
            mapManager.setSearchMarker(place.lat, place.lng, place.name);
            placesManager.fetchPlaceDetails(place.lat, place.lng, place.name);
        },
    });

    // 5. Kontrol Tombol di Search Bar
    const searchDirectionsBtn = document.getElementById(
        "search-directions-btn",
    );
    searchDirectionsBtn.addEventListener("click", () => {
        openDirectionsPanel();
    });

    // 6. Layer Switcher (Ganti Peta)
    setupLayerSwitcher(mapManager);

    // 7. Kontrol Navigasi Mengambang (Zoom & Geolocation)
    setupFloatingControls(mapManager);

    // 8. Panel Rute Interaktif
    setupRoutePanelControls(routeManager, mapManager, placesManager);

    // 9. Sidebar Drawer & Tempat Favorit
    setupSidebarDrawer(mapManager, placesManager);

    // 10. Inisialisasi Lokasi (Deteksi Lokasi Pengguna atau Parameter URL)
    initLocation(mapManager, placesManager);
});

/**
 * Pengaturan Layer Switcher
 */
function setupLayerSwitcher(mapManager) {
    const layerToggleBtn = document.getElementById("layer-toggle-btn");
    const layerMenu = document.getElementById("layer-menu");
    const layerOptions = document.querySelectorAll(".layer-option");

    layerToggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        layerMenu.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (
            !layerMenu.contains(e.target) &&
            !layerToggleBtn.contains(e.target)
        ) {
            layerMenu.classList.remove("active");
        }
    });

    layerOptions.forEach((opt) => {
        opt.addEventListener("click", () => {
            const layerKey = opt.getAttribute("data-layer");
            layerOptions.forEach((o) => o.classList.remove("active"));
            opt.classList.add("active");

            mapManager.setBaseLayer(layerKey);
            layerMenu.classList.remove("active");

            // Update thumbnail tombol layer jika beralih ke satelit vs default
            const thumb = document.getElementById("current-layer-thumb");
            if (thumb) {
                thumb.src =
                    layerKey === "satellite"
                        ? "https://a.basemaps.cartocdn.com/rastertiles/voyager/13/6524/4260.png"
                        : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/13/4260/6524";
                const label = document.getElementById("current-layer-label");
                if (label) {
                    label.textContent =
                        layerKey === "satellite" ? "Peta" : "Satelit";
                }
            }
        });
    });
}

/**
 * Pengaturan Kontrol Mengambang (Kanan Bawah)
 */
function setupFloatingControls(mapManager) {
    document
        .getElementById("zoom-in-btn")
        .addEventListener("click", () => mapManager.zoomIn());
    document
        .getElementById("zoom-out-btn")
        .addEventListener("click", () => mapManager.zoomOut());
    document
        .getElementById("reset-view-btn")
        .addEventListener("click", () => mapManager.resetView());

    const myLocationBtn = document.getElementById("my-location-btn");
    myLocationBtn.addEventListener("click", () => {
        myLocationBtn.classList.add("locating");
        mapManager.locateUser(
            () => {
                myLocationBtn.classList.remove("locating");
            },
            (err) => {
                myLocationBtn.classList.remove("locating");
                alert(
                    "Tidak dapat mendeteksi lokasi: " +
                        (err.message || "Izin ditolak"),
                );
            },
        );
    });
}

/**
 * Logika Panel Petunjuk Arah (Directions)
 */
function setupRoutePanelControls(routeManager, mapManager, placesManager) {
    const routePanel = document.getElementById("route-panel");
    const closeRouteBtn = document.getElementById("route-close-btn");
    const swapBtn = document.getElementById("route-swap-btn");
    const modeBtns = document.querySelectorAll(".route-mode-btn");

    const originInput = document.getElementById("route-origin-input");
    const destInput = document.getElementById("route-dest-input");
    const myLocationOriginBtn = document.getElementById(
        "origin-my-location-btn",
    );

    closeRouteBtn.addEventListener("click", () => {
        routePanel.classList.remove("active");
        document.getElementById("search-container").style.display = "flex";
        routeManager.clearRoute();
        originInput.value = "";
        destInput.value = "";
        document.getElementById("route-summary").style.display = "none";
    });

    swapBtn.addEventListener("click", () => {
        routeManager.swapOriginDestination();
    });

    modeBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            modeBtns.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            const mode = btn.getAttribute("data-mode");
            routeManager.setMode(mode);
        });
    });

    // Tombol "Gunakan Lokasi Saya" untuk titik asal
    if (myLocationOriginBtn) {
        myLocationOriginBtn.addEventListener("click", () => {
            originInput.value = "Mendeteksi lokasi...";
            mapManager.locateUser(
                (coords) => {
                    originInput.value = "Lokasi Anda Saat Ini";
                    routeManager.setOrigin({
                        name: "Lokasi Anda Saat Ini",
                        lat: coords.latitude,
                        lng: coords.longitude,
                    });
                },
                () => {
                    originInput.value = "";
                    alert("Gagal mendeteksi lokasi saat ini.");
                },
            );
        });
    }

    // Setup input geocoding untuk Origin dan Destination di panel rute
    setupRouteInputAutocomplete(originInput, (place) => {
        routeManager.setOrigin(place);
    });

    setupRouteInputAutocomplete(destInput, (place) => {
        routeManager.setDestination(place);
    });
}

/**
 * Buka Panel Rute dengan Data Awal/Tujuan
 */
function openDirectionsPanel(origin = null, destination = null) {
    const routePanel = document.getElementById("route-panel");
    const searchContainer = document.getElementById("search-container");
    const originInput = document.getElementById("route-origin-input");
    const destInput = document.getElementById("route-dest-input");

    searchContainer.style.display = "none";
    routePanel.classList.add("active");

    if (destination) {
        destInput.value = destination.name;
        window._routeManager?.setDestination(destination);
    }
    if (origin) {
        originInput.value = origin.name;
        window._routeManager?.setOrigin(origin);
    } else if (!originInput.value) {
        originInput.focus();
    }
}

/**
 * Autocomplete khusus untuk input rute
 */
function setupRouteInputAutocomplete(inputElement, onSelect) {
    let timer = null;
    let dropdown = null;

    inputElement.addEventListener("input", (e) => {
        const val = e.target.value.trim();
        clearTimeout(timer);

        if (val.length < 2) {
            if (dropdown) dropdown.remove();
            return;
        }

        timer = setTimeout(async () => {
            try {
                const url = `${CONFIG.GEOCODING.SEARCH_URL}?format=json&limit=5&q=${encodeURIComponent(val)}`;
                const res = await fetch(url);
                const data = await res.json();

                if (dropdown) dropdown.remove();
                if (!data.length) return;

                dropdown = document.createElement("ul");
                dropdown.className = "route-autocomplete-dropdown";

                data.forEach((item) => {
                    const li = document.createElement("li");
                    const parts = item.display_name.split(",");
                    li.innerHTML = `<strong>${parts[0]}</strong> <span class="sub">${parts.slice(1, 3).join(",")}</span>`;
                    li.addEventListener("click", () => {
                        inputElement.value = parts[0];
                        dropdown.remove();
                        onSelect({
                            name: parts[0],
                            address: item.display_name,
                            lat: parseFloat(item.lat),
                            lng: parseFloat(item.lon),
                        });
                    });
                    dropdown.appendChild(li);
                });

                inputElement.parentNode.style.position = "relative";
                inputElement.parentNode.appendChild(dropdown);
            } catch (e) {
                console.error(e);
            }
        }, 350);
    });

    document.addEventListener("click", (e) => {
        if (
            dropdown &&
            !inputElement.contains(e.target) &&
            !dropdown.contains(e.target)
        ) {
            dropdown.remove();
        }
    });
}

/**
 * Render Instruksi Langkah Navigasi
 */
function renderRouteSteps(route) {
    const stepsList = document.getElementById("route-steps-list");
    stepsList.innerHTML = "";

    if (!route.legs || !route.legs[0] || !route.legs[0].steps) return;

    const steps = route.legs[0].steps;

    steps.forEach((step, idx) => {
        const maneuver = RouteManager.formatManeuver(step);
        const li = document.createElement("li");
        li.className = "route-step-item";

        const stepDist =
            step.distance > 0 ? RouteManager.formatDistance(step.distance) : "";

        li.innerHTML = `
      <div class="step-icon step-${maneuver.icon}">
        ${getManeuverSvg(maneuver.icon)}
      </div>
      <div class="step-content">
        <div class="step-text">${maneuver.text}</div>
        ${stepDist ? `<div class="step-dist">${stepDist}</div>` : ""}
      </div>
    `;

        // Klik langkah untuk menyorot tikungan pada peta
        li.addEventListener("click", () => {
            document
                .querySelectorAll(".route-step-item")
                .forEach((el) => el.classList.remove("active"));
            li.classList.add("active");
            if (step.maneuver && step.maneuver.location) {
                window._routeManager?.highlightStep(step.maneuver.location);
            }
        });

        stepsList.appendChild(li);
    });
}

/**
 * Helper Ikon SVG Manuver Arah
 */
function getManeuverSvg(type) {
    switch (type) {
        case "turn-left":
        case "slight-left":
            return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 10v5h2V12h5a3 3 0 0 0 3-3V4h-2v5a1 1 0 0 1-1 1H11v-3L6 11l5 5v-3z"/></svg>`;
        case "turn-right":
        case "slight-right":
            return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M15 10v5h-2V12H8a3 3 0 0 1-3-3V4h2v5a1 1 0 0 0 1 1h5v-3l5 4-5 4v-3z"/></svg>`;
        case "uturn":
            return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M18 14v4h-2v-4a4 4 0 0 0-8 0v4H6v-4a6 6 0 1 1 12 0zm-7 5.5l-4-4 4-4v8z"/></svg>`;
        case "arrive":
            return `<svg viewBox="0 0 24 24" width="20" height="20" fill="#EA4335"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>`;
        case "depart":
            return `<svg viewBox="0 0 24 24" width="20" height="20" fill="#10B981"><circle cx="12" cy="12" r="8"/></svg>`;
        default:
            return `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11 4v12.17l-3.59-3.58L6 14l6 6 6-6-1.41-1.41L13 16.17V4h-2z" transform="rotate(180 12 12)"/></svg>`;
    }
}

/**
 * Pengaturan Sidebar Drawer (Tempat Tersimpan & Menu)
 */
function setupSidebarDrawer(mapManager, placesManager) {
    const menuBtn = document.getElementById("search-menu-btn");
    const sidebar = document.getElementById("sidebar-drawer");
    const backdrop = document.getElementById("sidebar-backdrop");
    const closeBtn = document.getElementById("sidebar-close-btn");

    function openSidebar() {
        sidebar.classList.add("active");
        backdrop.classList.add("active");
        renderSavedPlacesList();
    }

    function closeSidebar() {
        sidebar.classList.remove("active");
        backdrop.classList.remove("active");
    }

    menuBtn.addEventListener("click", openSidebar);
    closeBtn.addEventListener("click", closeSidebar);
    backdrop.addEventListener("click", closeSidebar);

    // Pasang render awal
    renderSavedPlacesList();

    // Tombol bersihkan semua tempat tersimpan
    const clearFavsBtn = document.getElementById("clear-saved-places-btn");
    if (clearFavsBtn) {
        clearFavsBtn.addEventListener("click", () => {
            if (confirm("Hapus semua tempat favorit yang tersimpan?")) {
                localStorage.removeItem("gmap_saved_places");
                renderSavedPlacesList();
            }
        });
    }
}

/**
 * Render Daftar Tempat Tersimpan di Sidebar
 */
function renderSavedPlacesList() {
    const container = document.getElementById("saved-places-list");
    if (!container) return;

    const favorites = Storage.getFavorites();

    if (favorites.length === 0) {
        container.innerHTML = `
      <div class="empty-favorites">
        <svg viewBox="0 0 24 24" width="40" height="40" fill="#CBD5E1">
          <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
        </svg>
        <p>Belum ada tempat tersimpan.<br><small>Klik sembarang lokasi di peta dan tekan tombol "Simpan".</small></p>
      </div>
    `;
        return;
    }

    let html = "";
    favorites.forEach((fav) => {
        html += `
      <li class="saved-place-item" data-id="${fav.id}" data-lat="${fav.lat}" data-lng="${fav.lng}">
        <div class="saved-place-icon">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#EA4335">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
          </svg>
        </div>
        <div class="saved-place-info">
          <div class="saved-place-name">${fav.name}</div>
          <div class="saved-place-addr">${fav.address || `${fav.lat.toFixed(4)}, ${fav.lng.toFixed(4)}`}</div>
        </div>
        <button class="delete-fav-btn" title="Hapus dari tersimpan" data-id="${fav.id}">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </li>
    `;
    });

    container.innerHTML = html;

    // Pasang listener klik untuk melompat ke lokasi
    container.querySelectorAll(".saved-place-item").forEach((el) => {
        el.addEventListener("click", (e) => {
            if (e.target.closest(".delete-fav-btn")) return;
            const lat = parseFloat(el.getAttribute("data-lat"));
            const lng = parseFloat(el.getAttribute("data-lng"));
            const name = el.querySelector(".saved-place-name").textContent;

            document
                .getElementById("sidebar-drawer")
                .classList.remove("active");
            document
                .getElementById("sidebar-backdrop")
                .classList.remove("active");

            window._mapManager?.map.flyTo([lat, lng], 16, { duration: 1.2 });
            window._placesManager?.fetchPlaceDetails(lat, lng, name);
        });
    });

    // Pasang listener tombol hapus
    container.querySelectorAll(".delete-fav-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            Storage.removeFavorite(id);
            renderSavedPlacesList();
        });
    });
}

/**
 * Inisialisasi Lokasi Awal Peta
 * 1. Jika ada parameter URL (lat & lng), utamakan lokasi tersebut.
 * 2. Jika tidak ada, otomatis deteksi posisi pengguna saat ini (Geolocation GPS),
 *    pusatkan peta, dan simpan koordinatnya untuk sesi berikutnya.
 */
function initLocation(mapManager, placesManager) {
    // Simpan reference global untuk kemudahan akses event
    window._mapManager = mapManager;
    window._placesManager = placesManager;

    const urlParams = new URLSearchParams(window.location.search);
    const lat = parseFloat(urlParams.get("lat"));
    const lng = parseFloat(urlParams.get("lng"));
    const name = urlParams.get("name")
        ? decodeURIComponent(urlParams.get("name"))
        : null;

    // Jika pengguna membuka tautan dengan koordinat spesifik
    if (!isNaN(lat) && !isNaN(lng)) {
        mapManager.map.flyTo([lat, lng], 16, { duration: 1.2 });
        placesManager.fetchPlaceDetails(lat, lng, name);
        return;
    }

    // Jika tidak ada koordinat di URL, otomatis deteksi lokasi saat ini
    const myLocationBtn = document.getElementById("my-location-btn");
    if (myLocationBtn) myLocationBtn.classList.add("locating");

    mapManager.locateUser(
        () => {
            if (myLocationBtn) myLocationBtn.classList.remove("locating");
            placesManager.showToast("Peta disesuaikan ke lokasi Anda saat ini");
        },
        (err) => {
            if (myLocationBtn) myLocationBtn.classList.remove("locating");
            console.warn("Izin lokasi tidak diberikan atau tidak tersedia:", err);
        }
    );
}
