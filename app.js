// === НАСТРОЙКИ И СОСТОЯНИЕ ИГРЫ ===
const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼']; // 8 уникальных эмодзи для пар
let cardsData = [];       // Массив объектов с данными карточек
let flippedCards = [];    // Открытые в данном ходу карточки (максимум 2)
let movesCount = 0;       // Счётчик ходов
let matchedPairs = 0;     // Счётчик найденных пар
let isBoardLocked = false;// Блокировка поля при анимации несовпадения
let mismatchTimeoutId = null; // ID таймера для несовпавших карточек

// Элементы интерфейса, к которым нужен частый доступ
let movesDisplay, pairsDisplay, gameBoard;

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ГЕНЕРАЦИИ DOM ===
// Функция для быстрого и безопасного создания элементов
function createElement(tagName, className, textContent) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (textContent !== undefined) element.textContent = textContent;
  return element;
}

// === АЛГОРИТМ ПЕРЕМЕШИВАНИЯ (Фишер-Йетс) ===
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// === ИНИЦИАЛИЗАЦИЯ ИНТЕРФЕЙСА (СТАРТ ПРИ ЗАГРУЗКЕ) ===
function initApp() {
  const body = document.body;

  // 1. Создаем Хедер
  const header = createElement('header', 'header');
  const title = createElement('h1', '', 'Memory Game');
  const headerButtons = createElement('div', 'header-buttons');
  
  const btnNewGame = createElement('button', '', 'Новая игра');
  btnNewGame.addEventListener('click', () => startNewGame());
  
  const btnLeaderboard = createElement('button', '', 'Таблица лидеров');
  btnLeaderboard.addEventListener('click', () => showLeaderboardModal());
  
  headerButtons.appendChild(btnNewGame);
  headerButtons.appendChild(btnLeaderboard);
  header.appendChild(title);
  header.appendChild(headerButtons);
  body.appendChild(header);

  // 2. Создаем Панель Счетчиков
  const infoPanel = createElement('div', 'info-panel');
  movesDisplay = createElement('div', '', 'Ходов: 0');
  pairsDisplay = createElement('div', '', 'Пар: 0 из 8');
  infoPanel.appendChild(movesDisplay);
  infoPanel.appendChild(pairsDisplay);
  body.appendChild(infoPanel);

  // 3. Создаем Игровое поле
  gameBoard = createElement('div', 'game-board');
  body.appendChild(gameBoard);

  // Запускаем первую игру
  startNewGame();
}

// === ЛОГИКА ЗАПУСКА НОВОЙ ИГРЫ ===
function startNewGame() {
  // Если была открыта несовпавшая пара и тикал таймер — отменяем его
  if (mismatchTimeoutId) {
    clearTimeout(mismatchTimeoutId);
    mismatchTimeoutId = null;
  }

  // Сброс состояния
  movesCount = 0;
  matchedPairs = 0;
  flippedCards = [];
  isBoardLocked = false;

  // Обновление экранов
  updateCounters();

  // Подготовка и перемешивание карточек (удваиваем 8 эмодзи до 16 штук)
  const doubleEmojis = [...EMOJIS, ...EMOJIS];
  shuffle(doubleEmojis);

  // Формируем массив объектов карточек
  cardsData = doubleEmojis.map((emoji, index) => ({
    id: index,
    value: emoji,
    isFlipped: false,
    isMatched: false
  }));

  // Очищаем старое поле через удаление дочерних узлов (безопасно)
  while (gameBoard.firstChild) {
    gameBoard.removeChild(gameBoard.firstChild);
  }

  // Рендерим карточки на поле
  cardsData.forEach(cardData => {
    const cardElement = createElement('div', 'card');
    cardElement.dataset.id = cardData.id;

    const cardBack = createElement('div', 'card-back'); // Рубашка
    const cardFront = createElement('div', 'card-front', cardData.value); // Лицо с эмодзи

    cardElement.appendChild(cardBack);
    cardElement.appendChild(cardFront);
    
    // Навешиваем событие клика
    cardElement.addEventListener('click', () => handleCardClick(cardElement, cardData));
    
    gameBoard.appendChild(cardElement);
  });
}

// === ОБРАБОТКА КЛИКА ПО КАРТОЧКЕ ===
function handleCardClick(cardElement, cardData) {
  // Игнорируем клик, если: поле заблокировано, карточка уже открыта или пара уже найдена
  if (isBoardLocked || cardData.isFlipped || cardData.isMatched) return;

  // Переворачиваем карточку визуально и в данных
  cardElement.classList.add('flipped');
  cardData.isFlipped = true;
  flippedCards.push({ element: cardElement, data: cardData });

  // Если это первая карточка в ходу — просто ждем вторую
  if (flippedCards.length === 1) return;

  // Если открыли вторую карточку — это полноценный ход
  movesCount++;
  updateCounters();

  const [card1, card2] = flippedCards;

  // Проверяем на совпадение
  if (card1.data.value === card2.data.value) {
    // Совпали!
    card1.data.isMatched = true;
    card2.data.isMatched = true;
    matchedPairs++;
    updateCounters();
    flippedCards = []; // Очищаем массив текущего хода

    // Проверка на окончание игры
    if (matchedPairs === EMOJIS.length) {
      setTimeout(() => {
        saveResultToLeaderboard(movesCount);
        showWinModal();
      }, 500); // Небольшая задержка для красоты перед появлением модалки победы
    }
  } else {
    // Не совпали. Блокируем поле и запускаем таймер закрытия (1 секунда)
    isBoardLocked = true;
    mismatchTimeoutId = setTimeout(() => {
      card1.element.classList.remove('flipped');
      card2.element.classList.remove('flipped');
      card1.data.isFlipped = false;
      card2.data.isFlipped = false;
      
      flippedCards = [];
      isBoardLocked = false;
      mismatchTimeoutId = null;
    }, 1000);
  }
}

// Обновление текстовых счетчиков на странице
function updateCounters() {
  movesDisplay.textContent = `Ходов: ${movesCount}`;
  pairsDisplay.textContent = `Пар: ${matchedPairs} из ${EMOJIS.length}`;
}

// === УНИВЕРСАЛЬНЫЙ КОМПОНЕНТ МОДАЛЬНЫХ ОКОН ===
function createModal(titleText, contentElement, actionsElement) {
  // Блокируем прокрутку страницы
  document.body.classList.add('modal-open');

  const overlay = createElement('div', 'modal-overlay');
  const modalContent = createElement('div', 'modal-content');
  const title = createElement('h2', '', titleText);

  modalContent.appendChild(title);
  if (contentElement) modalContent.appendChild(contentElement);
  if (actionsElement) modalContent.appendChild(actionsElement);
  overlay.appendChild(modalContent);

  // Функция закрытия окна
  const closeModal = () => {
    if (document.body.contains(overlay)) {
      document.body.removeChild(overlay);
    }
    // Восстанавливаем прокрутку, если больше нет открытых модалок
    if (!document.querySelector('.modal-overlay')) {
      document.body.classList.remove('modal-open');
    }
    // Снимаем глобальные обработчики закрытия
    document.removeEventListener('keydown', handleEsc);
  };

  // Закрытие по клику на затемненный фон (overlay)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Закрытие по кнопке Escape
  const handleEsc = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  document.addEventListener('keydown', handleEsc);

  document.body.appendChild(overlay);
  return closeModal; // Возвращаем функцию закрытия, чтобы её могли вызвать кнопки внутри модалки
}

// === МОДАЛЬНОЕ ОКНО ПОБЕДЫ ===
function showWinModal() {
  const content = createElement('p', '', `Вы нашли все пары за ${movesCount} ходов!`);
  const actions = createElement('div', 'modal-actions');
  
  const btnNewGame = createElement('button', '', 'Новая игра');
  const btnClose = createElement('button', '', 'Закрыть');

  actions.appendChild(btnNewGame);
  actions.appendChild(btnClose);

  const close = createModal('Поздравляем с победой!', content, actions);

  btnNewGame.addEventListener('click', () => {
    close();
    startNewGame();
  });
  btnClose.addEventListener('click', close);
}

// === РАБОТА С LOCALSTORAGE (ТАБЛИЦА ЛИДЕРОВ) ===
function saveResultToLeaderboard(moves) {
  const leaderboard = JSON.parse(localStorage.getItem('memory_game_leaderboard')) || [];
  
  // Форматируем текущую дату ДД.ММ.ГГГГ
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const formattedDate = `${day}.${month}.${year}`;

  const newResult = {
    moves: moves,
    date: formattedDate,
    timestamp: now.getTime() // Нужно для сортировки по дате, если ходы равны
  };

  leaderboard.push(newResult);

  // Сортировка: сначала по количеству ходов (меньше — лучше), 
  // при равенстве — по дате (более ранняя игра выше)
  leaderboard.sort((a, b) => {
    if (a.moves !== b.moves) {
      return a.moves - b.moves;
    }
    return a.timestamp - b.timestamp;
  });

  // Оставляем только топ-10 лучших результатов
  const top10 = leaderboard.slice(0, 10);
  localStorage.setItem('memory_game_leaderboard', JSON.stringify(top10));
}

// === МОДАЛЬНОЕ ОКНО ТАБЛИЦЫ ЛИДЕРОВ ===
function showLeaderboardModal() {
  const leaderboard = JSON.parse(localStorage.getItem('memory_game_leaderboard')) || [];
  let content;

  if (leaderboard.length === 0) {
    content = createElement('p', '', 'Пока нет результатов. Будьте первым!');
  } else {
    // Создаем таблицу
    content = createElement('table', 'leaderboard-table');
    const thead = createElement('thead');
    const headerRow = createElement('tr');
    
    headerRow.appendChild(createElement('th', '', 'Место'));
    headerRow.appendChild(createElement('th', '', 'Ходы'));
    headerRow.appendChild(createElement('th', '', 'Дата'));
    thead.appendChild(headerRow);
    content.appendChild(thead);

    const tbody = createElement('tbody');
    leaderboard.forEach((item, index) => {
      const row = createElement('tr');
      row.appendChild(createElement('td', '', `${index + 1}`));
      row.appendChild(createElement('td', '', `${item.moves}`));
      row.appendChild(createElement('td', '', `${item.date}`));
      tbody.appendChild(row);
    });
    content.appendChild(tbody);
  }
const actions = createElement('div', 'modal-actions');
const btnClose = createElement('button', '', 'Закрыть');
actions.appendChild(btnClose);
const close = createModal('Таблица лидеров', content, actions);
btnClose.addEventListener('click', close);
}
// === ЗАПУСК ПРИ ЗАГРУЗКЕ СТРАНИЦЫ ===
window.addEventListener('DOMContentLoaded', initApp);