/**
 * Modul Pencarian Lokasi (Geocoding & Autocomplete)
 */
import { CONFIG } from "./config.js";
import { Storage } from "./storage.js";

export class SearchManager {
    constructor(options) {
        this.searchInput = options.searchInput;
        this.clearBtn = options.clearBtn;
        this.resultsContainer = options.resultsContainer;
        this.onSelectPlace = options.onSelectPlace;

        this.debounceTimer = null;
        this.abortController = null;
        this.currentIndex = -1;
        this.currentSuggestions = [];

        this.init();
    }

    init() {
        // Input listener dengan debounce
        this.searchInput.addEventListener("input", (e) => {
            const query = e.target.value.trim();
            if (this.clearBtn) {
                this.clearBtn.style.display =
                    query.length > 0 ? "flex" : "none";
            }

            if (query.length < 2) {
                if (query.length === 0) {
                    this.showHistory();
                } else {
                    this.hideSuggestions();
                }
                return;
            }

            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.fetchSuggestions(query);
            }, 350);
        });

        // Tampilkan riwayat pencarian saat input di-klik jika kosong
        this.searchInput.addEventListener("focus", () => {
            if (this.searchInput.value.trim().length === 0) {
                this.showHistory();
            }
        });

        // Navigasi keyboard (Atas, Bawah, Enter, Escape)
        this.searchInput.addEventListener("keydown", (e) => {
            if (["ArrowDown", "ArrowUp", "Enter", "Escape"].includes(e.key)) {
                this.handleKeydown(e);
            }
        });

        // Tombol Clear
        if (this.clearBtn) {
            this.clearBtn.addEventListener("click", () => {
                this.searchInput.value = "";
                this.clearBtn.style.display = "none";
                this.hideSuggestions();
                this.searchInput.focus();
            });
        }

        // Tutup dropdown saat klik di luar
        document.addEventListener("click", (e) => {
            if (
                !this.searchInput.contains(e.target) &&
                !this.resultsContainer.contains(e.target)
            ) {
                this.hideSuggestions();
            }
        });
    }

    async fetchSuggestions(query) {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        try {
            this.resultsContainer.innerHTML =
                '<div class="search-loading">Mencari lokasi...</div>';
            this.resultsContainer.classList.add("active");

            const url = `${CONFIG.GEOCODING.SEARCH_URL}?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(query)}`;
            const res = await fetch(url, {
                signal: this.abortController.signal,
                headers: {
                    Accept: "application/json",
                    "Accept-Language": "id,en",
                },
            });

            if (!res.ok) throw new Error("Gagal mengambil data geocoding");
            const data = await res.json();
            this.currentSuggestions = data;
            this.renderSuggestions(data);
        } catch (err) {
            if (err.name !== "AbortError") {
                this.resultsContainer.innerHTML =
                    '<div class="search-empty">Tidak dapat menemukan lokasi</div>';
            }
        }
    }

    renderSuggestions(items) {
        if (!items || items.length === 0) {
            this.resultsContainer.innerHTML =
                '<div class="search-empty">Lokasi tidak ditemukan</div>';
            this.resultsContainer.classList.add("active");
            return;
        }

        this.currentIndex = -1;
        let html = '<ul class="suggestions-list">';

        items.forEach((item, idx) => {
            const parts = item.display_name.split(",");
            const mainName = parts[0];
            const subName = parts.slice(1).join(",").trim();

            html += `
        <li class="suggestion-item" data-index="${idx}">
          <div class="suggestion-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          </div>
          <div class="suggestion-text">
            <div class="suggestion-main">${this.escapeHtml(mainName)}</div>
            <div class="suggestion-sub">${this.escapeHtml(subName)}</div>
          </div>
        </li>
      `;
        });

        html += "</ul>";
        this.resultsContainer.innerHTML = html;
        this.resultsContainer.classList.add("active");

        // Event listener untuk tiap item
        const listElements =
            this.resultsContainer.querySelectorAll(".suggestion-item");
        listElements.forEach((el) => {
            el.addEventListener("click", () => {
                const index = parseInt(el.getAttribute("data-index"), 10);
                this.selectItem(this.currentSuggestions[index]);
            });
        });
    }

    showHistory() {
        const history = Storage.getHistory();
        if (history.length === 0) {
            this.hideSuggestions();
            return;
        }

        let html = `
      <div class="history-header">
        <span>Riwayat Pencarian</span>
        <button id="clear-history-btn" class="clear-history-action">Hapus Semua</button>
      </div>
      <ul class="suggestions-list history-list">
    `;

        history.forEach((h, idx) => {
            html += `
        <li class="suggestion-item history-item" data-history-idx="${idx}">
          <div class="suggestion-icon history-icon">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.25 2.52.77-1.28-3.52-2.09V8z"/>
            </svg>
          </div>
          <div class="suggestion-text">
            <div class="suggestion-main">${this.escapeHtml(h.placeName || h.query)}</div>
          </div>
        </li>
      `;
        });

        html += "</ul>";
        this.resultsContainer.innerHTML = html;
        this.resultsContainer.classList.add("active");

        const clearBtn =
            this.resultsContainer.querySelector("#clear-history-btn");
        if (clearBtn) {
            clearBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                Storage.clearHistory();
                this.hideSuggestions();
            });
        }

        const items = this.resultsContainer.querySelectorAll(".history-item");
        items.forEach((el) => {
            el.addEventListener("click", () => {
                const idx = parseInt(el.getAttribute("data-history-idx"), 10);
                const item = history[idx];
                if (item.lat && item.lng) {
                    this.selectItem({
                        lat: item.lat,
                        lon: item.lng,
                        display_name: item.placeName,
                    });
                } else {
                    this.searchInput.value = item.query;
                    this.fetchSuggestions(item.query);
                }
            });
        });
    }

    handleKeydown(e) {
        const items =
            this.resultsContainer.querySelectorAll(".suggestion-item");
        if (!items.length) {
            if (e.key === "Enter") {
                const query = this.searchInput.value.trim();
                if (query) this.fetchSuggestions(query);
            }
            return;
        }

        if (e.key === "ArrowDown") {
            e.preventDefault();
            this.currentIndex = (this.currentIndex + 1) % items.length;
            this.updateActiveItem(items);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            this.currentIndex =
                (this.currentIndex - 1 + items.length) % items.length;
            this.updateActiveItem(items);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (
                this.currentIndex >= 0 &&
                this.currentIndex < this.currentSuggestions.length
            ) {
                this.selectItem(this.currentSuggestions[this.currentIndex]);
            } else if (this.currentSuggestions.length > 0) {
                this.selectItem(this.currentSuggestions[0]);
            }
        } else if (e.key === "Escape") {
            this.hideSuggestions();
        }
    }

    updateActiveItem(items) {
        items.forEach((item, i) => {
            if (i === this.currentIndex) {
                item.classList.add("selected");
                item.scrollIntoView({ block: "nearest" });
            } else {
                item.classList.remove("selected");
            }
        });
    }

    selectItem(place) {
        if (!place) return;
        const parts = place.display_name.split(",");
        const mainName = parts[0].trim();

        this.searchInput.value = mainName;
        if (this.clearBtn) this.clearBtn.style.display = "flex";
        this.hideSuggestions();

        const placeObj = {
            name: mainName,
            address: place.display_name,
            lat: parseFloat(place.lat),
            lng: parseFloat(place.lon),
            raw: place,
        };

        Storage.addHistory(mainName, placeObj);

        if (this.onSelectPlace) {
            this.onSelectPlace(placeObj);
        }
    }

    hideSuggestions() {
        this.resultsContainer.classList.remove("active");
        this.resultsContainer.innerHTML = "";
        this.currentIndex = -1;
    }

    escapeHtml(str) {
        if (!str) return "";
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }
}
