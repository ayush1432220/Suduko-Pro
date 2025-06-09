const gameboard = document.getElementById('gameboard');
const numberPalette = document.getElementById('number-palette');
const mistakeCountSpan = document.getElementById('mistake-count');
const endScreen = document.getElementById('end-screen');
const endMessage = document.getElementById('end-message');
const playAgainBtn = document.getElementById('play-again-btn');
const undoBtn = document.getElementById('undo-btn');
const difficultySelector = document.getElementById('difficulty-selector'); 
const gameContainer = document.getElementById('game-container'); 


let selectedTile = null;
let mistakes = 0;
const MAX_MISTAKES = 3;
let cellsToFill = 0;
let moveHistory = [];
let currentPuzzle;
// Game board k Predefined clues yha se generate honge
const puzzles = {
    easy: [{
        board: ["--9748---", "7--------", "-2-1-9---", "--7---24-", "-64-1-59-", "-98---3--", "---8-3-2-", "--------6", "---2759--"],
        solution: ["519748632", "783652419", "426139875", "357986241", "264317598", "198524367", "975863124", "832491756", "641275983"]
    }],
    medium: [{
        board: ["53--7----", "6--195---", "-98----6-", "8---6---3", "4--8-3--1", "7---2---6", "-6----28-", "---419--5", "----8--79"],
        solution: ["534678912", "672195348", "198342567", "859761423", "426853791", "713924856", "961537284", "287419635", "345286179"]
    }],
    hard: [{
        board: ["8--------", "--36-----", "-7--9-2--", "-5---7---", "----457--", "---1---3-", "--1----68", "--85---1-", "-9----4--"],
        solution: ["812753649", "943682175", "675491283", "154237896", "369845721", "287169534", "521974368", "438526917", "796318452"]
    }]
};



playAgainBtn.addEventListener('click', () => location.reload()); 
undoBtn.addEventListener('click', handleUndoClick);

difficultySelector.addEventListener('click', (e) => {
    if (e.target.classList.contains('difficulty-btn')) {
        const difficulty = e.target.dataset.difficulty;
        startGame(difficulty);
    }
});



window.addEventListener('keydown', handleKeyPress);

function startGame(difficulty) {
    difficultySelector.classList.add('hidden');
    gameContainer.classList.remove('hidden');

    mistakes = 0;
    selectedTile = null;
    moveHistory = [];
    mistakeCountSpan.textContent = mistakes;
    endScreen.classList.add('hidden');
    
    gameboard.innerHTML = "";
    numberPalette.innerHTML = "";
    
    const puzzlePool = puzzles[difficulty];
    currentPuzzle = puzzlePool[Math.floor(Math.random() * puzzlePool.length)];
    
    generateBoard();
    generatePalette();
    updateUndoButtonState();
}


function generateBoard() {
    cellsToFill = 0;
    const board = currentPuzzle.board;
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            const tile = document.createElement('div');
            tile.classList.add('tile');
            tile.dataset.row = r;
            tile.dataset.col = c;

            const char = board[r][c];
            if (char !== '-') {
                tile.textContent = char;
                tile.classList.add('tile-start');
            } else {
                cellsToFill++;
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
        numberDiv.dataset.value = i; 
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


function handleTileClick(e) {
    const clickedTile = e.target;
    
    if (selectedTile) {
        selectedTile.classList.remove('selected');
        removeHighlights(); // NEW
    }

    selectedTile = clickedTile;
    selectedTile.classList.add('selected');
    highlightRelatedCells(selectedTile.dataset.row, selectedTile.dataset.col); // NEW
}


function handleNumberClick(e) {
    if (!selectedTile) return;

    const selectedNumber = e.target.textContent;
    const { row, col } = selectedTile.dataset;
    const solution = currentPuzzle.solution[row][col];
    const tileToUpdate = selectedTile;

    if (tileToUpdate.textContent === selectedNumber) return; 

    const previousValue = tileToUpdate.textContent; 

    if (selectedNumber === solution) {
        tileToUpdate.textContent = selectedNumber;
        moveHistory.push({ tile: tileToUpdate, wasMistake: false, previousValue });
        tileToUpdate.classList.remove('error');
        tileToUpdate.removeEventListener('click', handleTileClick);

        cellsToFill--;
        if (cellsToFill === 0) endGame(true);
    } else {
        mistakes++;
        mistakeCountSpan.textContent = mistakes;
        moveHistory.push({ tile: tileToUpdate, wasMistake: true, previousValue: '' }); 
        tileToUpdate.classList.add('error');
        setTimeout(() => { tileToUpdate.classList.remove('error'); }, 1000);

        if (mistakes >= MAX_MISTAKES) endGame(false);
    }
    
    updateUndoButtonState();
}


function handleEraseClick() {
    if (!selectedTile || !selectedTile.textContent) return;

    const previousValue = selectedTile.textContent;
    moveHistory.push({ tile: selectedTile, wasMistake: false, previousValue });
    selectedTile.textContent = '';
    
    updateUndoButtonState();
}


function handleKeyPress(e) {
    if (!selectedTile) return;

    if (e.key >= '1' && e.key <= '9') {
        const numElement = document.querySelector(`.number[data-value="${e.key}"]`);
        if(numElement) numElement.click();
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
        document.getElementById('erase-btn').click();
    } else if (e.key.includes('Arrow')) {
        moveSelection(e.key);
    }
}


function moveSelection(key) {
    let { row, col } = selectedTile.dataset;
    row = parseInt(row);
    col = parseInt(col);

    if (key === 'ArrowUp') row = Math.max(0, row - 1);
    else if (key === 'ArrowDown') row = Math.min(8, row + 1);
    else if (key === 'ArrowLeft') col = Math.max(0, col - 1);
    else if (key === 'ArrowRight') col = Math.min(8, col + 1);

    const newTile = document.querySelector(`.tile[data-row="${row}"][data-col="${col}"]`);
    if (newTile && !newTile.classList.contains('tile-start')) {
        newTile.click();
    }
}


function highlightRelatedCells(row, col) {
    const allTiles = document.querySelectorAll('.tile');
    const boxStartRow = Math.floor(row / 3) * 3;
    const boxStartCol = Math.floor(col / 3) * 3;

    allTiles.forEach(tile => {
        const r = tile.dataset.row;
        const c = tile.dataset.col;
        const inBox = (r >= boxStartRow && r < boxStartRow + 3 && c >= boxStartCol && c < boxStartCol + 3);

        if (r === row || c === col || inBox) {
            tile.classList.add('highlighted');
        }
    });
}


function removeHighlights() {
    document.querySelectorAll('.tile.highlighted').forEach(t => t.classList.remove('highlighted'));
}


function handleUndoClick() {
    if (moveHistory.length === 0) return;

    const lastMove = moveHistory.pop();
    const { tile, wasMistake, previousValue } = lastMove;

    tile.textContent = previousValue; 

    if (!tile.classList.contains('tile-start')) {
        tile.addEventListener('click', handleTileClick);
    }
    
    if (wasMistake) {
        mistakes--;
        mistakeCountSpan.textContent = mistakes;
    } else if (previousValue === '' && tile.textContent !== '') {
        cellsToFill++;
    } else if (previousValue !== '' && tile.textContent === '') {
        cellsToFill--;
    }

    if(selectedTile) selectedTile.classList.remove('selected');
    removeHighlights();
    selectedTile = null;

    updateUndoButtonState();
}


function updateUndoButtonState() {
    undoBtn.disabled = moveHistory.length === 0;
}


function endGame(isWin) {
    if (isWin) {
        endMessage.textContent = "Congratulations! You Won!";
        endMessage.style.color = "#28a745";
    } else {
        endMessage.textContent = "Game Over! Try Again.";
        endMessage.style.color = "#dc3545";
    }
    endScreen.classList.remove('hidden');
}