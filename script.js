// Initialize empty games data array
let gamesData = [];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

function initializePage() {
    const loadingArea = document.getElementById('loadingArea');
    const statsArea = document.getElementById('statsArea');
    const mainHeader = document.getElementById('mainHeader');
    
    // Simulate loading
    setTimeout(() => {
        if (gamesData.length === 0) {
            loadingArea.innerHTML = '<div class="loading-message">[ NO GAME DATA AVAILABLE ]</div>';
        } else {
            loadingArea.style.display = 'none';
            statsArea.style.display = 'block';
            mainHeader.classList.add('loaded');
            renderGamesList();
            renderLeaderboard();
            initializeSearch();
        }
    }, 1000);
}

function switchMainTab(tabName) {
    // Hide all main tabs
    const allMainTabs = document.querySelectorAll('.main-tab-content');
    allMainTabs.forEach(tab => tab.style.display = 'none');
    
    // Remove active class from all buttons
    const allMainBtns = document.querySelectorAll('.main-tab-btn');
    allMainBtns.forEach(btn => btn.classList.remove('active'));
    
    // Show selected tab
    const selectedTab = document.getElementById('main-tab-' + tabName);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
    
    // Add active class to clicked button
    const selectedBtn = document.getElementById('btn-main-' + tabName);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
}

function renderGamesList() {
    const gamesList = document.getElementById('gamesList');
    if (!gamesList) return;
    
    if (gamesData.length === 0) {
        gamesList.innerHTML = '<div class="loading-message">No games to display</div>';
        return;
    }
    
    // Render games list logic would go here
    gamesList.innerHTML = '';
    // Implementation for rendering games...
}

function renderLeaderboard() {
    const leaderboardContainer = document.getElementById('leaderboardContainer');
    if (!leaderboardContainer) return;
    
    if (gamesData.length === 0) {
        leaderboardContainer.innerHTML = '<div class="loading-message">No leaderboard data available</div>';
        return;
    }
    
    // Render leaderboard logic would go here
    leaderboardContainer.innerHTML = '';
    // Implementation for rendering leaderboard...
}

function initializeSearch() {
    const searchInput = document.getElementById('playerSearch');
    const searchResults = document.getElementById('searchResults');
    
    if (!searchInput || !searchResults) return;
    
    searchInput.addEventListener('input', function(e) {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }
        
        // Search logic would go here
        searchResults.classList.add('active');
        // Implementation for search...
    });
    
    // Close search results when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
            searchResults.classList.remove('active');
        }
    });
}

function closePlayerModal() {
    const modal = document.getElementById('playerModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function openPlayerModal(playerName) {
    const modal = document.getElementById('playerModal');
    const modalPlayerName = document.getElementById('modalPlayerName');
    const modalPlayerStats = document.getElementById('modalPlayerStats');
    
    if (!modal || !modalPlayerName || !modalPlayerStats) return;
    
    modalPlayerName.textContent = playerName;
    modalPlayerStats.innerHTML = '<div class="loading-message">No player data available</div>';
    
    modal.classList.add('active');
}

// Close modal when clicking outside
document.addEventListener('click', function(e) {
    const modal = document.getElementById('playerModal');
    if (modal && e.target === modal) {
        closePlayerModal();
    }
});
