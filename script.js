const gameboard = document.getElementById('gameboard');
const numberPalette = document.getElementById('number-palette');
const difficultySelector = document.getElementById('difficulty-selector');
const gameContainer = document.getElementById('game-container');
const themeToggle = document.getElementById('theme-toggle');

const undoBtn = document.getElementById('undo-btn');
const hintBtn = document.getElementById('hint-btn');
const checkBtn = document.getElementById('check-btn');
const resetBtn = document.getElementById('reset-btn');
const newGameBtn = document.getElementById('new-game-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const leaderboardBtn = document.getElementById('leaderboard-btn');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const statsResetBtn = document.getElementById('stats-reset-btn');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');

const timerDisplay = document.getElementById('timer');
const mistakeCountSpan = document.getElementById('mistake-count');
const solvedCountSpan = document.getElementById('solved-count');
const endScreen = document.getElementById('end-screen');
const endTimeSpan = document.getElementById('end-time');
const endMessage = document.getElementById('end-message');
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmDetail = document.getElementById('confirm-detail');
const leaderboardModal = document.getElementById('leaderboard-modal');
const bestTimesList = document.getElementById('best-times-list');
const totalSolvedDisplay = document.getElementById('total-solved-display');

let selectedTile = null;
let mistakes = 0;
const MAX_MISTAKES = 3;
let moveHistory = [];
let solutionBoard = [];
let puzzleBoard = [];
let difficulty = 'easy';
let timerInterval;
let seconds = 0;
let userStats = { solved: 0, bestTimes: { easy: null, medium: null, hard: null } };
let onConfirmAction = null;

window.addEventListener('load', initializeApp);
difficultySelector.addEventListener('click', (e) => {
    if (e.target.classList.contains('difficulty-btn')) {
        difficulty = e.target.dataset.difficulty;
        startGame();
    }
});
themeToggle.addEventListener('change', toggleTheme);
undoBtn.addEventListener('click', handleUndoClick);
hintBtn.addEventListener('click', handleHint);
checkBtn.addEventListener('click', handleCheckSolution);
resetBtn.addEventListener('click', () => showConfirmation('Reset the board?', 'All your progress on this puzzle will be lost.', handleResetBoard));
newGameBtn.addEventListener('click', () => showConfirmation('Start a new game?', 'Your current puzzle will be abandoned.', startGame));
playAgainBtn.addEventListener('click', () => location.reload());
leaderboardBtn.addEventListener('click', showLeaderboard);
closeLeaderboardBtn.addEventListener('click', () => leaderboardModal.classList.add('hidden'));
statsResetBtn.addEventListener('click', () => showConfirmation('Reset all stats?', 'This will erase your leaderboard and solved count forever.', resetStats));
confirmYesBtn.addEventListener('click', () => {
    if (onConfirmAction) onConfirmAction();
    confirmModal.classList.add('hidden');
});
confirmNoBtn.addEventListener('click', () => confirmModal.classList.add('hidden'));
window.addEventListener('keydown', handleKeyPress);

function initializeApp() {
    loadStats();
    displayStats();
    if (localStorage.getItem('theme') === 'dark') {
        themeToggle.checked = true;
        document.body.classList.add('dark-theme');
    }
}

function startGame() {
    difficultySelector.classList.add('hidden');
    gameContainer.classList.remove('hidden');
    resetGameState();
    
    [puzzleBoard, solutionBoard] = generatePuzzle(difficulty);
    
    generateBoard();
    generatePalette();
    startTimer();
}

function resetGameState() {
    mistakes = 0;
    selectedTile = null;
    moveHistory = [];
    mistakeCountSpan.textContent = mistakes;
    endScreen.classList.add('hidden');
    gameboard.innerHTML = "";
    numberPalette.innerHTML = "";
    updateButtonStates();
    stopTimer();
    seconds = 0;
    timerDisplay.textContent = 'Time: 00:00';
}

function endGame(isWin) {
    stopTimer();
    if (isWin) {
        endMessage.textContent = "Congratulations!";
        endTimeSpan.textContent = formatTime(seconds);
        updateStats(seconds);
        displayStats();
    } else {
        endMessage.textContent = "Game Over!";
        endTimeSpan.textContent = 'N/A';
    }
    endScreen.classList.remove('hidden');
}

function generateBoard() {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.dataset.row = r;
            tile.dataset.col = c;

            if (puzzleBoard[r][c] !== 0) {
                tile.textContent = puzzleBoard[r][c];
                tile.classList.add('tile-start');
            } else {
                tile.addEventListener('click', handleTileClick);
            }

            if (r === 2 || r === 5) tile.classList.add('border-bottom');
            if (c === 2 || c === 5) tile.classList.add('border-right');
            gameboard.appendChild(tile);
        }
    }
}

function generatePalette() {
    for (let i = 1; i <= 9; i++) {
        const numberDiv = document.createElement('div');
        numberDiv.classList.add('number');
        numberDiv.textContent = i;
        numberDiv.addEventListener('click', handleNumberClick);
        numberPalette.appendChild(numberDiv);
    }
    const eraseBtn = document.createElement('div');
    eraseBtn.classList.add('number');
    eraseBtn.id = 'erase-btn';
    eraseBtn.textContent = 'X';
    eraseBtn.addEventListener('click', handleEraseClick);
    numberPalette.appendChild(eraseBtn);
}

function generatePuzzle(difficulty) {
    let board = Array(9).fill(0).map(() => Array(9).fill(0));
    solveSudoku(board);
    const solution = JSON.parse(JSON.stringify(board));

    let attempts;
    if (difficulty === 'easy') attempts = 40;
    else if (difficulty === 'medium') attempts = 50;
    else attempts = 55;

    while (attempts > 0) {
        let row = Math.floor(Math.random() * 9);
        let col = Math.floor(Math.random() * 9);
        if (board[row][col] !== 0) {
            board[row][col] = 0;
            attempts--;
        }
    }
    return [board, solution];
}

function solveSudoku(board) {
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) {
                let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                for (let num of numbers) {
                    if (isValid(board, r, c, num)) {
                        board[r][c] = num;
                        if (solveSudoku(board)) return true;
                        board[r][c] = 0;
                    }
                }
                return false;
            }
        }
    }
    return true;
}

function isValid(board, row, col, num) {
    for (let i = 0; i < 9; i++) {
        if (board[row][i] === num || board[i][col] === num) return false;
    }
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
            if (board[startRow + r][startCol + c] === num) return false;
        }
    }
    return true;
}

function handleTileClick(e) {
    const clickedTile = e.target;
    if (selectedTile) {
        selectedTile.classList.remove('selected');
        removeHighlights();
    }
    selectedTile = clickedTile;
    selectedTile.classList.add('selected');
    highlightRelatedCells(selectedTile.dataset.row, selectedTile.dataset.col);
}

function handleNumberClick(e) {
    if (!selectedTile) return;
    const number = parseInt(e.target.textContent);
    fillTile(selectedTile, number);
}

function handleEraseClick() {
    if (!selectedTile || !selectedTile.textContent) return;
    const tile = selectedTile;
    moveHistory.push({ tile, prevValue: tile.textContent, isHint: false });
    tile.textContent = '';
    updateButtonStates();
}

function handleKeyPress(e) {
    if (!selectedTile) return;
    if (e.key >= '1' && e.key <= '9') {
        fillTile(selectedTile, parseInt(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleEraseClick();
    } else if (e.key.includes('Arrow')) {
        moveSelection(e.key);
    }
}

function fillTile(tile, number) {
    const { row, col } = tile.dataset;
    const correctNumber = solutionBoard[row][col];
    const prevValue = tile.textContent;
    
    if (prevValue == number) return;

    moveHistory.push({ tile, prevValue, isHint: false });
    tile.textContent = number;
    
    if (number !== correctNumber) {
        mistakes++;
        mistakeCountSpan.textContent = mistakes;
        tile.classList.add('error');
        if (mistakes >= MAX_MISTAKES) endGame(false);
    } else {
        tile.classList.remove('error');
    }
    
    updateButtonStates();
    checkIfWon();
}

function handleUndoClick() {
    if (moveHistory.length === 0) return;
    const lastMove = moveHistory.pop();
    const { tile, prevValue, isHint } = lastMove;
    
    tile.textContent = prevValue;
    tile.classList.remove('error', 'hint');
    
    if(isHint) {
    } else if (tile.textContent !== '' && !isValid(puzzleBoard, tile.dataset.row, tile.dataset.col, parseInt(tile.textContent))) {
        mistakes--;
        mistakeCountSpan.textContent = mistakes;
    }
    
    updateButtonStates();
}

function handleHint() {
    const emptyTiles = Array.from(document.querySelectorAll('.tile:not(.tile-start)'))
                           .filter(t => !t.textContent);
    if (emptyTiles.length === 0) return;

    const randomTile = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
    const { row, col } = randomTile.dataset;
    const correctNumber = solutionBoard[row][col];
    
    moveHistory.push({ tile: randomTile, prevValue: '', isHint: true });
    randomTile.textContent = correctNumber;
    randomTile.classList.add('hint');
    setTimeout(() => randomTile.classList.remove('hint'), 1000);
    
    updateButtonStates();
    checkIfWon();
}

function handleCheckSolution() {
    document.querySelectorAll('.tile:not(.tile-start)').forEach(tile => {
        if (tile.textContent) {
            const { row, col } = tile.dataset;
            if (parseInt(tile.textContent) !== solutionBoard[row][col]) {
                tile.classList.add('error');
            }
        }
    });
}

function handleResetBoard() {
    moveHistory = [];
    mistakes = 0;
    mistakeCountSpan.textContent = 0;
    document.querySelectorAll('.tile:not(.tile-start)').forEach(tile => {
        tile.textContent = '';
        tile.classList.remove('error', 'hint');
    });
    updateButtonStates();
}

function checkIfWon() {
    for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 9; j++) {
            const tile = document.querySelector(`.tile[data-row="${i}"][data-col="${j}"]`);
            if (!tile.textContent || parseInt(tile.textContent) !== solutionBoard[i][j]) {
                return;
            }
        }
    }
    endGame(true);
}

function moveSelection(key) {
    let { row, col } = selectedTile.dataset;
    row = parseInt(row); col = parseInt(col);
    if (key === 'ArrowUp') row = Math.max(0, row - 1);
    else if (key === 'ArrowDown') row = Math.min(8, row + 1);
    else if (key === 'ArrowLeft') col = Math.max(0, col - 1);
    else if (key === 'ArrowRight') col = Math.min(8, col + 1);
    
    const newTile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
    if (newTile && !newTile.classList.contains('tile-start')) newTile.click();
}

function highlightRelatedCells(row, col) {
    const boxStartRow = Math.floor(row / 3) * 3;
    const boxStartCol = Math.floor(col / 3) * 3;
    document.querySelectorAll('.tile').forEach(t => {
        const r = t.dataset.row; const c = t.dataset.col;
        const inBox = (r >= boxStartRow && r < boxStartRow + 3 && c >= boxStartCol && c < boxStartCol + 3);
        if (r === row || c === col || inBox) t.classList.add('highlighted');
    });
}

function removeHighlights() {
    document.querySelectorAll('.tile.highlighted').forEach(t => t.classList.remove('highlighted'));
}

function updateButtonStates() {
    undoBtn.disabled = moveHistory.length === 0;
    const emptyTiles = document.querySelectorAll('.tile:not([class*="tile-start"]):empty');
    hintBtn.disabled = emptyTiles.length === 0;
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', document.body.classList.contains('dark-theme') ? 'dark' : 'light');
}

function showConfirmation(message, detail, action) {
    confirmMessage.textContent = message;
    confirmDetail.textContent = detail;
    onConfirmAction = action;
    confirmModal.classList.remove('hidden');
}

function startTimer() {
    stopTimer();
    timerInterval = setInterval(() => {
        seconds++;
        timerDisplay.textContent = `Time: ${formatTime(seconds)}`;
    }, 1000);
}

function stopTimer() { clearInterval(timerInterval); }
function formatTime(sec) {
    const minutes = Math.floor(sec / 60);
    const seconds = sec % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function loadStats() {
    const stats = localStorage.getItem('sudokuUserStats');
    if (stats) userStats = JSON.parse(stats);
}

function saveStats() {
    localStorage.setItem('sudokuUserStats', JSON.stringify(userStats));
}

function updateStats(time) {
    userStats.solved++;
    const bestTime = userStats.bestTimes[difficulty];
    if (bestTime === null || time < bestTime) {
        userStats.bestTimes[difficulty] = time;
    }
    saveStats();
}

function displayStats() {
    solvedCountSpan.textContent = userStats.solved;
}

function resetStats() {
    userStats = { solved: 0, bestTimes: { easy: null, medium: null, hard: null } };
    saveStats();
    displayStats();
    showLeaderboard();
}

function showLeaderboard() {
    leaderboardModal.classList.remove('hidden');
    bestTimesList.innerHTML = '';
    for (const diff of ['easy', 'medium', 'hard']) {
        const time = userStats.bestTimes[diff];
        const li = document.createElement('li');
        li.textContent = `${diff.charAt(0).toUpperCase() + diff.slice(1)}: ${time ? formatTime(time) : 'N/A'}`;
        bestTimesList.appendChild(li);
    }
    totalSolvedDisplay.textContent = userStats.solved;
}