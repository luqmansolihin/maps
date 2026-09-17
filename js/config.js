/**
 * Konfigurasi Peta dan API
 */
export const CONFIG = {
    // Koordinat default (Monumen Nasional, Jakarta, Indonesia)
    DEFAULT_CENTER: [-6.175392, 106.827153],
    DEFAULT_ZOOM: 14,
    MIN_ZOOM: 3,
    MAX_ZOOM: 19,

    // Penyedia Tile Peta
    TILE_LAYERS: {
        streets: {
            name: "Jalan (Default)",
            url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
            subdomains: "abcd",
            thumbnail:
                "https://a.basemaps.cartocdn.com/rastertiles/voyager/13/6524/4260.png",
        },
        satellite: {
            name: "Satelit",
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution:
                "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
            maxZoom: 18,
            thumbnail:
                "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/13/4260/6524",
        },
        satelliteLabels: {
            name: "Label Satelit",
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            attribution: "",
            maxZoom: 18,
        },
        dark: {
            name: "Mode Gelap",
            url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 19,
            subdomains: "abcd",
        },
        terrain: {
            name: "Topografi",
            url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
            attribution:
                'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
            maxZoom: 17,
        },
        osm: {
            name: "OpenStreetMap",
            url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
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
};
