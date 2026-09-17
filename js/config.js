/**
 * Konfigurasi Peta dan API
 */
export const CONFIG = {
    // Koordinat default (Monumen Nasional, Jakarta, Indonesia)
    DEFAULT_CENTER: [-6.175392, 106.827153],
    DEFAULT_ZOOM: 14,
    MIN_ZOOM: 3,
    MAX_ZOOM: 19,

    // Penyedia Tile Peta (100% Bebas Biaya & Tanpa Watermark)
    TILE_LAYERS: {
        streets: {
            name: "Jalan (Default)",
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            maxNativeZoom: 19,
            subdomains: "abc",
            thumbnail: "https://a.tile.openstreetmap.org/13/6524/4260.png",
        },
        satellite: {
            name: "Satelit",
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution:
                "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
            maxZoom: 19,
            maxNativeZoom: 18,
            thumbnail:
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/13/4260/6524",
        },
        satelliteLabels: {
            name: "Label Satelit",
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            attribution: "",
            maxZoom: 19,
            maxNativeZoom: 18,
        },
        dark: {
            name: "Mode Gelap",
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
            maxNativeZoom: 19,
            subdomains: "abc",
        },
        terrain: {
            name: "Topografi",
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
            attribution: "Tiles &copy; Esri &mdash; USGS, NOAA",
            maxZoom: 19,
            maxNativeZoom: 16, // Server Esri Topo hanya memiliki data hingga zoom 16, selebihnya Leaflet akan melakukan upscale otomatis
        },
    },

    // Layanan Geocoding (Nominatim OpenStreetMap)
    GEOCODING: {
        SEARCH_URL: "https://nominatim.openstreetmap.org/search",
        REVERSE_URL: "https://nominatim.openstreetmap.org/reverse",
    },

    // Layanan Rute & Petunjuk Arah (OSRM)
    ROUTING: {
        driving: "https://router.project-osrm.org/route/v1/driving",
        cycling:
            "https://routing.openstreetmap.de/routed-bike/route/v1/driving",
        walking:
            "https://routing.openstreetmap.de/routed-foot/route/v1/driving",
    },

    // Layanan Cuaca (Standar BMKG / WMO)
    WEATHER: {
        API_URL: "https://api.open-meteo.com/v1/forecast",
    },
};
