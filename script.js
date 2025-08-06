class AnimeExplorer {
    constructor() {
        this.currentTab = 'search';
        this.favorites = JSON.parse(localStorage.getItem('animeFavorites')) || [];
        this.translateToEnglish = false;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTrending();
        this.loadSeasonal();
        this.displayFavorites();
    }

    bindEvents() {
        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.searchAnime());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchAnime();
        });

        // Random anime
        document.getElementById('randomBtn').addEventListener('click', () => this.getRandomAnime());

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Filters
        ['genreFilter', 'yearFilter', 'typeFilter'].forEach(filterId => {
            document.getElementById(filterId).addEventListener('change', () => this.applyFilters());
        });

        // Translation toggle
        document.getElementById('translateSwitch').addEventListener('change', (e) => {
            this.translateToEnglish = e.target.checked;
            // Refresh current tab results to update titles
            if (this.currentTab === 'search') this.searchAnime();
            if (this.currentTab === 'trending') this.loadTrending();
            if (this.currentTab === 'seasonal') this.loadSeasonal();
            if (this.currentTab === 'favorites') this.displayFavorites();
        });
    }

    async searchAnime() {
        const query = document.getElementById('searchInput').value.trim();
        if (!query) return;

        this.showLoading();
        try {
            const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=20`);
            const data = await response.json();
            this.displayResults(data.data, 'searchResults');
        } catch (error) {
            console.error('Search error:', error);
            this.showError('Failed to search anime. Please try again.');
        }
        this.hideLoading();
    }

    async getRandomAnime() {
        this.showLoading();
        try {
            const response = await fetch('https://api.jikan.moe/v4/random/anime');
            const data = await response.json();
            this.displayResults([data.data], 'searchResults');
            this.switchTab('search');
        } catch (error) {
            console.error('Random anime error:', error);
            this.showError('Failed to get random anime. Please try again.');
        }
        this.hideLoading();
    }

    async loadTrending() {
        try {
            const response = await fetch('https://api.jikan.moe/v4/top/anime?limit=20');
            const data = await response.json();
            this.displayResults(data.data, 'trendingResults');
        } catch (error) {
            console.error('Trending error:', error);
        }
    }

    async loadSeasonal() {
        try {
            const currentYear = new Date().getFullYear();
            const currentSeason = this.getCurrentSeason();
            const response = await fetch(`https://api.jikan.moe/v4/seasons/${currentYear}/${currentSeason}?limit=20`);
            const data = await response.json();
            this.displayResults(data.data, 'seasonalResults');
        } catch (error) {
            console.error('Seasonal error:', error);
        }
    }

    getCurrentSeason() {
        const month = new Date().getMonth() + 1;
        if (month >= 3 && month <= 5) return 'spring';
        if (month >= 6 && month <= 8) return 'summer';
        if (month >= 9 && month <= 11) return 'fall';
        return 'winter';
    }

    displayResults(animeList, containerId) {
        const container = document.getElementById(containerId);
        
        if (!animeList || animeList.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No results found</h3>
                    <p>Try a different search term or check your filters.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = animeList.map(anime => this.createAnimeCard(anime)).join('');
    }

    createAnimeCard(anime) {
        const isFavorited = this.favorites.some(fav => fav.mal_id === anime.mal_id);
        const genres = anime.genres ? anime.genres.slice(0, 3).map(g => g.name) : [];
        const year = anime.year || (anime.aired && anime.aired.from ? new Date(anime.aired.from).getFullYear() : 'N/A');
        const score = anime.score || 'N/A';
        const title = this.translateToEnglish && anime.title_english ? anime.title_english : anime.title;

        return `
            <div class="anime-card" data-id="${anime.mal_id}">
                <img src="${anime.images.jpg.large_image_url}" alt="${title}" loading="lazy">
                <div class="card-content">
                    <div class="card-title">${title}</div>
                    <div class="card-info">
                        <span class="rating">⭐ ${score}</span>
                        <span class="year">${year}</span>
                    </div>
                    <div class="genres">
                        ${genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                    </div>
                    <div class="card-actions">
                        <span class="type">${anime.type || 'Anime'}</span>
                        <button class="favorite-btn ${isFavorited ? 'favorited' : ''}" 
                                onclick="animeExplorer.toggleFavorite(${anime.mal_id}, '${title.replace(/'/g, "\\'")}', '${anime.images.jpg.large_image_url}')">
                            ${isFavorited ? '❤️' : '🤍'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    toggleFavorite(malId, title, imageUrl) {
        const existingIndex = this.favorites.findIndex(fav => fav.mal_id === malId);
        
        if (existingIndex > -1) {
            this.favorites.splice(existingIndex, 1);
        } else {
            this.favorites.push({ mal_id: malId, title, imageUrl });
        }
        
        localStorage.setItem('animeFavorites', JSON.stringify(this.favorites));
        this.updateFavoriteButtons();
        
        if (this.currentTab === 'favorites') {
            this.displayFavorites();
        }
    }

    updateFavoriteButtons() {
        document.querySelectorAll('.favorite-btn').forEach(btn => {
            const malId = parseInt(btn.getAttribute('onclick').match(/\d+/)[0]);
            const isFavorited = this.favorites.some(fav => fav.mal_id === malId);
            btn.textContent = isFavorited ? '❤️' : '🤍';
            btn.classList.toggle('favorited', isFavorited);
        });
    }

    displayFavorites() {
        const container = document.getElementById('favoritesResults');
        if (this.favorites.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No favorites yet</h3>
                    <p>Add some anime to your favorites by clicking the heart icon!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.favorites.map(anime => `
            <div class="anime-card" data-id="${anime.mal_id}">
                <img src="${anime.imageUrl}" alt="${anime.title}" loading="lazy">
                <div class="card-content">
                    <div class="card-title">${anime.title}</div>
                    <div class="card-actions">
                        <span class="type">Favorite</span>
                        <button class="favorite-btn favorited" 
                                onclick="animeExplorer.toggleFavorite(${anime.mal_id}, '${anime.title.replace(/'/g, "\\'")}', '${anime.imageUrl}')">
                            ❤️
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    switchTab(tabName) {
        // Update active states
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-content`);
        });
        
        this.currentTab = tabName;
    }

    applyFilters() {
        // This would be enhanced to filter the current results
        // For now, it triggers a new search with filters
        if (this.currentTab === 'search') {
            this.searchAnime();
        }
    }

    showLoading() {
        document.getElementById('loading').style.display = 'block';
    }

    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }

    showError(message) {
        // Simple error display - could be enhanced with a proper modal
        alert(message);
    }
}

// Initialize the application when the page loads
const animeExplorer = new AnimeExplorer();
