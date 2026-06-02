const fs = require('fs');
const path = require('path');
const https = require('https');

let champions = [];
let userChampionsData = {};
let currentFilter = 'all';
let currentLanguage = 'ru';
let riotApiKey = '';

let championIdMap = {};

// Arena queue IDs (1700 = standard, 1710 = 16-player lobby, etc.)
const ARENA_QUEUE_IDS = [1700, 1710, 1720, 1730];

function normalizeChampionKey(key) {
  if (!key) return key;
  const k = String(key).toLowerCase();
  if (championIdMap[k]) return championIdMap[k];
  const stripped = k.replace(/[\s'&.]/g, '');
  if (stripped !== k && championIdMap[stripped]) return championIdMap[stripped];
  return k;
}

const championsChallengeThresholds = {
  "IRON": 8,
  "BRONZE": 15,
  "SILVER": 30,
  "GOLD": 55,
  "PLATINUM": 90,
  "DIAMOND": 135,
  "MASTER": 168
};

const firstPlaceChallengeThresholds = {
  "IRON": 3,
  "BRONZE": 6,
  "SILVER": 12,
  "GOLD": 20,
  "PLATINUM": 32,
  "DIAMOND": 45,
  "MASTER": 60
};

const rankOrder = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER"];

const translations = {
  ru: {
    app_title: "Arena Champion Challenges Tracker",
    filter_all: "Все",
    filter_played: "Играл",
    filter_first: "Первое место",
    filter_not_played: "Не играл",
    total_champions: "Всего чемпионов:",
    total_played: "Играл:",
    total_first: "Первое место:",
    not_played: "Не играл:",
    next_rank: "До {rank}:",
    rank_completed: "Челендж завершен!",
    loading: "Загрузка списка чемпионов...",
    search_placeholder: "Поиск чемпиона...",
    clear_search: "Очистить поиск",
    fetch_data: "Загрузить данные",
    loading_data: "Загрузка данных...",
    player_not_found: "Игрок не найден",
    no_arena_games: "Нет игр в режиме Арена",
    no_api_key: "API ключ не настроен",
    data_loaded: "Данные успешно загружены",
    api_error: "Ошибка API: ",
    summoner_name_placeholder: "Ник игрока",
    tag_placeholder: "#ТЭГ",
    api_key_placeholder: "RIOT API KEY",
    api_key_title: "Настройка API ключа",
    api_key_description: "Для получения данных из Riot Games API вам нужен персональный ключ. Вы можете получить его на сайте developer.riotgames.com.",
    save_api_key: "Сохранить",
    api_key_saved: "API ключ сохранен",
    api_key_empty: "API ключ не может быть пустым",
    fetch_data_title: "Загрузка данных",
    fetch_data_description: "Введите данные вашего аккаунта League of Legends для загрузки статистики по чемпионам в режиме Арена.",
    summoner_name_label: "Имя призывателя:",
    tag_label: "Тег:",
    region_label: "Регион:",
    date_filter_note: "Будут загружены все матчи, начиная с 07.02.2024 (дата старта режима Арена).",
    processing_batch: "Обработка пакета",
    loading_page: "Загрузка страницы",
    matches_loaded: "матчей загружено",
    progress: "Прогресс",
    batch: "Пакет",
    page: "Страница",
    rate_limit_exceeded: "Превышен лимит запросов, ожидание",
    api_key_error: "Ошибка API ключа",
    rank_iron: "ЖЕЛЕЗО",
    rank_bronze: "БРОНЗА",
    rank_silver: "СЕРЕБРО",
    rank_gold: "ЗОЛОТО",
    rank_platinum: "ПЛАТИНА",
    rank_diamond: "АЛМАЗ",
    rank_master: "МАСТЕР"
  },
  en: {
    app_title: "Arena Champion Challenges Tracker",
    filter_all: "All",
    filter_played: "Played",
    filter_first: "First Place",
    filter_not_played: "Not Played",
    total_champions: "Total Champions:",
    total_played: "Played:",
    total_first: "First Place:",
    not_played: "Not Played:",
    next_rank: "To {rank}:",
    rank_completed: "Challenge completed!",
    loading: "Loading champions list...",
    search_placeholder: "Search champion...",
    clear_search: "Clear search",
    fetch_data: "Fetch Data",
    loading_data: "Loading data...",
    player_not_found: "Player not found",
    no_arena_games: "No Arena games found",
    no_api_key: "API key not configured",
    data_loaded: "Data successfully loaded",
    api_error: "API Error: ",
    summoner_name_placeholder: "Summoner Name",
    tag_placeholder: "#TAG",
    api_key_placeholder: "RIOT API KEY",
    api_key_title: "API Key Configuration",
    api_key_description: "To fetch data from Riot Games API, you need a personal API key. You can get it from developer.riotgames.com.",
    save_api_key: "Save",
    api_key_saved: "API key has been saved",
    api_key_empty: "API key cannot be empty",
    fetch_data_title: "Fetch Data",
    fetch_data_description: "Enter your League of Legends account details to load champion statistics for Arena mode.",
    summoner_name_label: "Summoner Name:",
    tag_label: "Tag:",
    region_label: "Region:",
    date_filter_note: "All matches from February 7, 2024 (Arena mode launch date) will be loaded.",
    processing_batch: "Processing batch",
    loading_page: "Loading page",
    matches_loaded: "matches loaded",
    progress: "Progress",
    batch: "Batch",
    page: "Page",
    rate_limit_exceeded: "Rate limit exceeded, waiting",
    api_key_error: "API key error",
    rank_iron: "IRON",
    rank_bronze: "BRONZE",
    rank_silver: "SILVER",
    rank_gold: "GOLD",
    rank_platinum: "PLATINUM",
    rank_diamond: "DIAMOND",
    rank_master: "MASTER"
  }
};

function fetchChampionsData() {
  return new Promise((resolve, reject) => {
    https.get('https://ddragon.leagueoflegends.com/api/versions.json', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const versions = JSON.parse(data);
          const latestVersion = versions[0];
          
          const langCode = currentLanguage === 'ru' ? 'ru_RU' : 'en_US';
          
          https.get(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/${langCode}/champion.json`, (champRes) => {
            let champData = '';
            
            champRes.on('data', (chunk) => {
              champData += chunk;
            });
            
            champRes.on('end', () => {
              try {
                const championsData = JSON.parse(champData);
                const champsList = Object.values(championsData.data).map(champion => {
                  return {
                    id: champion.id.toLowerCase(),
                    name: champion.name,
                    image: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_0.jpg`
                  };
                });
                champsList.sort((a, b) => a.name.localeCompare(b.name, currentLanguage === 'ru' ? 'ru' : 'en'));
                resolve(champsList);
              } catch (error) {
                console.error('Ошибка при обработке данных о чемпионах:', error);
                resolve(getFallbackChampions());
              }
            });
          }).on('error', (err) => {
            console.error('Ошибка при получении данных о чемпионах:', err);
            resolve(getFallbackChampions());
          });
        } catch (error) {
          console.error('Ошибка при обработке версий:', error);
          resolve(getFallbackChampions());
        }
      });
    }).on('error', (err) => {
      console.error('Ошибка при получении версий:', err);
      resolve(getFallbackChampions());
    });
  });
}

function getFallbackChampions() {
  if (currentLanguage === 'ru') {
    const list = [
      { id: 'aatrox', name: 'Атрокс', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aatrox_0.jpg' },
      { id: 'ahri', name: 'Ари', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg' },
      { id: 'akali', name: 'Акали', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Akali_0.jpg' },
      { id: 'ashe', name: 'Эш', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ashe_0.jpg' },
      { id: 'lux', name: 'Люкс', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lux_0.jpg' },
      { id: 'yasuo', name: 'Ясуо', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yasuo_0.jpg' },
      { id: 'zed', name: 'Зед', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zed_0.jpg' }
    ];
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  } else {
    const list = [
      { id: 'aatrox', name: 'Aatrox', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Aatrox_0.jpg' },
      { id: 'ahri', name: 'Ahri', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg' },
      { id: 'akali', name: 'Akali', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Akali_0.jpg' },
      { id: 'ashe', name: 'Ashe', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ashe_0.jpg' },
      { id: 'lux', name: 'Lux', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Lux_0.jpg' },
      { id: 'yasuo', name: 'Yasuo', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Yasuo_0.jpg' },
      { id: 'zed', name: 'Zed', image: 'https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Zed_0.jpg' }
    ];
    return list.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }
}

// Portable build: data/ next to exe; installed build: APPDATA
const userDataPath = process.env.PORTABLE_EXECUTABLE_DIR
  ? path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'data', 'championData.json')
  : path.join(
      process.env.APPDATA ||
      (process.platform === 'darwin'
        ? process.env.HOME + '/Library/Preferences'
        : process.env.HOME + '/.local/share'),
      'League Champion Tracker',
      'championData.json'
    );

function loadUserData() {
  try {
    console.log(`Попытка загрузки данных из: ${userDataPath}`);
    if (fs.existsSync(userDataPath)) {
      const data = fs.readFileSync(userDataPath, 'utf8');
      userChampionsData = JSON.parse(data);
      
      if (userChampionsData._settings && userChampionsData._settings.language) {
        currentLanguage = userChampionsData._settings.language;
        updateLanguageBtns();
      }
      
      if (userChampionsData._settings && userChampionsData._settings.apiKey) {
        riotApiKey = userChampionsData._settings.apiKey;
      }
      
      console.log('Данные успешно загружены');
    } else {
      console.log('Файл данных не найден, будет создан при сохранении');
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    userChampionsData = {};
  }
}

function mkdirRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    return;
  }
  
  try {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Создана директория: ${dirPath}`);
    return;
  } catch (error) {
    console.error('Ошибка при создании директории с recursive:', error);
    
    // Manual recursion for Node.js without { recursive: true }
    try {
      const parentDir = path.dirname(dirPath);
      
      if (!fs.existsSync(parentDir)) {
        mkdirRecursive(parentDir);
      }
      
      fs.mkdirSync(dirPath);
      console.log(`Создана директория (вручную): ${dirPath}`);
    } catch (manualError) {
      console.error('Ошибка при ручном создании директории:', manualError);
    }
  }
}

function saveUserData() {
  try {
    const dirPath = path.dirname(userDataPath);
    mkdirRecursive(dirPath);
    
    if (!userChampionsData._settings) {
      userChampionsData._settings = {};
    }
    userChampionsData._settings.language = currentLanguage;
    userChampionsData._settings.apiKey = riotApiKey;
    
    fs.writeFileSync(userDataPath, JSON.stringify(userChampionsData, null, 2), 'utf8');
    console.log(`Данные сохранены в: ${userDataPath}`);
  } catch (error) {
    console.error('Ошибка при сохранении данных:', error);
    console.error('Путь для сохранения:', userDataPath);
  }
}

function calculateRankAndProgress(count, thresholds) {
  let currentRank = "IRON";
  let nextRank = "BRONZE";
  let progress = 0;
  
  for (let i = rankOrder.length - 1; i >= 0; i--) {
    const rank = rankOrder[i];
    const threshold = thresholds[rank];
    
    if (count >= threshold) {
      currentRank = rank;
      nextRank = i === rankOrder.length - 1 ? null : rankOrder[i + 1];
      break;
    }
  }
  
  if (nextRank) {
    const currentThreshold = thresholds[currentRank];
    const nextThreshold = thresholds[nextRank];
    const remaining = nextThreshold - count;
    const total = nextThreshold - currentThreshold;
    progress = 1 - (remaining / total);
    progress = Math.max(0, Math.min(1, progress));
  } else {
    progress = 1;
  }
  
  return { 
    rank: currentRank, 
    nextRank, 
    progress, 
    count, 
    remaining: nextRank ? thresholds[nextRank] - count : 0 
  };
}

function getRankTranslation(rank) {
  if (!rank) return '';
  
  const translationKey = `rank_${rank.toLowerCase()}`;
  return translations[currentLanguage][translationKey] || rank;
}

function updateRanksDisplay() {
  const playedCount = Object.values(userChampionsData).filter(champion => champion.played).length;
  const firstCount = Object.values(userChampionsData).filter(champion => champion.first).length;
  
  const playedRankInfo = calculateRankAndProgress(playedCount, championsChallengeThresholds);
  const firstRankInfo = calculateRankAndProgress(firstCount, firstPlaceChallengeThresholds);
  
  const playedRankElement = document.getElementById('played-rank');
  const playedProgressElement = document.getElementById('played-progress');
  const firstRankElement = document.getElementById('first-rank');
  const firstProgressElement = document.getElementById('first-progress');
  
  const playedRankTranslated = getRankTranslation(playedRankInfo.rank);
  const firstRankTranslated = getRankTranslation(firstRankInfo.rank);
  
  playedRankElement.textContent = playedRankTranslated;
  playedRankElement.setAttribute('data-rank', playedRankInfo.rank); // CSS rank colors
  
  firstRankElement.textContent = firstRankTranslated;
  firstRankElement.setAttribute('data-rank', firstRankInfo.rank);
  const playedProgressBar = document.getElementById('played-progress-bar');
  const playedProgressText = document.getElementById('played-progress-text');
  const firstProgressBar = document.getElementById('first-progress-bar');
  const firstProgressText = document.getElementById('first-progress-text');
  
  if (!playedProgressBar || !firstProgressBar) {
    console.error('Не найдены элементы прогресс-баров:', {
      playedProgressBar: !!playedProgressBar,
      firstProgressBar: !!firstProgressBar
    });
    return;
  }
  
  if (playedRankInfo.nextRank) {
    const nextRankTranslated = getRankTranslation(playedRankInfo.nextRank);
    const nextRankText = translations[currentLanguage].next_rank.replace('{rank}', nextRankTranslated);
    playedProgressElement.textContent = `${nextRankText} ${playedRankInfo.remaining}`;
    
    const currentThreshold = championsChallengeThresholds[playedRankInfo.rank];
    const nextThreshold = championsChallengeThresholds[playedRankInfo.nextRank];
    const progressPercent = Math.min(100, (playedCount - currentThreshold) / (nextThreshold - currentThreshold) * 100);
    
    playedProgressBar.style.width = `${progressPercent}%`;
    playedProgressText.textContent = `${playedCount}/${nextThreshold}`;
    
    console.log('Прогресс "играл":', { 
      progressPercent, 
      playedCount, 
      currentThreshold, 
      nextThreshold 
    });
  } else {
    playedProgressElement.textContent = translations[currentLanguage].rank_completed;
    
    playedProgressBar.style.width = '100%';
    playedProgressText.textContent = translations[currentLanguage].rank_completed;
  }
  
  if (firstRankInfo.nextRank) {
    const nextRankTranslated = getRankTranslation(firstRankInfo.nextRank);
    const nextRankText = translations[currentLanguage].next_rank.replace('{rank}', nextRankTranslated);
    firstProgressElement.textContent = `${nextRankText} ${firstRankInfo.remaining}`;
    
    const currentThreshold = firstPlaceChallengeThresholds[firstRankInfo.rank];
    const nextThreshold = firstPlaceChallengeThresholds[firstRankInfo.nextRank];
    const progressPercent = Math.min(100, (firstCount - currentThreshold) / (nextThreshold - currentThreshold) * 100);
    
    console.log('Прогресс "первое место":', { 
      progressPercent, 
      firstCount, 
      currentThreshold, 
      nextThreshold,
      style: firstProgressBar.style.width
    });
    
    // Force reflow so width transition applies reliably
    firstProgressBar.style.width = '0%';
    setTimeout(() => {
      firstProgressBar.style.width = `${progressPercent}%`;
      firstProgressText.textContent = `${firstCount}/${nextThreshold}`;
    }, 10);
  } else {
    firstProgressElement.textContent = translations[currentLanguage].rank_completed;
    
    firstProgressBar.style.width = '100%';
    firstProgressText.textContent = translations[currentLanguage].rank_completed;
  }
  
  updateProgressBarColors(playedProgressBar, playedRankInfo.rank);
  updateProgressBarColors(firstProgressBar, firstRankInfo.rank);
}

function updateProgressBarColors(progressBar, rank) {
  progressBar.classList.remove('rank-iron', 'rank-bronze', 'rank-silver', 'rank-gold', 'rank-platinum', 'rank-diamond', 'rank-master');
  
  switch (rank) {
    case 'IRON':
      progressBar.style.background = 'linear-gradient(90deg, #515151 0%, #6e6e6e 100%)';
      break;
    case 'BRONZE':
      progressBar.style.background = 'linear-gradient(90deg, #7a603a 0%, #9c7b4a 100%)';
      break;
    case 'SILVER':
      progressBar.style.background = 'linear-gradient(90deg, #a7a7a7 0%, #c4c4c4 100%)';
      break;
    case 'GOLD':
      progressBar.style.background = 'linear-gradient(90deg, #eabd56 0%, #ffd166 100%)';
      break;
    case 'PLATINUM':
      progressBar.style.background = 'linear-gradient(90deg, #3a8a77 0%, #4baf98 100%)';
      break;
    case 'DIAMOND':
      progressBar.style.background = 'linear-gradient(90deg, #6185c7 0%, #79a8f3 100%)';
      break;
    case 'MASTER':
      progressBar.style.background = 'linear-gradient(90deg, #9d4eb3 0%, #b966d0 100%)';
      break;
    default:
      progressBar.style.background = 'linear-gradient(90deg, #0a7e8c 0%, #0a9cac 100%)';
  }
}

function updateStats() {
  const totalChampions = champions.length;
  const playedChampions = champions.filter(champion => champion.played).length;
  const firstPlaceChampions = champions.filter(champion => champion.first).length;
  const notPlayedChampions = totalChampions - playedChampions;
  
  document.getElementById('total-champions').textContent = totalChampions;
  document.getElementById('total-played').textContent = playedChampions;
  document.getElementById('total-first').textContent = firstPlaceChampions;
  document.getElementById('total-not-played').textContent = notPlayedChampions;
  
  updateRanksDisplay();
  updateActiveFilterStat();
}

function updateActiveFilterStat() {
  document.querySelectorAll('.stat-item').forEach(item => {
    item.classList.remove('active');
  });
  
  const activeFilterElement = document.getElementById(`filter-${currentFilter}`);
  if (activeFilterElement) {
    activeFilterElement.classList.add('active');
  }
}

function filterChampions(filterType, searchQuery = '') {
  currentFilter = filterType;
  updateActiveFilterStat();
  
  let filteredChampions = champions;
  
  switch (filterType) {
    case 'played':
      filteredChampions = champions.filter(c => c.played);
      break;
    case 'first':
      filteredChampions = champions.filter(c => c.first);
      break;
    case 'not-played':
      filteredChampions = champions.filter(c => !c.played);
      break;
    case 'all':
    default:
      break;
  }
  
  if (searchQuery.trim() !== '') {
    filteredChampions = filteredChampions.filter(champion => 
      champion.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  renderChampionsFromArray(filteredChampions);
}

async function initChampions() {
  const loadingElement = document.getElementById('loading');
  loadingElement.style.display = 'block';
  
  document.getElementById('champions-container').innerHTML = '';
  
  champions = await fetchChampionsData();
  loadUserData();
  
  if (userChampionsData._settings && userChampionsData._settings.language) {
    currentLanguage = userChampionsData._settings.language;
    updateUILanguage();
  }
  
  champions.forEach(champion => {
    if (userChampionsData[champion.id]) {
      champion.played = userChampionsData[champion.id].played || false;
      champion.first = userChampionsData[champion.id].first || false;
    } else {
      champion.played = false;
      champion.first = false;
    }
  });
  
  updateStats();
  filterChampions(currentFilter);
  
  loadingElement.style.display = 'none';
}

function updateUILanguage() {
  document.title = translations[currentLanguage].app_title;
  
  document.querySelectorAll('[data-lang-key]').forEach(element => {
    const key = element.getAttribute('data-lang-key');
    if (translations[currentLanguage][key]) {
      element.textContent = translations[currentLanguage][key];
    }
  });
  
  document.getElementById('search').placeholder = translations[currentLanguage].search_placeholder;
  document.getElementById('clear-search').title = translations[currentLanguage].clear_search;
  document.getElementById('api-key-input').placeholder = translations[currentLanguage].api_key_placeholder;
  document.getElementById('player-name').placeholder = translations[currentLanguage].summoner_name_placeholder;
  document.getElementById('player-tag').placeholder = translations[currentLanguage].tag_placeholder;
  
  updateLanguageBtns();
  updateRanksDisplay();
  
  const statusElement = document.getElementById('api-status');
  if (statusElement.textContent.includes('чемпионов') || statusElement.textContent.includes('champions')) {
    updateStats();
  }
}

function updateLanguageBtns() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(`lang-${currentLanguage}`).classList.add('active');
}

function switchLanguage(lang) {
  if (lang === currentLanguage) return;
  
  currentLanguage = lang;
  
  userChampionsData._settings = userChampionsData._settings || {};
  userChampionsData._settings.language = lang;
  saveUserData();
  
  updateUILanguage();
  initChampions();
}

async function fetchSummonerData(summonerName, tagLine, region) {
  if (!riotApiKey) {
    updateApiStatus(translations[currentLanguage].no_api_key, 'error');
    return null;
  }
  
  try {
    const accountResponse = await fetch(`https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(summonerName)}/${encodeURIComponent(tagLine)}`, {
      headers: {
        'X-Riot-Token': riotApiKey
      }
    });
    
    if (!accountResponse.ok) {
      throw new Error(`Account API Error: ${accountResponse.status}`);
    }
    
    const accountData = await accountResponse.json();
    const puuid = accountData.puuid;
    
    const summonerResponse = await fetch(`https://${region}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`, {
      headers: {
        'X-Riot-Token': riotApiKey
      }
    });
    
    if (!summonerResponse.ok) {
      throw new Error(`Summoner API Error: ${summonerResponse.status}`);
    }
    
    return await summonerResponse.json();
  } catch (error) {
    console.error('Error fetching summoner data:', error);
    updateApiStatus(translations[currentLanguage].api_error + error.message, 'error');
    return null;
  }
}

function openFetchDataModal() {
  const modal = document.getElementById('fetch-data-modal');
  
  document.querySelector('.player-data-form').style.display = 'block';
  document.querySelector('.progress-container').style.display = 'none';
  document.getElementById('progress-bar').style.width = '0%';
  document.getElementById('progress-info').textContent = '';
  modal.style.display = 'block';
}

function closeFetchDataModal() {
  const modal = document.getElementById('fetch-data-modal');
  modal.style.display = 'none';
}

function updateProgressBar(percent, message) {
  const progressBar = document.getElementById('progress-bar');
  const progressInfo = document.getElementById('progress-info');
  
  progressBar.style.width = `${percent}%`;
  
  if (message) {
    progressInfo.textContent = message;
  }
  
  if (percent >= 100) {
    progressBar.style.backgroundColor = '#2ecc71';
  } else {
    progressBar.style.backgroundColor = '#0a7e8c';
  }
}

async function fetchArenaMatchesForQueue(puuid, routingValue, queueId, arenaStartTimestamp) {
  const pageSize = 100;
  const maxPages = 10;
  let startIndex = 0;
  let queueMatches = [];
  let hasMoreMatches = true;
  let pageCounter = 0;

  while (hasMoreMatches && pageCounter < maxPages) {
    pageCounter++;
    console.log(`Fetching queue ${queueId} page ${pageCounter} (start=${startIndex}, count=${pageSize})`);

    if (pageCounter > 1) {
      await new Promise(resolve => setTimeout(resolve, 1100));
    }

    const matchesResponse = await fetch(
      `https://${routingValue}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${startIndex}&count=${pageSize}&queueId=${queueId}&startTime=${arenaStartTimestamp}`,
      {
        headers: {
          'X-Riot-Token': riotApiKey
        }
      }
    );

    if (!matchesResponse.ok) {
      console.error(`Matches API Error (queue ${queueId}): ${matchesResponse.status}`);
      if (matchesResponse.status === 429) {
        console.warn('Rate limit exceeded. Waiting 10 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        continue;
      } else if (matchesResponse.status === 403) {
        throw new Error(`Matches API Error: ${matchesResponse.status}`);
      } else {
        throw new Error(`Matches API Error: ${matchesResponse.status}`);
      }
    }

    const pageMatches = await matchesResponse.json();
    console.log(`Queue ${queueId}: retrieved ${pageMatches.length} matches on page ${pageCounter}`);
    queueMatches = queueMatches.concat(pageMatches);

    if (pageMatches.length < pageSize) {
      hasMoreMatches = false;
    } else {
      startIndex += pageSize;
    }
  }

  return queueMatches;
}

async function fetchArenaMatches(puuid, region) {
  try {
    let routingValue = 'europe';
    if (['na1', 'br1', 'la1', 'la2'].includes(region)) {
      routingValue = 'americas';
    } else if (['kr', 'jp1'].includes(region)) {
      routingValue = 'asia';
    }
    
    console.log(`Fetching Arena matches for PUUID: ${puuid.substring(0, 8)}... through ${routingValue} routing`);
    
    // Arena mode launched February 7, 2024
    const arenaStartDate = new Date('2024-02-07T00:00:00Z');
    const arenaStartTimestamp = Math.floor(arenaStartDate.getTime() / 1000);
    console.log(`Filtering matches from timestamp: ${arenaStartTimestamp} (${arenaStartDate.toLocaleString()})`);
    
    document.querySelector('.player-data-form').style.display = 'none';
    document.querySelector('.progress-container').style.display = 'block';
    updateProgressBar(0, translations[currentLanguage].loading_data);
    
    const allMatchIds = new Set();

    for (let queueIndex = 0; queueIndex < ARENA_QUEUE_IDS.length; queueIndex++) {
      const queueId = ARENA_QUEUE_IDS[queueIndex];
      updateApiStatus(`${translations[currentLanguage].loading_data} - queue ${queueId}`, 'loading');
      const progressEstimate = Math.min(95, ((queueIndex + 0.5) / ARENA_QUEUE_IDS.length) * 100);
      updateProgressBar(progressEstimate, `${translations[currentLanguage].loading_page} queue ${queueId}...`);

      const queueMatches = await fetchArenaMatchesForQueue(puuid, routingValue, queueId, arenaStartTimestamp);
      queueMatches.forEach(id => allMatchIds.add(id));

      updateProgressBar(progressEstimate, `${translations[currentLanguage].loading_data} - ${allMatchIds.size} ${translations[currentLanguage].matches_loaded}`);

      if (queueIndex < ARENA_QUEUE_IDS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1100));
      }
    }

    const allMatches = [...allMatchIds];
    console.log(`Total unique Arena matches retrieved: ${allMatches.length} (queues: ${ARENA_QUEUE_IDS.join(', ')})`);
    updateProgressBar(100, `${allMatches.length} ${translations[currentLanguage].matches_loaded}`);
    return allMatches;
  } catch (error) {
    console.error('Error fetching matches:', error);
    updateApiStatus(translations[currentLanguage].api_error + error.message, 'error');
    updateProgressBar(30, translations[currentLanguage].api_error + error.message);
    return [];
  }
}

async function fetchMatchData(matchId, region) {
  try {
    let routingValue = 'europe';
    if (['na1', 'br1', 'la1', 'la2'].includes(region)) {
      routingValue = 'americas';
    } else if (['kr', 'jp1'].includes(region)) {
      routingValue = 'asia';
    }
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const matchResponse = await fetch(
      `https://${routingValue}.api.riotgames.com/lol/match/v5/matches/${matchId}`,
      {
        headers: {
          'X-Riot-Token': riotApiKey
        }
      }
    );
    
    if (matchResponse.ok) {
      return await matchResponse.json();
    } else if (matchResponse.status === 429) {
      console.warn(`Rate limit exceeded for match ${matchId}. Adding delay.`);
      
      const retryAfter = matchResponse.headers.get('Retry-After');
      const delayTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
      
      console.log(`Waiting for ${delayTime / 1000} seconds before retrying...`);
      
      await new Promise(resolve => setTimeout(resolve, delayTime));
      return await fetchMatchData(matchId, region);
    } else {
      console.error(`Match API Error for ${matchId}: ${matchResponse.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching match data for ${matchId}:`, error);
    return null;
  }
}

async function buildChampionIdMap() {
  try {
    console.log('Building champion ID map...');
    const versionsResponse = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
    const versions = await versionsResponse.json();
    const latestVersion = versions[0];
    console.log(`Using DataDragon version: ${latestVersion}`);
    
    const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/en_US/champion.json`);
    const data = await response.json();
    
    championIdMap = {};
    
    Object.values(data.data).forEach(champion => {
      const championId = champion.id.toLowerCase();
      // Match API uses numeric champion key
      championIdMap[champion.key] = championId;
      // Also index stripped names for match API championName field
      const nameVariants = [
        champion.name.replace(/\s+/g, '').toLowerCase(),
        champion.name.replace(/[\s'&.]/g, '').toLowerCase()
      ];
      nameVariants.forEach(nameKey => {
        if (nameKey !== championId) {
          championIdMap[nameKey] = championId;
        }
      });
    });
    
    console.log('Champion ID map built successfully.');
    console.log('Total champions in map:', Object.keys(championIdMap).length);
    
    if (Object.keys(championIdMap).length === 0) {
      console.error('Champion ID map is empty after building!');
      return createFallbackChampionMap();
    }
    
    return championIdMap;
  } catch (error) {
    console.error('Error building champion ID map:', error);
    return createFallbackChampionMap();
  }
}

function createFallbackChampionMap() {
  console.log('Creating fallback champion map...');
  const fallbackMap = {};
  
  const commonChampions = {
    '266': 'aatrox', '103': 'ahri', '84': 'akali', '12': 'alistar', '32': 'amumu',
    '1': 'annie', '22': 'ashe', '136': 'aurelionsol', '268': 'azir', '432': 'bard',
    '53': 'blitzcrank', '63': 'brand', '201': 'braum', '51': 'caitlyn', '164': 'camille',
    '69': 'cassiopeia', '31': 'chogath', '42': 'corki', '122': 'darius', '131': 'diana',
    '119': 'draven', '36': 'drmundo', '245': 'ekko', '60': 'elise', '28': 'evelynn',
    '81': 'ezreal', '9': 'fiddlesticks', '114': 'fiora', '105': 'fizz', '3': 'galio',
    '41': 'gangplank', '86': 'garen', '150': 'gnar', '79': 'gragas', '104': 'graves',
    '120': 'hecarim', '74': 'heimerdinger', '420': 'illaoi', '39': 'irelia', '427': 'ivern',
    '40': 'janna', '59': 'jarvaniv', '24': 'jax', '126': 'jayce', '202': 'jhin',
    '222': 'jinx', '145': 'kaisa', '429': 'kalista', '43': 'karma', '30': 'karthus',
    '38': 'kassadin', '55': 'katarina', '10': 'kayle', '141': 'kayn', '85': 'kennen',
    '121': 'khazix', '203': 'kindred', '240': 'kled', '96': 'kogmaw', '897': 'ksante',
    '7': 'leblanc', '64': 'leesin', '89': 'leona', '876': 'lillia', '127': 'lissandra',
    '236': 'lucian', '117': 'lulu', '99': 'lux', '54': 'malphite', '90': 'malzahar',
    '57': 'maokai', '11': 'masteryi', '21': 'missfortune', '62': 'monkeyking', '82': 'mordekaiser',
    '25': 'morgana', '267': 'nami', '75': 'nasus', '111': 'nautilus', '518': 'neeko',
    '76': 'nidalee', '56': 'nocturne', '20': 'nunu', '2': 'olaf', '61': 'orianna',
    '516': 'ornn', '80': 'pantheon', '78': 'poppy', '555': 'pyke', '246': 'qiyana',
    '133': 'quinn', '497': 'rakan', '33': 'rammus', '421': 'reksai', '526': 'rell',
    '888': 'renata', '58': 'renekton', '107': 'rengar', '92': 'riven', '68': 'rumble',
    '13': 'ryze', '360': 'samira', '113': 'sejuani', '235': 'senna', '147': 'seraphine',
    '875': 'sett', '35': 'shaco', '98': 'shen', '102': 'shyvana', '27': 'singed',
    '14': 'sion', '15': 'sivir', '72': 'skarner', '37': 'sona', '16': 'soraka',
    '50': 'swain', '517': 'sylas', '134': 'syndra', '223': 'tahmkench', '163': 'taliyah',
    '91': 'talon', '44': 'taric', '17': 'teemo', '412': 'thresh', '18': 'tristana',
    '48': 'trundle', '23': 'tryndamere', '4': 'twistedfate', '29': 'twitch', '77': 'udyr',
    '6': 'urgot', '110': 'varus', '67': 'vayne', '45': 'veigar', '161': 'velkoz',
    '254': 'vi', '234': 'viego', '112': 'viktor', '8': 'vladimir', '106': 'volibear',
    '19': 'warwick', '498': 'xayah', '101': 'xerath', '5': 'xinzhao', '157': 'yasuo',
    '777': 'yone', '83': 'yorick', '350': 'yuumi', '154': 'zac', '238': 'zed',
    '221': 'zeri', '115': 'ziggs', '26': 'zilean', '142': 'zoe', '143': 'zyra',
    '200': 'belveth', '166': 'akshan', '711': 'vex', '887': 'gwen', '895': 'nilah',
    '233': 'briar', '893': 'aurora'
  };
  
  for (const [id, name] of Object.entries(commonChampions)) {
    fallbackMap[id] = name;
    fallbackMap[name] = name;
  }
  
  console.log('Fallback champion map created with', Object.keys(fallbackMap).length, 'entries');
  return fallbackMap;
}

async function processArenaMatches(matches, puuid, region) {
  if (Object.keys(championIdMap).length === 0) {
    championIdMap = await buildChampionIdMap();
    console.log('Champion ID map ready:', Object.keys(championIdMap).length, 'entries');
  }

  const playedChampions = new Set();
  const firstPlaceChampions = new Set();
  
  let processedCount = 0;
  let arenaMatchesCount = 0;
  const totalMatches = matches.length;
  
  // Update UI less often when processing large match lists
  const updateFrequency = totalMatches > 500 ? 20 : 
                          totalMatches > 200 ? 10 : 
                          totalMatches > 100 ? 5 : 1;
  
  updateApiStatus(`${translations[currentLanguage].loading_data} 0/${totalMatches}`, 'loading');
  
  const foundChampions = new Map();
  
  for (const matchId of matches) {
    try {
      const matchData = await fetchMatchData(matchId, region);
      if (!matchData) {
        processedCount++;
        if (processedCount % updateFrequency === 0 || processedCount === totalMatches) {
          updateApiStatus(`${translations[currentLanguage].loading_data} ${processedCount}/${totalMatches} (Arena: ${arenaMatchesCount})`, 'loading');
          
          const progressPercent = Math.min(100, Math.round((processedCount / totalMatches) * 100));
          updateProgressBar(progressPercent, `${translations[currentLanguage].loading_data} ${processedCount}/${totalMatches} (Arena: ${arenaMatchesCount})`);
        }
        continue; 
      }
      
      processedCount++;
      
      // Arena detection: CHERRY gameMode, known queue IDs, or ARENA gameType
      const isArenaByGameMode = matchData.info.gameMode === 'CHERRY';
      const isArenaByQueueId = ARENA_QUEUE_IDS.includes(matchData.info.queueId);
      const isArenaByGameType = matchData.info.gameType === 'ARENA';
      const isArenaMatch = isArenaByGameMode || isArenaByQueueId || isArenaByGameType;
      
      if (processedCount % updateFrequency === 0 || processedCount === totalMatches) {
        updateApiStatus(`${translations[currentLanguage].loading_data} ${processedCount}/${totalMatches} (Arena: ${arenaMatchesCount})`, 'loading');
        
        const progressPercent = Math.min(100, Math.round((processedCount / totalMatches) * 100));
        updateProgressBar(progressPercent, `${translations[currentLanguage].loading_data} ${processedCount}/${totalMatches} (Arena: ${arenaMatchesCount})`);
      }
      
      console.log(`Match ${matchId} - gameMode: ${matchData.info.gameMode}, queueId: ${matchData.info.queueId}, gameType: ${matchData.info.gameType}, isArena: ${isArenaMatch}`);
      
      if (!isArenaMatch) {
        continue;
      }
      
      arenaMatchesCount++;
      
      const playerData = matchData.info.participants.find(p => p.puuid === puuid);
      if (!playerData) {
        console.log(`Match ${matchId} - Player data not found`);
        continue;
      }
      
      console.log(`Match ${matchId} - Player data:`, 
        JSON.stringify({
          championId: playerData.championId,
          championName: playerData.championName,
          teamId: playerData.teamId,
          placement: playerData.placement,
          win: playerData.win,
          subteamPlacement: playerData.subteamPlacement
        }, null, 2)
      );
      
      if (matchData.info.teams && matchData.info.teams.length > 0) {
        console.log(`Match ${matchId} - Teams structure:`, 
          JSON.stringify(matchData.info.teams.map(team => ({
            teamId: team.teamId,
            placement: team.placement,
            win: team.win
          })), null, 2)
        );
      }
      
      const championNumericId = playerData.championId.toString();
      const championName = playerData.championName || "Unknown";
      
      let championKey = championIdMap[championNumericId];
      
      if (!championKey && championName && championName !== "Unknown") {
        championKey = championName.replace(/[\s'&.]/g, '').toLowerCase();
        console.log(`Using name-based fallback for champion key: ${championName} -> ${championKey}`);
      } else if (!championKey) {
        championKey = championNumericId;
        console.log(`Fallback to numeric ID as key: ${championNumericId}`);
      }

      championKey = normalizeChampionKey(championKey);
      
      console.log(`Match ${matchId} - Player used champion: ${championName} (ID: ${championNumericId}, Key: ${championKey})`);
      
      foundChampions.set(championKey, (foundChampions.get(championKey) || 0) + 1);
      playedChampions.add(championKey);
      
      // First place: participant placement, subteamPlacement, or team placement (not win)
      let isFirstPlace = false;
      
      if (playerData.placement !== undefined) {
        isFirstPlace = playerData.placement === 1;
        console.log(`Method 1: player.placement = ${playerData.placement}, isFirstPlace = ${isFirstPlace}`);
      }
      else if (playerData.subteamPlacement !== undefined) {
        isFirstPlace = playerData.subteamPlacement === 1;
        console.log(`Method 2: player.subteamPlacement = ${playerData.subteamPlacement}, isFirstPlace = ${isFirstPlace}`);
      }
      else if (playerData.teamId !== undefined) {
        const playerTeam = playerData.teamId;
        const team = matchData.info.teams.find(t => t.teamId === playerTeam);
        if (team && team.placement !== undefined) {
          isFirstPlace = team.placement === 1;
          console.log(`Method 3: team.placement = ${team.placement}, isFirstPlace = ${isFirstPlace}`);
        } else if (team) {
          isFirstPlace = false;
          console.log(`Method 3 failed: team found but no placement value`);
        }
      }
      if (!playerData.placement && !playerData.subteamPlacement && 
          !(matchData.info.teams && matchData.info.teams.length && matchData.info.teams[0].placement !== undefined)) {
        console.log(`Could not determine placement: no placement data found in match ${matchId}`);
      }
      
      console.log(`Match ${matchId} - Final decision: isFirstPlace = ${isFirstPlace}`);
      
      if (isFirstPlace) {
        firstPlaceChampions.add(championKey);
        console.log(`Adding ${championKey} to first place list`);
      }
      
      console.log(`Match ${matchId} - Champion mapping: ${championNumericId} -> ${championKey} (found in map: ${championNumericId in championIdMap})`);
      
    } catch (error) {
      console.error(`Error processing match ${matchId}:`, error);
      processedCount++;
      
      if (processedCount % updateFrequency === 0 || processedCount === totalMatches) {
        updateApiStatus(`${translations[currentLanguage].loading_data} ${processedCount}/${totalMatches} (Arena: ${arenaMatchesCount})`, 'loading');
        
        const progressPercent = Math.min(100, Math.round((processedCount / totalMatches) * 100));
        updateProgressBar(progressPercent, `${translations[currentLanguage].loading_data} ${processedCount}/${totalMatches} (Arena: ${arenaMatchesCount})`);
      }
    }
  }
  
  console.log('Found champions:', [...foundChampions.entries()]);
  console.log('Champions played:', [...playedChampions]);
  console.log('Champions with first place:', [...firstPlaceChampions]);
  
  return { playedChampions, firstPlaceChampions, arenaMatchesCount };
}

// Обновление данных чемпионов на основе полученных из API
function updateChampionsData(playedChampions, firstPlaceChampions) {
  // Сопоставляем ID чемпионов с данными в нашем приложении
  let championsUpdated = 0;
  let championsNotFound = [];
  
  console.log('Updating champions data, total champions in app:', champions.length);
  console.log('Played champions from API:', [...playedChampions]);
  console.log('First place champions from API:', [...firstPlaceChampions]);
  console.log('Note: Only champions with placement=1 are marked as "first place"');
  
  // Создаем нормализованную карту ID чемпионов из приложения для сопоставления
  const appChampionsMap = {};
  champions.forEach(champion => {
    const id = champion.id.toLowerCase();
    appChampionsMap[id] = champion;
    
    // Также добавляем вариант без пробелов для лучшего сопоставления
    const nameKey = champion.name.replace(/\s+/g, '').toLowerCase();
    if (nameKey !== id) {
      appChampionsMap[nameKey] = champion;
    }
  });
  
  // Обрабатываем всех чемпионов из API
  [...playedChampions].forEach(apiChampionId => {
    const normalizedId = normalizeChampionKey(apiChampionId);
    let found = false;
    
    // Пытаемся найти чемпиона в нашем приложении
    if (normalizedId in appChampionsMap) {
      const champion = appChampionsMap[normalizedId];
      const isPlayed = true; // Всегда true, так как это из списка played
      const isFirst = firstPlaceChampions.has(normalizedId) || firstPlaceChampions.has(apiChampionId);
      
      console.log(`Champion found by exact match: ${champion.name} (${champion.id}): played=${isPlayed}, first=${isFirst}`);
      
      if (isPlayed !== champion.played || isFirst !== champion.first) {
        championsUpdated++;
        
        // Обновляем данные в массиве чемпионов
        champion.played = isPlayed;
        champion.first = isFirst;
        
        // Обновляем данные пользователя
        if (!userChampionsData[champion.id]) {
          userChampionsData[champion.id] = { played: false, first: false };
        }
        userChampionsData[champion.id].played = isPlayed;
        userChampionsData[champion.id].first = isFirst;
      }
      
      found = true;
    }
    
    // Если не нашли точное совпадение, ищем по частичному совпадению
    if (!found) {
      // Попытаемся найти частичное совпадение
      for (const appChampionId in appChampionsMap) {
        if (appChampionId.includes(normalizedId) || normalizedId.includes(appChampionId)) {
          const champion = appChampionsMap[appChampionId];
          const isPlayed = true;
          const isFirst = firstPlaceChampions.has(normalizedId) || firstPlaceChampions.has(apiChampionId);
          
          console.log(`Champion found by partial match: ${champion.name} (${champion.id}): API ID=${apiChampionId}, played=${isPlayed}, first=${isFirst}`);
          
          if (isPlayed !== champion.played || isFirst !== champion.first) {
            championsUpdated++;
            
            // Обновляем данные в массиве чемпионов
            champion.played = isPlayed;
            champion.first = isFirst;
            
            // Обновляем данные пользователя
            if (!userChampionsData[champion.id]) {
              userChampionsData[champion.id] = { played: false, first: false };
            }
            userChampionsData[champion.id].played = isPlayed;
            userChampionsData[champion.id].first = isFirst;
          }
          
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      championsNotFound.push(`${apiChampionId} (normalized: ${normalizedId})`);
      console.warn(`Champion not found in app: ${apiChampionId} (normalized: ${normalizedId})`);
    }
  });
  
  if (championsNotFound.length > 0) {
    console.warn(`Could not find these champions in app: ${championsNotFound.join(', ')}`);
  }
  
  console.log(`Updated ${championsUpdated} champions`);
  return championsUpdated;
}

// Обработчик нажатия кнопки "Загрузить данные"
async function fetchPlayerData() {
  const playerName = document.getElementById('player-name').value.trim();
  const playerTag = document.getElementById('player-tag').value.trim().replace(/^#/, '');
  const playerRegion = document.getElementById('player-region').value;
  
  if (!playerName || !playerTag) {
    updateApiStatus(translations[currentLanguage].player_not_found, 'error');
    updateProgressBar(0, translations[currentLanguage].player_not_found);
    return;
  }
  
  // Проверяем наличие API ключа
  if (!riotApiKey) {
    updateApiStatus(translations[currentLanguage].no_api_key, 'error');
    updateProgressBar(0, translations[currentLanguage].no_api_key);
    openApiKeyModal();
    return;
  }
  
  updateApiStatus(translations[currentLanguage].loading_data, 'loading');
  updateProgressBar(5, translations[currentLanguage].loading_data);
  
  try {
    console.log(`Fetching data for ${playerName}#${playerTag} in region ${playerRegion}`);
    
    // Получаем данные призывателя
    const summonerData = await fetchSummonerData(playerName, playerTag, playerRegion);
    if (!summonerData) {
      updateApiStatus(`${translations[currentLanguage].player_not_found} (${playerName}#${playerTag})`, 'error');
      updateProgressBar(0, `${translations[currentLanguage].player_not_found} (${playerName}#${playerTag})`);
      return;
    }
    
    console.log('Summoner data received:', summonerData.name, '(PUUID:', summonerData.puuid.substring(0, 8) + '...)');
    updateApiStatus(`${translations[currentLanguage].loading_data} - ${translations[currentLanguage].summoner_name_placeholder}: ${summonerData.name}`, 'loading');
    updateProgressBar(10, `${translations[currentLanguage].summoner_name_placeholder}: ${summonerData.name}`);
    
    // Получаем список матчей (теперь с пагинацией - может быть много)
    const matches = await fetchArenaMatches(summonerData.puuid, playerRegion);
    if (matches.length === 0) {
      updateApiStatus(translations[currentLanguage].no_arena_games, 'error');
      updateProgressBar(0, translations[currentLanguage].no_arena_games);
      return;
    }
    
    console.log(`Found ${matches.length} matches to analyze`);
    
    // Сохраняем список матчей в данных пользователя для возможного возобновления
    if (!userChampionsData._history) {
      userChampionsData._history = {};
    }
    
    userChampionsData._history.lastFetchTime = new Date().toISOString();
    userChampionsData._history.playerName = playerName;
    userChampionsData._history.playerTag = playerTag;
    userChampionsData._history.playerRegion = playerRegion;
    userChampionsData._history.totalMatches = matches.length;
    
    // Сохраняем данные перед обработкой матчей
    saveUserData();
    
    updateApiStatus(`${translations[currentLanguage].loading_data} - ${matches.length} matches`, 'loading');
    
    // Запоминаем время начала обработки для отображения статистики
    const startTime = Date.now();
    
    // Обрабатываем матчи и получаем информацию о чемпионах
    // Определяем максимальное количество матчей для одного прохода
    const batchSize = 100; // Количество матчей для обработки в одном пакете
    let totalPlayedChampions = new Set();
    let totalFirstPlaceChampions = new Set();
    let totalArenaMatchesCount = 0;
    let totalUpdatedCount = 0;
    
    // Разбиваем матчи на пакеты для поэтапной обработки
    for (let batchStart = 0; batchStart < matches.length; batchStart += batchSize) {
      const batchEnd = Math.min(batchStart + batchSize, matches.length);
      const currentBatch = matches.slice(batchStart, batchEnd);
      const batchNumber = Math.floor(batchStart / batchSize) + 1;
      const totalBatches = Math.ceil(matches.length / batchSize);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (matches ${batchStart+1}-${batchEnd} of ${matches.length})`);
      updateApiStatus(`${translations[currentLanguage].loading_data} - ${translations[currentLanguage].batch} ${batchNumber}/${totalBatches}`, 'loading');
      
      // Обновляем прогресс-бар
      const progressStart = 20 + ((batchNumber - 1) / totalBatches) * 70;
      const progressMsg = `${translations[currentLanguage].batch} ${batchNumber}/${totalBatches}`;
      updateProgressBar(progressStart, progressMsg);
      
      const { playedChampions, firstPlaceChampions, arenaMatchesCount } = 
        await processArenaMatches(currentBatch, summonerData.puuid, playerRegion);
      
      // Объединяем результаты
      playedChampions.forEach(champ => totalPlayedChampions.add(champ));
      firstPlaceChampions.forEach(champ => totalFirstPlaceChampions.add(champ));
      totalArenaMatchesCount += arenaMatchesCount;
      
      // Обновляем данные чемпионов после каждого пакета
      const updatedCount = updateChampionsData(totalPlayedChampions, totalFirstPlaceChampions);
      totalUpdatedCount = updatedCount; // Последний результат будет итоговым
      
      // Сохраняем промежуточные результаты
      userChampionsData._history.processedBatches = batchNumber;
      userChampionsData._history.processedMatches = batchEnd;
      userChampionsData._history.arenaMatchesFound = totalArenaMatchesCount;
      saveUserData();
      
      // Обновляем статистику после каждого пакета
      updateStats();
      
      // Обновляем отображение
      filterChampions(currentFilter, document.getElementById('search').value);
      
      // Обновляем статус обработки
      const elapsedTime = (Date.now() - startTime) / 1000;
      const estimatedTotalTime = (elapsedTime / batchEnd) * matches.length;
      const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
      
      const progressMessage = `${translations[currentLanguage].loading_data} - ${translations[currentLanguage].progress}: ${batchEnd}/${matches.length} ${translations[currentLanguage].matches_loaded} (${Math.round(batchEnd/matches.length*100)}%)`;
      updateApiStatus(progressMessage, 'loading');
      
      // Обновляем прогресс-бар снова
      const progressEnd = 20 + (batchNumber / totalBatches) * 70;
      updateProgressBar(progressEnd, progressMessage);
      
      // Даем время для обновления UI и сборки мусора
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Проверяем, нашли ли мы матчи в режиме Арена
    if (totalArenaMatchesCount === 0) {
      updateApiStatus(translations[currentLanguage].no_arena_games, 'error');
      updateProgressBar(100, translations[currentLanguage].no_arena_games);
      return;
    }
    
    console.log(`Found ${totalPlayedChampions.size} played champions and ${totalFirstPlaceChampions.size} first place champions in ${totalArenaMatchesCount} Arena matches`);
    
    // Сохраняем обновленные данные
    userChampionsData._history.completed = true;
    userChampionsData._history.completionTime = new Date().toISOString();
    saveUserData();
    
    // Обновляем статистику и отображение
    updateStats();
    filterChampions(currentFilter, document.getElementById('search').value);
    
    // Считаем общее время выполнения
    const totalElapsedTime = (Date.now() - startTime) / 1000;
    const timeStr = totalElapsedTime > 60 
      ? `${Math.floor(totalElapsedTime/60)}${currentLanguage === 'ru' ? 'м' : 'm'} ${Math.round(totalElapsedTime%60)}${currentLanguage === 'ru' ? 'с' : 's'}`
      : `${Math.round(totalElapsedTime)}${currentLanguage === 'ru' ? 'с' : 's'}`;
      
    const successMessage = `${translations[currentLanguage].data_loaded} (${totalUpdatedCount} ${currentLanguage === 'ru' ? 'чемпионов' : 'champions'}, ${totalArenaMatchesCount} ${currentLanguage === 'ru' ? 'игр' : 'games'}, ${timeStr})`;
    updateApiStatus(successMessage, 'success');
    
    // Обновляем прогресс-бар в конце
    updateProgressBar(100, successMessage);
    
    console.log(`Data update complete. Updated ${totalUpdatedCount} champions from ${totalArenaMatchesCount} Arena matches in ${timeStr}.`);
    
    // Закрываем модальное окно через 2 секунды после успешного завершения
    setTimeout(() => {
      closeFetchDataModal();
    }, 2000);
  } catch (error) {
    console.error('Error during data fetch process:', error);
    updateApiStatus(`${translations[currentLanguage].api_error} ${error.message}`, 'error');
    updateProgressBar(100, `${translations[currentLanguage].api_error} ${error.message}`);
  }
}

// Обновление статуса API запроса
function updateApiStatus(message, type = '') {
  const statusElement = document.getElementById('api-status');
  statusElement.textContent = message;
  statusElement.className = 'api-status';
  if (type) {
    statusElement.classList.add(type);
  }
}

// Рендеринг отфильтрованных чемпионов
function renderChampionsFromArray(championsArray) {
  const container = document.getElementById('champions-container');
  container.innerHTML = '';

  championsArray.forEach(champion => {
    const championCard = document.createElement('div');
    championCard.className = 'champion-card';
    
    championCard.innerHTML = `
      <img src="${champion.image}" alt="${champion.name}" class="champion-img" data-id="${champion.id}">
      <div class="champion-name">${champion.name}</div>
      <div class="champion-status">
        <div class="status-icon ${champion.played ? 'played' : ''}" data-id="${champion.id}" data-status="played" title="${translations[currentLanguage].filter_played}">
          ${champion.played ? '✓' : ''}
        </div>
        <div class="status-icon ${champion.first ? 'first' : ''}" data-id="${champion.id}" data-status="first" title="${translations[currentLanguage].filter_first}">
          ${champion.first ? '1' : ''}
        </div>
      </div>
    `;
    
    container.appendChild(championCard);
  });

  // Добавляем обработчики событий для значков статуса
  document.querySelectorAll('.status-icon').forEach(icon => {
    icon.addEventListener('click', toggleChampionStatus);
  });
  
  // Добавляем обработчики событий для изображений чемпионов
  document.querySelectorAll('.champion-img').forEach(img => {
    img.addEventListener('click', toggleChampionByImage);
  });
}

// Отображение всех чемпионов (используется при инициализации)
function renderChampions() {
  renderChampionsFromArray(champions);
}

// Переключение статуса чемпиона (играл/занял первое место)
function toggleChampionStatus(event) {
  const championId = event.target.getAttribute('data-id');
  const statusType = event.target.getAttribute('data-status');
  
  const championIndex = champions.findIndex(c => c.id === championId);
  if (championIndex === -1) return;
  
  // Обновляем статус выбранного чемпиона
  champions[championIndex][statusType] = !champions[championIndex][statusType];
  
  // Если выбрано "первое место", автоматически устанавливаем "играл"
  if (statusType === 'first' && champions[championIndex].first) {
    champions[championIndex].played = true;
  }
  
  // Если снимается "играл", автоматически снимаем "первое место"
  if (statusType === 'played' && !champions[championIndex].played && champions[championIndex].first) {
    champions[championIndex].first = false;
  }
  
  // Обновляем данные пользователя
  if (!userChampionsData[championId]) {
    userChampionsData[championId] = { played: false, first: false };
  }
  userChampionsData[championId][statusType] = champions[championIndex][statusType];
  
  // Если выбрано "первое место", автоматически устанавливаем "играл" в данных пользователя
  if (statusType === 'first' && userChampionsData[championId].first) {
    userChampionsData[championId].played = true;
  }
  
  // Если снимается "играл", автоматически снимаем "первое место" в данных пользователя
  if (statusType === 'played' && !userChampionsData[championId].played && userChampionsData[championId].first) {
    userChampionsData[championId].first = false;
  }
  
  // Сохраняем данные
  saveUserData();
  
  // Обновляем статистику
  updateStats();
  
  // Повторно применяем текущий фильтр
  const searchInput = document.getElementById('search');
  filterChampions(currentFilter, searchInput.value);
}

// Обработчик клика по изображению чемпиона
function toggleChampionByImage(event) {
  const championId = event.target.getAttribute('data-id');
  
  const championIndex = champions.findIndex(c => c.id === championId);
  if (championIndex === -1) return;
  
  const champion = champions[championIndex];
  
  if (champion.played && champion.first) {
    // Если обе галочки установлены, снимаем обе
    champion.played = false;
    champion.first = false;
  } else if (champion.played) {
    // Если установлена только галочка "играл", устанавливаем "первое место"
    champion.first = true;
  } else {
    // Если не установлено ничего, устанавливаем "играл"
    champion.played = true;
  }
  
  // Обновляем данные пользователя
  if (!userChampionsData[championId]) {
    userChampionsData[championId] = { played: false, first: false };
  }
  userChampionsData[championId].played = champion.played;
  userChampionsData[championId].first = champion.first;
  
  // Сохраняем данные
  saveUserData();
  
  // Обновляем статистику
  updateStats();
  
  // Повторно применяем текущий фильтр
  const searchInput = document.getElementById('search');
  filterChampions(currentFilter, searchInput.value);
}

// Функция поиска чемпионов
function searchChampions(query) {
  // Применяем поиск с учетом текущего фильтра
  filterChampions(currentFilter, query);
}

// Функционал для модального окна API ключа
function openApiKeyModal() {
  const modal = document.getElementById('api-key-modal');
  const input = document.getElementById('api-key-input');
  
  // Устанавливаем текущий ключ в поле ввода, если он есть
  input.value = riotApiKey || '';
  
  // Открываем модальное окно
  modal.style.display = 'block';
}

function closeApiKeyModal() {
  const modal = document.getElementById('api-key-modal');
  modal.style.display = 'none';
}

function saveApiKey() {
  const input = document.getElementById('api-key-input');
  const apiKey = input.value.trim();
  
  if (!apiKey) {
    updateApiStatus(translations[currentLanguage].api_key_empty, 'error');
    return;
  }
  
  riotApiKey = apiKey;
  saveUserData();
  closeApiKeyModal();
  
  updateApiStatus(translations[currentLanguage].api_key_saved, 'success');
}

// Очистка поля поиска
function clearSearch() {
  const searchInput = document.getElementById('search');
  searchInput.value = '';
  searchInput.focus();
  
  // Обновляем отображение чемпионов с пустым поиском
  searchChampions('');
  
  // Скрываем кнопку очистки
  toggleClearButton();
}

// Отображение/скрытие кнопки очистки в зависимости от содержимого поля поиска
function toggleClearButton() {
  const searchInput = document.getElementById('search');
  const clearButton = document.getElementById('clear-search');
  
  if (searchInput.value.trim() === '') {
    clearButton.style.display = 'none';
  } else {
    clearButton.style.display = 'flex';
  }
}

// Обновление статуса кнопок фильтра
function updateFilterBtns() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const filterMap = {
    'all': 'filter-all',
    'played': 'filter-played',
    'first': 'filter-first',
    'not-played': 'filter-not-played'
  };
  
  const activeFilterBtn = document.getElementById(filterMap[currentFilter]);
  if (activeFilterBtn) {
    activeFilterBtn.classList.add('active');
  }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  initChampions();
  
  // Добавление обработчика для поиска
  const searchInput = document.getElementById('search');
  searchInput.addEventListener('input', (e) => {
    searchChampions(e.target.value);
    toggleClearButton();
  });
  
  // Добавление обработчика для кнопки очистки поиска
  const clearButton = document.getElementById('clear-search');
  clearButton.addEventListener('click', clearSearch);
  
  // Инициализация состояния кнопки очистки
  toggleClearButton();
  
  // Добавление обработчиков для кликабельных счетчиков статистики
  document.getElementById('filter-all').addEventListener('click', () => filterChampions('all', searchInput.value));
  document.getElementById('filter-played').addEventListener('click', () => filterChampions('played', searchInput.value));
  document.getElementById('filter-first').addEventListener('click', () => filterChampions('first', searchInput.value));
  document.getElementById('filter-not-played').addEventListener('click', () => filterChampions('not-played', searchInput.value));
  
  // Добавление обработчиков для переключения языка
  document.getElementById('lang-ru').addEventListener('click', () => switchLanguage('ru'));
  document.getElementById('lang-en').addEventListener('click', () => switchLanguage('en'));
  
  // Добавление обработчиков для модальных окон и кнопок
  document.getElementById('fetch-data-modal-btn').addEventListener('click', openFetchDataModal);
  document.getElementById('fetch-data-btn').addEventListener('click', fetchPlayerData);
  document.getElementById('api-key-btn').addEventListener('click', openApiKeyModal);
  document.querySelector('.close-modal').addEventListener('click', closeApiKeyModal);
  document.querySelector('.close-fetch-modal').addEventListener('click', closeFetchDataModal);
  document.getElementById('save-api-key').addEventListener('click', saveApiKey);
  
  // Закрытие модальных окон по клику вне их содержимого
  window.addEventListener('click', (event) => {
    const apiModal = document.getElementById('api-key-modal');
    const fetchModal = document.getElementById('fetch-data-modal');
    
    if (event.target === apiModal) {
      closeApiKeyModal();
    } else if (event.target === fetchModal) {
      closeFetchDataModal();
    }
  });
  
  // Запрос API ключа, если он не настроен
  if (!riotApiKey) {
    updateApiStatus(translations[currentLanguage].no_api_key, 'error');
  }
}); 