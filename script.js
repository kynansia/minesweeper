const boardSizeX = 16;  
const boardSizeY = 30;
const numMines = 99;    
let gameBoard = [];
let minePositions = new Set();
let revealedCells = new Set();
let flaggedCells = new Set();
let remainingMines = numMines;
let bombsRemainingElement = document.getElementById('bombs-remaining');
let resetButton = document.getElementById('reset-button');
let boardElement = document.getElementById('board');
let timerElement = document.getElementById('timer'); 
let gameOver = false; 
let firstClick = true; 
let startTime = null;  
let timerInterval = null; 
let elapsedTime = 0;  
let isMouseDown = false;   
let lastPressedCells = [];

function createGame() {
    gameBoard = [];
    minePositions = new Set();
    revealedCells = new Set();
    flaggedCells = new Set();
    remainingMines = numMines;
    firstClick = true;
    gameOver = false;
    elapsedTime = 0;
    bombsRemainingElement.textContent = String(remainingMines).padStart(3, '0');
    timerElement.textContent = String(elapsedTime).padStart(3, '0');
    resetButton.textContent = '😊'; 

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    boardElement.innerHTML = '';
    for (let i = 0; i < boardSizeX; i++) {
        let row = [];
        for (let j = 0; j < boardSizeY; j++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.addEventListener('pointerdown', (e) => {
                if (gameOver) return;
                if (e.button !== 0) return;

                isMouseDown = true;

                removeAllPressed(); 
                lastPressedCells = [];

                if (cell.classList.contains('revealed')) {
                    getNeighbors(i, j).forEach(([r, c]) => {
                        const neighborCell = gameBoard[r][c];
                        if (!neighborCell.classList.contains('revealed') && !flaggedCells.has(`${r},${c}`)) {
                            neighborCell.classList.add('pressed');
                            lastPressedCells.push(neighborCell);
                        }
                    });
                } else {
                    if (!cell.classList.contains('revealed') && !flaggedCells.has(`${i},${j}`)) {
                        cell.classList.add('pressed');
                        lastPressedCells.push(cell);
                    }
                }
            });

            cell.addEventListener('mousemove', (e) => {
                if (gameOver) return;
                if (!isMouseDown) return;  
                if (e.buttons !== 1) return; 

                removeAllPressed();
                lastPressedCells = [];

                if (cell.classList.contains('revealed')) {
                    getNeighbors(i, j).forEach(([r, c]) => {
                        const neighborCell = gameBoard[r][c];
                        if (!neighborCell.classList.contains('revealed') && !flaggedCells.has(`${r},${c}`)) {
                            neighborCell.classList.add('pressed');
                            lastPressedCells.push(neighborCell);
                        }
                    });
                } else {
                    if (!cell.classList.contains('revealed') && !flaggedCells.has(`${i},${j}`)) {
                        cell.classList.add('pressed');
                        lastPressedCells.push(cell);
                    }
                }
            });

            cell.addEventListener('mouseup', (e) => {
                if (gameOver) return;
                if (e.button !== 0) return;  
                isMouseDown = false;
                removeAllPressed();
            });

            boardElement.addEventListener('mouseleave', () => {
                if (gameOver) return;
                isMouseDown = false;
                removeAllPressed();
            });

            cell.addEventListener('click', () => {
                if (!gameOver) {
                    removeAllPressed();
                    revealCell(i, j);
                }
            });

            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (!gameOver) {
                    removeAllPressed();
                    flagCell(i, j);
                }
            });

            boardElement.appendChild(cell);
            row.push(cell);
        }
        gameBoard.push(row);
    }
}

function removeAllPressed() {
    lastPressedCells.forEach(cell => {
        cell.classList.remove('pressed');
    });
    lastPressedCells = [];
}

function placeMines(firstRow, firstCol) {
    let firstCell = `${firstRow},${firstCol}`;

    while (minePositions.size < numMines) {
        let randomPosition = Math.floor(Math.random() * (boardSizeX * boardSizeY));
        let row = Math.floor(randomPosition / boardSizeY);
        let col = randomPosition % boardSizeY;

        if (`${row},${col}` === firstCell) {
            continue;
        }

        minePositions.add(`${row},${col}`);
    }

    for (let i = 0; i < boardSizeX; i++) {
        for (let j = 0; j < boardSizeY; j++) {
            if (!minePositions.has(`${i},${j}`)) {
                const mineCount = countAdjacentMines(i, j);
                gameBoard[i][j].dataset.mines = mineCount;
            }
        }
    }
}

function countAdjacentMines(row, col) {
    let count = 0;
    for (let i = row - 1; i <= row + 1; i++) {
        for (let j = col - 1; j <= col + 1; j++) {
            if (i >= 0 && i < boardSizeX && j >= 0 && j < boardSizeY) {
                if (minePositions.has(`${i},${j}`)) {
                    count++;
                }
            }
        }
    }
    return count;
}

function startTimer() {
    startTime = Date.now(); 
    timerInterval = setInterval(() => {
        elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        timerElement.textContent = String(elapsedTime).padStart(3, '0');;
    }, 1000);
}

function revealCell(row, col) {
    if (gameOver) return;

    const cellKey = `${row},${col}`;
    const cell = gameBoard[row][col];

    if (flaggedCells.has(cellKey)) return;

    if (revealedCells.has(cellKey)) {
        chordReveal(row, col);
        return;
    }

    if (firstClick) {
        startTimer();
        placeMines(row, col);
        firstClick = false;
    }

    if (minePositions.has(cellKey)) {
        cell.classList.add('mine');
        gameOver = true;
        revealAllBombs(row, col);
        clearInterval(timerInterval);
        resetButton.textContent = '😵';
        return;
    }
    revealedCells.add(cellKey);
    cell.classList.add('revealed');

    const mineCount = cell.dataset.mines;

    if (mineCount > 0) {
        cell.textContent = mineCount;
        applyNumberColor(cell, mineCount);
    } else {
        revealAdjacentCells(row, col);
    }

    if (revealedCells.size === (boardSizeX * boardSizeY - numMines)) {
        gameOver = true;
        clearInterval(timerInterval);
        resetButton.textContent = '😎';
    }
}

function chordReveal(row, col) {
    const cell = gameBoard[row][col];

    if (!cell.classList.contains('revealed')) return;

    const mineCount = parseInt(cell.dataset.mines);
    if (isNaN(mineCount) || mineCount === 0) return; 

    let flagCount = 0;
    const neighbors = getNeighbors(row, col);

    neighbors.forEach(([r, c]) => {
        if (flaggedCells.has(`${r},${c}`)) {
            flagCount++;
        }
    });

    if (flagCount === mineCount) {
        for (let [r, c] of neighbors) {
            const neighborKey = `${r},${c}`;
            if (!revealedCells.has(neighborKey) && !flaggedCells.has(neighborKey)) {
                if (minePositions.has(neighborKey)) {
                    gameBoard[r][c].classList.add('mine');
                    gameOver = true;
                    revealAllBombs(r, c); 
                    clearInterval(timerInterval);
                    resetButton.textContent = '😵'; 
                    return;
                } else {
                    revealCell(r, c);
                }
            }
        }
    }
}


function getNeighbors(row, col) {
    const neighbors = [];
    for (let i = row - 1; i <= row + 1; i++) {
        for (let j = col - 1; j <= col + 1; j++) {
            if (i >= 0 && i < boardSizeX && j >= 0 && j < boardSizeY) {
                if (i === row && j === col) continue;
                neighbors.push([i, j]);
            }
        }
    }
    return neighbors;
}


function revealAllBombs(clickedRow = -1, clickedCol = -1) {
    for (let i = 0; i < boardSizeX; i++) {
        for (let j = 0; j < boardSizeY; j++) {
            const cell = gameBoard[i][j];
            const cellKey = `${i},${j}`;

            if (flaggedCells.has(cellKey)) {
                if (!minePositions.has(cellKey)) {
                    cell.classList.add('wrong-flag');
                }
                continue;
            }

            if (minePositions.has(cellKey)) {
                cell.classList.add('revealed');
                if (i === clickedRow && j === clickedCol) {
                    cell.textContent = '💣';
                    cell.classList.add('clicked-bomb');
                } else {
                    cell.textContent = '💣';
                    cell.classList.add('mine');
                }
            }
        }
    }
}


function revealAdjacentCells(row, col) {
    for (let i = row - 1; i <= row + 1; i++) {
        for (let j = col - 1; j <= col + 1; j++) {
            if (i >= 0 && i < boardSizeX && j >= 0 && j < boardSizeY) {
                if (!revealedCells.has(`${i},${j}`) && !minePositions.has(`${i},${j}`)) {
                    revealCell(i, j);
                }
            }
        }
    }
}

function flagCell(row, col) {
    if (revealedCells.has(`${row},${col}`) || gameOver) {
        return;
    }

    const cell = gameBoard[row][col];
    const cellKey = `${row},${col}`;

    if (flaggedCells.has(cellKey)) {
        flaggedCells.delete(cellKey);
        cell.classList.remove('flagged');
        cell.textContent = '';
        remainingMines++;
    } else {
        flaggedCells.add(cellKey);
        cell.classList.add('flagged');
        cell.textContent = '🚩'; 
        remainingMines--;
    }

    bombsRemainingElement.textContent = String(remainingMines).padStart(3, '0');;
}

function applyNumberColor(cell, number) {
    switch (number) {
        case '1':
            cell.classList.add('number-1');
            break;
        case '2':
            cell.classList.add('number-2');
            break;
        case '3':
            cell.classList.add('number-3');
            break;
        case '4':
            cell.classList.add('number-4');
            break;
        case '5':
            cell.classList.add('number-5');
            break;
        case '6':
            cell.classList.add('number-6');
            break;
        case '7':
            cell.classList.add('number-7');
            break;
        case '8':
            cell.classList.add('number-8');
            break;
    }
}

resetButton.addEventListener('click', createGame);

createGame();
