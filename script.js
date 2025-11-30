// Clean single-file version of script.js
document.addEventListener('DOMContentLoaded', () => {
    const apiKey = "02a3a5ffd065a0246168465b7a40d41c"; // Replace with your API key

    // Elements (may be null if markup changes)
    const cityInput = document.getElementById("cityInput");
    const searchBtn = document.getElementById("searchBtn");
    const locBtn = document.getElementById("locBtn");
    const weatherCard = document.getElementById("weatherCard");
    const errorText = document.getElementById("error");
    const alertBox = document.getElementById("alertBox");
    const cityName = document.getElementById("cityName");
    const weatherIcon = document.getElementById("weatherIcon");
    const temperature = document.getElementById("temperature");
    const condition = document.getElementById("condition");
    const humidity = document.getElementById("humidity");
    const wind = document.getElementById("wind");
    const favBtn = document.getElementById("favBtn");
    const favList = document.getElementById("favList");
    const darkToggle = document.getElementById("darkToggle");

    // Initialize map if Leaflet available
    let map = null, marker = null;
    const mapContainer = document.getElementById('map');
    if (mapContainer && typeof L !== 'undefined') {
        map = L.map('map').setView([20, 0], 2);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    }

    // ---------------- Fetch Weather ----------------
    async function fetchWeather(city) {
        if (errorText) errorText.textContent = "";
        if (alertBox) alertBox.classList.add('hidden');

        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
            const res = await fetch(url);

            if (!res.ok) {
                if (errorText) {
                    if (res.status === 404) errorText.textContent = 'City not found!';
                    else if (res.status === 401) errorText.textContent = 'Invalid API key!';
                    else errorText.textContent = 'Error fetching data!';
                }
                if (weatherCard) weatherCard.classList.add('hidden');
                return;
            }

            const data = await res.json();
            showWeather(data);
            if (data.coord) {
                fetchAlerts(data.coord.lat, data.coord.lon);
                updateMap(data.coord.lat, data.coord.lon);
            }
        } catch (err) {
            console.error(err);
            if (errorText) errorText.textContent = 'Network error!';
        }
    }

    // ---------------- Show Weather ----------------
    function showWeather(data) {
        if (weatherCard) weatherCard.classList.remove('hidden');
        if (cityName) cityName.textContent = `${data.name}, ${data.sys.country}`;
        if (temperature) temperature.textContent = `${Math.round(data.main.temp)}°C`;
        if (condition) condition.textContent = data.weather[0].description;
        if (humidity) humidity.textContent = data.main.humidity;
        if (wind) wind.textContent = data.wind.speed;
        if (weatherIcon) weatherIcon.src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;

        if (favBtn) {
            favBtn.dataset.city = data.name;
            favBtn.dataset.country = data.sys.country;
        }
    }

    // ---------------- Weather Alerts ----------------
    async function fetchAlerts(lat, lon) {
        if (!alertBox) return;
        try {
            const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.alerts && data.alerts.length > 0) {
                alertBox.classList.remove('hidden');
                alertBox.textContent = '⚠ Severe Weather Alert: ' + data.alerts[0].event;
            }
        } catch (err) {
            console.log('No alerts available.', err);
        }
    }

    // ---------------- Update Map ----------------
    function updateMap(lat, lon) {
        if (!map) return;
        if (marker) map.removeLayer(marker);
        marker = L.marker([lat, lon]).addTo(map);
        map.setView([lat, lon], 10);
    }

    // ---------------- Search ----------------
    if (searchBtn && cityInput) {
        searchBtn.addEventListener('click', () => {
            const city = cityInput.value.trim();
            if (city) fetchWeather(city);
        });
        cityInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') searchBtn.click();
        });
    }

    // ---------------- Use My Location ----------------
    if (locBtn) {
        locBtn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                if (errorText) errorText.textContent = 'Geolocation not supported.';
                return;
            }
            navigator.geolocation.getCurrentPosition(pos => {
                fetchWeatherByLocation(pos.coords.latitude, pos.coords.longitude);
            }, (err) => {
                console.error(err);
                if (errorText) errorText.textContent = 'Unable to retrieve your location.';
            });
        });
    }

    async function fetchWeatherByLocation(lat, lon) {
        try {
            const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
            const res = await fetch(url);
            const data = await res.json();
            showWeather(data);
            fetchAlerts(lat, lon);
            updateMap(lat, lon);
        } catch (err) {
            console.error(err);
            if (errorText) errorText.textContent = 'Network error while fetching location weather.';
        }
    }

    // ---------------- Favorites ----------------
    let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

    function updateFavoritesUI() {
        if (!favList) return;
        favList.innerHTML = '';
        favorites.forEach(f => {
            const li = document.createElement('li');
            const nameSpan = document.createElement('span');
            nameSpan.textContent = `${f.city}, ${f.country}`;

            const viewBtn = document.createElement('button');
            viewBtn.className = 'view-btn';
            viewBtn.textContent = 'View';
            viewBtn.addEventListener('click', () => fetchWeather(f.city));

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            // use a recolorable multiplication sign instead of an emoji so CSS color applies
            delBtn.textContent = '×';
            delBtn.setAttribute('aria-label', `Delete ${f.city} from favorites`);
            delBtn.addEventListener('click', () => {
                favorites = favorites.filter(x => x.city !== f.city);
                localStorage.setItem('favorites', JSON.stringify(favorites));
                updateFavoritesUI();
            });

            li.appendChild(nameSpan);
            li.appendChild(viewBtn);
            li.appendChild(delBtn);
            favList.appendChild(li);
        });
    }

    if (favBtn) {
        favBtn.addEventListener('click', () => {
            const city = favBtn.dataset.city;
            const country = favBtn.dataset.country;
            if (!city) return;
            if (!favorites.some(f => f.city === city)) {
                favorites.push({ city, country });
                localStorage.setItem('favorites', JSON.stringify(favorites));
                updateFavoritesUI();
            }
        });
    }

    updateFavoritesUI();

    // ---------------- Dark Mode ----------------
    if (darkToggle) {
        darkToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark');
            // Try to set a simple symbol if FontAwesome is not present
            const isDark = document.body.classList.contains('dark');
            darkToggle.innerHTML = isDark ? '☀️' : '🌙';
        });
    }

});



