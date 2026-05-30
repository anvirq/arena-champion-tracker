// Мобильная версия трекера чемпионов Arena для Android
// Использует localStorage вместо файловой системы
// и стандартные fetch API вместо Node.js модулей

let champions = [];
let userChampionsData = {};
let currentFilter = 'all'; // текущий выбранный фильтр
let currentLanguage = 'ru'; // текущий язык интерфейса
let riotApiKey = ''; // ключ Riot Games API

// Карта соответствия ID чемпионов и их ключей в API
let championIdMap = {};

// Пороги для челенджей по чемпионам
const championsChallengeThresholds = {
  "IRON": 8,
  "BRONZE": 15,
  "SILVER": 30,
  "GOLD": 55,
  "PLATINUM": 90,
  "DIAMOND": 135,
  "MASTER": 168
};

// Пороги для челенджей по первым местам
const firstPlaceChallengeThresholds = {
  "IRON": 3,
  "BRONZE": 6,
  "SILVER": 12,
  "GOLD": 20,
  "PLATINUM": 32,
  "DIAMOND": 45,
  "MASTER": 60
};

// Порядок рангов для сравнения
const rankOrder = ["IRON", "BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "MASTER"];

// Словари для переводов
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
    // Добавляем названия рангов
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
    // Adding rank names
    rank_iron: "IRON",
    rank_bronze: "BRONZE",
    rank_silver: "SILVER",
    rank_gold: "GOLD",
    rank_platinum: "PLATINUM",
    rank_diamond: "DIAMOND",
    rank_master: "MASTER"
  }
};

// Получение перевода ранга с запасным вариантом
function getRankTranslation(rank) {
  if (!rank) return '';
  
  const translationKey = `rank_${rank.toLowerCase()}`;
  return translations[currentLanguage][translationKey] || rank;
}

// Функция для получения данных о чемпионах с DataDragon API
function fetchChampionsData() {
  return new Promise((resolve, reject) => {
    // Получаем последнюю версию API
    fetch('https://ddragon.leagueoflegends.com/api/versions.json')
      .then(response => response.json())
      .then(versions => {
        const latestVersion = versions[0];
        
        // Получаем данные о чемпионах в зависимости от текущего языка
        const langCode = currentLanguage === 'ru' ? 'ru_RU' : 'en_US';
        
        fetch(`https://ddragon.leagueoflegends.com/cdn/${latestVersion}/data/${langCode}/champion.json`)
          .then(response => response.json())
          .then(championsData => {
            const champsList = Object.values(championsData.data).map(champion => {
              return {
                id: champion.id.toLowerCase(),
                name: champion.name,
                image: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_0.jpg`
              };
            });
            // Сортируем чемпионов по имени
            champsList.sort((a, b) => a.name.localeCompare(b.name, currentLanguage === 'ru' ? 'ru' : 'en'));
            resolve(champsList);
          })
          .catch(error => {
            console.error('Ошибка при обработке данных о чемпионах:', error);
            // Используем упрощенный список в случае ошибки
            resolve(getFallbackChampions());
          });
      })
      .catch(error => {
        console.error('Ошибка при получении версий:', error);
        resolve(getFallbackChampions());
      });
  });
}

// Резервный список чемпионов (используется при отсутствии соединения)
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
    // Сортируем резервный список по имени
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
    // Сортируем резервный список по имени
    return list.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }
}

// Загрузка данных пользователя из localStorage
function loadUserData() {
  try {
    console.log('Загрузка данных из localStorage');
    const data = localStorage.getItem('championData');
    if (data) {
      userChampionsData = JSON.parse(data);
      
      // Загружаем сохраненный язык, если есть
      if (userChampionsData._settings && userChampionsData._settings.language) {
        currentLanguage = userChampionsData._settings.language;
        updateLanguageBtns();
      }
      
      // Загружаем API ключ, если он сохранен
      if (userChampionsData._settings && userChampionsData._settings.apiKey) {
        riotApiKey = userChampionsData._settings.apiKey;
      }
      
      console.log('Данные успешно загружены');
    } else {
      console.log('Данные не найдены в localStorage, будут созданы при сохранении');
    }
  } catch (error) {
    console.error('Ошибка при загрузке данных:', error);
    userChampionsData = {};
  }
}

// Сохранение данных пользователя в localStorage
function saveUserData() {
  try {
    // Сохраняем настройки вместе с данными
    if (!userChampionsData._settings) {
      userChampionsData._settings = {};
    }
    userChampionsData._settings.language = currentLanguage;
    userChampionsData._settings.apiKey = riotApiKey;
    
    // Сохраняем данные в localStorage
    localStorage.setItem('championData', JSON.stringify(userChampionsData));
    console.log('Данные сохранены в localStorage');
  } catch (error) {
    console.error('Ошибка при сохранении данных:', error);
  }
}

// Расчет ранга и прогресса для челенджа
function calculateRankAndProgress(count, thresholds) {
  // Определяем текущий ранг
  let currentRank = "IRON";
  let nextRank = "BRONZE";
  let progress = 0;
  
  // Проходим по всем рангам в порядке возрастания
  for (let i = rankOrder.length - 1; i >= 0; i--) {
    const rank = rankOrder[i];
    const threshold = thresholds[rank];
    
    if (count >= threshold) {
      currentRank = rank;
      // Если это последний ранг, то следующего нет
      nextRank = i === rankOrder.length - 1 ? null : rankOrder[i + 1];
      break;
    }
  }
  
  // Рассчитываем прогресс до следующего ранга
  if (nextRank) {
    const currentThreshold = thresholds[currentRank];
    const nextThreshold = thresholds[nextRank];
    const remaining = nextThreshold - count;
    const total = nextThreshold - currentThreshold;
    progress = 1 - (remaining / total);
    progress = Math.max(0, Math.min(1, progress));
  } else {
    // Если достигнут максимальный ранг
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

// Обновление отображения рангов и прогресса
function updateRanksDisplay() {
  // Получаем количество играных и первое место чемпионов
  const playedCount = Object.values(userChampionsData).filter(champion => champion.played).length;
  const firstCount = Object.values(userChampionsData).filter(champion => champion.first).length;
  
  // Рассчитываем ранги и прогресс
  const playedRankInfo = calculateRankAndProgress(playedCount, championsChallengeThresholds);
  const firstRankInfo = calculateRankAndProgress(firstCount, firstPlaceChallengeThresholds);
  
  // Обновляем элементы на странице
  const playedRankElement = document.getElementById('played-rank');
  const playedProgressElement = document.getElementById('played-progress');
  const firstRankElement = document.getElementById('first-rank');
  const firstProgressElement = document.getElementById('first-progress');
  
  // Переводим ранги и обновляем элементы
  const playedRankTranslated = getRankTranslation(playedRankInfo.rank);
  const firstRankTranslated = getRankTranslation(firstRankInfo.rank);
  
  // Обновляем ранги
  playedRankElement.textContent = playedRankTranslated;
  playedRankElement.setAttribute('data-rank', playedRankInfo.rank); // Оставляем оригинальное имя для CSS
  
  firstRankElement.textContent = firstRankTranslated;
  firstRankElement.setAttribute('data-rank', firstRankInfo.rank); // Оставляем оригинальное имя для CSS
  
  // Обновляем прогресс-бары
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
  
  // Обновляем информацию о прогрессе для "играл"
  if (playedRankInfo.nextRank) {
    // Получаем перевод для следующего ранга
    const nextRankTranslated = getRankTranslation(playedRankInfo.nextRank);
    const nextRankText = translations[currentLanguage].next_rank.replace('{rank}', nextRankTranslated);
    playedProgressElement.textContent = `${nextRankText} ${playedRankInfo.remaining}`;
    
    // Обновляем визуальный прогресс-бар
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
    
    // Если челлендж завершен, показываем 100% в прогресс-баре
    playedProgressBar.style.width = '100%';
    playedProgressText.textContent = translations[currentLanguage].rank_completed;
  }
  
  // Обновляем информацию о прогрессе для "первое место"
  if (firstRankInfo.nextRank) {
    // Получаем перевод для следующего ранга
    const nextRankTranslated = getRankTranslation(firstRankInfo.nextRank);
    const nextRankText = translations[currentLanguage].next_rank.replace('{rank}', nextRankTranslated);
    firstProgressElement.textContent = `${nextRankText} ${firstRankInfo.remaining}`;
    
    // Обновляем визуальный прогресс-бар
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
    
    // Принудительное обновление стиля ширины прогресс-бара
    firstProgressBar.style.width = '0%'; // Сначала сбрасываем
    setTimeout(() => {
      firstProgressBar.style.width = `${progressPercent}%`; // Затем устанавливаем новое значение
      firstProgressText.textContent = `${firstCount}/${nextThreshold}`;
    }, 10);
  } else {
    firstProgressElement.textContent = translations[currentLanguage].rank_completed;
    
    // Если челлендж завершен, показываем 100% в прогресс-баре
    firstProgressBar.style.width = '100%';
    firstProgressText.textContent = translations[currentLanguage].rank_completed;
  }
  
  // Обновляем цвета прогресс-баров в зависимости от ранга
  updateProgressBarColors(playedProgressBar, playedRankInfo.rank);
  updateProgressBarColors(firstProgressBar, firstRankInfo.rank);
}

// Обновление цветов прогресс-баров в зависимости от ранга
function updateProgressBarColors(progressBar, rank) {
  // Удаляем предыдущие классы цветов
  progressBar.classList.remove('rank-iron', 'rank-bronze', 'rank-silver', 'rank-gold', 'rank-platinum', 'rank-diamond', 'rank-master');
  
  // Применяем соответствующий цвет
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