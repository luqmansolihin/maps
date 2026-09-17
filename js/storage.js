/**
 * Modul Penyimpanan Lokal (LocalStorage)
 * Mengelola riwayat pencarian, tempat favorit (bookmarks), dan preferensi pengguna
 */

const STORAGE_KEYS = {
    FAVORITES: "gmap_saved_places",
    HISTORY: "gmap_search_history",
    SETTINGS: "gmap_settings",
};

export const Storage = {
    // --- Tempat Favorit (Bookmarks) ---
    getFavorites() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.FAVORITES);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Gagal memuat favorit:", e);
            return [];
        }
    },

    addFavorite(place) {
        const favorites = this.getFavorites();
        // Hindari duplikasi berdasarkan koordinat atau id
        const exists = favorites.some(
            (f) =>
                Math.abs(f.lat - place.lat) < 0.0001 &&
                Math.abs(f.lng - place.lng) < 0.0001,
        );
        if (!exists) {
            const item = {
                id: Date.now().toString(),
                name: place.name || "Tempat Tanpa Nama",
                address: place.address || "",
                lat: Number(place.lat),
                lng: Number(place.lng),
                savedAt: new Date().toISOString(),
            };
            favorites.unshift(item);
            localStorage.setItem(
                STORAGE_KEYS.FAVORITES,
                JSON.stringify(favorites),
            );
            return item;
        }
        return null;
    },

    removeFavorite(id) {
        let favorites = this.getFavorites();
        favorites = favorites.filter((f) => f.id !== id);
        localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
        return favorites;
    },

    isFavorite(lat, lng) {
        const favorites = this.getFavorites();
        return favorites.some(
            (f) =>
                Math.abs(f.lat - lat) < 0.0001 &&
                Math.abs(f.lng - lng) < 0.0001,
        );
    },

    // --- Riwayat Pencarian ---
    getHistory() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    },

    addHistory(query, place) {
        if (!query) return;
        let history = this.getHistory();
        // Hapus jika query sudah ada sebelumnya
        history = history.filter(
            (h) => h.query.toLowerCase() !== query.toLowerCase(),
        );
        history.unshift({
            query,
            placeName: place ? place.name : query,
            lat: place ? place.lat : null,
            lng: place ? place.lng : null,
            timestamp: Date.now(),
        });
        // Simpan maksimal 15 riwayat terbaru
        if (history.length > 15) history = history.slice(0, 15);
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    },

    clearHistory() {
        localStorage.removeItem(STORAGE_KEYS.HISTORY);
    },

    // --- Pengaturan Pengguna ---
    getSettings() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
            return data ? JSON.parse(data) : { activeLayer: "streets" };
        } catch (e) {
            return { activeLayer: "streets" };
        }
    },

    saveSetting(key, value) {
        const settings = this.getSettings();
        settings[key] = value;
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    },
};
