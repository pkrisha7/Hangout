/* ==========================================================================
   HANGOUT - GAMES MODULE (TIC-TAC-TOE & SUDOKU)
   ========================================================================== */

// ── GLOBAL GAMES STATES ──────────────────────────────────────────────────
let currentGameType = null; // 'ttt' | 'sudoku'
let gameMode = null;        // 'solo' | 'room'

// Tic-Tac-Toe Solo State
let soloTTTBoard = Array(9).fill(null);
let soloTTTTurn = 'X'; // User is X, AI is O
let soloTTTActive = true;

// Sudoku Solo State (6x6)
let soloSudokuInitial = null;
let soloSudokuCurrent = null;
let soloSudokuSolution = null;
let soloSudokuNotes = Array(6).fill(null).map(() => Array(6).fill(null).map(() => new Set()));
let sudokuNotesMode = false;
let selectedSudokuCell = null; // { row, col }

// Room Multiplayer Role Cache
let roomMyTTTRole = null; // 'X' | 'O' | null (spectator)

// ==========================================================================
//          DASHBOARD LAUNCHERS (SOLO GAMES)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('play-solo-ttt').addEventListener('click', () => launchSoloGame('ttt'));
    document.getElementById('play-solo-sudoku').addEventListener('click', () => launchSoloGame('sudoku'));
    document.getElementById('close-solo-game').addEventListener('click', closeSoloGame);

    // Room game launchers
    document.getElementById('room-play-ttt').addEventListener('click', () => launchRoomGame('ttt'));
    document.getElementById('room-play-sudoku').addEventListener('click', () => launchRoomGame('sudoku'));
    document.getElementById('close-room-game').addEventListener('click', closeRoomGame);
});

function launchSoloGame(type) {
    currentGameType = type;
    gameMode = 'solo';

    const overlay = document.getElementById('solo-game-overlay');
    const title = document.getElementById('solo-game-title');
    const body = document.getElementById('solo-game-body');

    body.innerHTML = '';
    overlay.classList.remove('hidden');

    if (type === 'ttt') {
        title.innerText = 'Tic-Tac-Toe vs AI';
        initSoloTTT(body);
    } else if (type === 'sudoku') {
        title.innerText = 'Sudoku Solo';
        initSoloSudoku(body);
    }
}

function closeSoloGame() {
    document.getElementById('solo-game-overlay').classList.add('hidden');
    currentGameType = null;
    gameMode = null;
}

// ==========================================================================
//          ROOM GAME LAUNCHERS (MULTIPLAYER SYNCED)
// ==========================================================================
function launchRoomGame(type) {
    if (!state.activeRoomId) return;
    
    currentGameType = type;
    gameMode = 'room';

    const workspace = document.getElementById('room-game-workspace');
    const title = document.getElementById('room-game-name');
    const body = document.getElementById('room-game-body');

    body.innerHTML = '';
    workspace.classList.remove('hidden');

    if (type === 'ttt') {
        title.innerText = 'Tic-Tac-Toe (Synced)';
        initRoomTTT(body);
        socket.emit('ttt_reset', { roomId: state.activeRoomId });
    } else if (type === 'sudoku') {
        title.innerText = 'Sudoku Co-op';
        initRoomSudoku(body);

        const { initial, solution } = generateSudokuGrid('easy');
        soloSudokuInitial = initial;
        soloSudokuCurrent = JSON.parse(JSON.stringify(initial));
        soloSudokuSolution = solution;

        socket.emit('sudoku_init', {
            roomId: state.activeRoomId,
            board: { initial, current: soloSudokuCurrent, solution }
        });
        loadSudokuBoard({ initial, current: soloSudokuCurrent, solution });
    }
}

function closeRoomGame() {
    document.getElementById('room-game-workspace').classList.add('hidden');
    currentGameType = null;
    gameMode = null;
}


// ==========================================================================
//          TIC-TAC-TOE MECHANICS
// ==========================================================================

// ── SOLO TIC-TAC-TOE ───────────────────────────────────────────────────────
function initSoloTTT(container) {
    soloTTTBoard = Array(9).fill(null);
    soloTTTTurn = 'X';
    soloTTTActive = true;

    const gameDiv = document.createElement('div');
    gameDiv.className = 'ttt-container';
    gameDiv.innerHTML = `
        <div id="solo-ttt-status" class="ttt-status">Your turn (X)</div>
        <div class="ttt-board">
            ${Array(9).fill(0).map((_, i) => `<div class="ttt-cell" data-index="${i}"></div>`).join('')}
        </div>
        <button id="reset-solo-ttt-btn" class="btn secondary-btn sm-btn">Reset Game</button>
    `;

    container.appendChild(gameDiv);

    // Bind cells
    gameDiv.querySelectorAll('.ttt-cell').forEach(cell => {
        cell.addEventListener('click', (e) => handleSoloTTTClick(e.target));
    });

    document.getElementById('reset-solo-ttt-btn').addEventListener('click', () => {
        initSoloTTT(container);
    });
}

function handleSoloTTTClick(cell) {
    if (!soloTTTActive || soloTTTTurn !== 'X') return;
    const index = parseInt(cell.dataset.index);
    if (soloTTTBoard[index]) return;

    // Player Move
    makeSoloTTTMove(index, 'X');
    
    // Check Win/Draw
    if (checkTTTWin(soloTTTBoard, 'X')) {
        document.getElementById('solo-ttt-status').innerText = 'You Win!';
        showToast('Winner!', 'You defeated the AI in Tic-Tac-Toe.', 'success');
        soloTTTActive = false;
        return;
    }
    if (soloTTTBoard.every(cell => cell !== null)) {
        document.getElementById('solo-ttt-status').innerText = "It's a Draw!";
        soloTTTActive = false;
        return;
    }

    // AI Move
    soloTTTTurn = 'O';
    document.getElementById('solo-ttt-status').innerText = 'AI is thinking...';
    
    setTimeout(() => {
        const aiIndex = getBestTTTMove(soloTTTBoard);
        makeSoloTTTMove(aiIndex, 'O');

        if (checkTTTWin(soloTTTBoard, 'O')) {
            document.getElementById('solo-ttt-status').innerText = 'AI Wins!';
            showToast('Lost!', 'AI defeated you in Tic-Tac-Toe.', 'info');
            soloTTTActive = false;
            return;
        }
        if (soloTTTBoard.every(cell => cell !== null)) {
            document.getElementById('solo-ttt-status').innerText = "It's a Draw!";
            soloTTTActive = false;
            return;
        }

        soloTTTTurn = 'X';
        document.getElementById('solo-ttt-status').innerText = 'Your turn (X)';
    }, 600);
}

function makeSoloTTTMove(index, symbol) {
    soloTTTBoard[index] = symbol;
    const cell = document.querySelector(`.ttt-container .ttt-cell[data-index="${index}"]`);
    if (cell) {
        cell.innerText = symbol;
        cell.classList.add(symbol);
    }
}

// ── MULTIPLAYER TIC-TAC-TOE ───────────────────────────────────────────────
function initRoomTTT(container) {
    const gameDiv = document.createElement('div');
    gameDiv.className = 'ttt-container';
    gameDiv.innerHTML = `
        <div id="room-ttt-status" class="ttt-status">Waiting for game data...</div>
        <div class="ttt-board">
            ${Array(9).fill(0).map((_, i) => `<div class="ttt-cell" data-index="${i}"></div>`).join('')}
        </div>
        ${state.isHost ? '<button id="reset-room-ttt-btn" class="btn secondary-btn sm-btn">Reset Game</button>' : ''}
    `;

    container.appendChild(gameDiv);

    gameDiv.querySelectorAll('.ttt-cell').forEach(cell => {
        cell.addEventListener('click', (e) => {
            const index = parseInt(e.target.dataset.index);
            // Emit to server
            socket.emit('ttt_move', { roomId: state.activeRoomId, index });
        });
    });

    if (state.isHost) {
        document.getElementById('reset-room-ttt-btn').addEventListener('click', () => {
            socket.emit('ttt_reset', { roomId: state.activeRoomId });
        });
    }
}

// Called by socket.js on ttt_update or watch_room_state
function updateTTTBoard(board, turn) {
    const statusText = document.getElementById('room-ttt-status');
    if (!statusText) return;

    // Detect role (X or O)
    // Server assigns roles dynamically when joining the watch party.
    // The server watch_room_state response provides myRole.
    // Let's deduce roles or fetch them.
    
    // Update board cells
    board.forEach((val, idx) => {
        const cell = document.querySelector(`.room-game-body .ttt-cell[data-index="${idx}"]`);
        if (cell) {
            cell.innerText = val || '';
            cell.className = 'ttt-cell';
            if (val) cell.classList.add(val);
        }
    });

    // Check winner
    if (checkTTTWin(board, 'X')) {
        statusText.innerText = 'Player X Wins!';
        return;
    }
    if (checkTTTWin(board, 'O')) {
        statusText.innerText = 'Player O Wins!';
        return;
    }
    if (board.every(cell => cell !== null)) {
        statusText.innerText = "It's a Draw!";
        return;
    }

    statusText.innerText = `Turn: Player ${turn}`;
}

// ── WIN CHECK & AI LOGIC ───────────────────────────────────────────────────
const winPatterns = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
    [0, 4, 8], [2, 4, 6]             // Diagonals
];

function checkTTTWin(board, player) {
    return winPatterns.some(pattern => {
        return pattern.every(idx => board[idx] === player);
    });
}

function getBestTTTMove(board) {
    // Simple minimax or smart random fallback
    // For simplicity, find immediate winning move, blocking move, center, or corners.
    
    // 1. Can AI win this turn?
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            let temp = [...board];
            temp[i] = 'O';
            if (checkTTTWin(temp, 'O')) return i;
        }
    }
    
    // 2. Does AI need to block Player?
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            let temp = [...board];
            temp[i] = 'X';
            if (checkTTTWin(temp, 'X')) return i;
        }
    }

    // 3. Take Center if open
    if (board[4] === null) return 4;

    // 4. Take Corners
    const corners = [0, 2, 6, 8];
    const openCorners = corners.filter(idx => board[idx] === null);
    if (openCorners.length > 0) {
        return openCorners[Math.floor(Math.random() * openCorners.length)];
    }

    // 5. Take Sides
    const sides = [1, 3, 5, 7];
    const openSides = sides.filter(idx => board[idx] === null);
    return openSides[0];
}


// ==========================================================================
//          SUDOKU PUZZLE MECHANICS (6x6 MINI SUDOKU)
// ==========================================================================

// ── SOLO SUDOKU ────────────────────────────────────────────────────────────
function initSoloSudoku(container) {
    const gameDiv = document.createElement('div');
    gameDiv.className = 'sudoku-container';
    gameDiv.innerHTML = `
        <div class="sudoku-controls">
            <button class="btn secondary-btn sm-btn diff-btn active" data-diff="easy">Easy</button>
            <button class="btn secondary-btn sm-btn diff-btn" data-diff="medium">Medium</button>
            <button class="btn secondary-btn sm-btn diff-btn" data-diff="hard">Hard</button>
        </div>
        <div class="sudoku-board mini-sudoku"></div>
        <div class="sudoku-action-bar">
            <button id="sudoku-hint-btn" class="btn secondary-btn sm-btn"><i class="fa-solid fa-lightbulb"></i> Hint</button>
            <button id="sudoku-notes-btn" class="btn secondary-btn sm-btn"><i class="fa-solid fa-pencil"></i> Notes: <span class="notes-status-lbl">OFF</span></button>
        </div>
        <div class="sudoku-numpad">
            <button class="numpad-btn" data-val="1">1</button>
            <button class="numpad-btn" data-val="2">2</button>
            <button class="numpad-btn" data-val="3">3</button>
            <button class="numpad-btn clear-btn" data-val="clear"><i class="fa-solid fa-eraser"></i></button>
            
            <button class="numpad-btn" data-val="4">4</button>
            <button class="numpad-btn" data-val="5">5</button>
            <button class="numpad-btn" data-val="6">6</button>
            <button id="sudoku-restart-btn" class="numpad-btn reset-btn" data-val="restart"><i class="fa-solid fa-rotate-left"></i></button>
        </div>
        <div id="solo-sudoku-status" class="sudoku-status">Solve the Sudoku!</div>
    `;

    container.appendChild(gameDiv);

    // Bind difficulty selectors
    gameDiv.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            gameDiv.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            generateAndLoadSoloSudoku(btn.dataset.diff);
        });
    });

    // Initial Load
    generateAndLoadSoloSudoku('easy');
}

function generateAndLoadSoloSudoku(difficulty) {
    const { initial, solution } = generateSudokuGrid(difficulty);
    soloSudokuInitial = initial;
    soloSudokuCurrent = JSON.parse(JSON.stringify(initial));
    soloSudokuSolution = solution;

    // Reset notes
    soloSudokuNotes = Array(6).fill(null).map(() => Array(6).fill(null).map(() => new Set()));
    sudokuNotesMode = false;

    const boardData = { initial, current: soloSudokuCurrent, solution };
    loadSudokuBoard(boardData);
}

// ── MULTIPLAYER SUDOKU ─────────────────────────────────────────────────────
function initRoomSudoku(container) {
    const gameDiv = document.createElement('div');
    gameDiv.className = 'sudoku-container';
    gameDiv.innerHTML = `
        <div class="sudoku-board mini-sudoku"></div>
        <div class="sudoku-action-bar">
            <button id="sudoku-hint-btn" class="btn secondary-btn sm-btn"><i class="fa-solid fa-lightbulb"></i> Hint</button>
            <button id="sudoku-notes-btn" class="btn secondary-btn sm-btn"><i class="fa-solid fa-pencil"></i> Notes: <span class="notes-status-lbl">OFF</span></button>
        </div>
        <div class="sudoku-numpad">
            <button class="numpad-btn" data-val="1">1</button>
            <button class="numpad-btn" data-val="2">2</button>
            <button class="numpad-btn" data-val="3">3</button>
            <button class="numpad-btn clear-btn" data-val="clear"><i class="fa-solid fa-eraser"></i></button>
            
            <button class="numpad-btn" data-val="4">4</button>
            <button class="numpad-btn" data-val="5">5</button>
            <button class="numpad-btn" data-val="6">6</button>
            <button id="sudoku-restart-btn" class="numpad-btn reset-btn" data-val="restart"><i class="fa-solid fa-rotate-left"></i></button>
        </div>
        <div id="room-sudoku-status" class="sudoku-status">Solve the board together!</div>
    `;

    container.appendChild(gameDiv);
}

// ── SUDOKU BOARD RENDERING ─────────────────────────────────────────────────
function loadSudokuBoard(boardData) {
    const prefix = gameMode === 'solo' ? '.overlay-body' : '.room-game-body';
    const container = document.querySelector(`${prefix} .sudoku-board`);
    if (!container) return;

    container.innerHTML = '';
    selectedSudokuCell = null;

    soloSudokuInitial = boardData.initial;
    soloSudokuCurrent = boardData.current;
    soloSudokuSolution = boardData.solution;

    // Reset notes on initial load if not already set
    if (!soloSudokuNotes) {
        soloSudokuNotes = Array(6).fill(null).map(() => Array(6).fill(null).map(() => new Set()));
    }

    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            const cell = document.createElement('div');
            cell.className = 'sudoku-cell';
            cell.dataset.row = r;
            cell.dataset.col = c;

            // Highlight border lines for 2x3 blocks
            if (r === 1 || r === 3) cell.classList.add('sudoku-grid-row-border');

            // Draw initial content
            drawCellContent(cell, r, c);

            // Bind click selection
            cell.addEventListener('click', () => {
                selectedSudokuCell = { row: r, col: c };
                highlightSudokuBoard(r, c);
            });

            container.appendChild(cell);
        }
    }

    // Direct Keyboard listener
    document.onkeydown = (e) => {
        if (!selectedSudokuCell) return;
        const { row, col } = selectedSudokuCell;
        const isFixed = soloSudokuInitial[row][col] !== 0;
        if (isFixed) return;

        if (e.key >= '1' && e.key <= '6') {
            const val = parseInt(e.key);
            handleSudokuEntry(row, col, val);
        } else if (e.key === 'Backspace' || e.key === 'Delete') {
            handleSudokuEntry(row, col, 0); // Clear
        }
    };

    bindSudokuControls();
}

function drawCellContent(cellEl, r, c) {
    cellEl.innerHTML = '';
    const val = soloSudokuCurrent[r][c];
    const isFixed = soloSudokuInitial[r][c] !== 0;

    if (isFixed) {
        cellEl.classList.add('fixed');
        const span = document.createElement('span');
        span.className = 'cell-value';
        span.innerText = val;
        cellEl.appendChild(span);
        return;
    }

    if (val !== 0) {
        const span = document.createElement('span');
        span.className = 'cell-value user-val';
        span.innerText = val;
        cellEl.appendChild(span);

        // Conflict check
        if (hasSudokuConflict(r, c, val)) {
            cellEl.classList.add('error');
        } else {
            cellEl.classList.remove('error');
        }
    } else {
        cellEl.classList.remove('error');
        // Render candidates/notes grid (2x3)
        const notesSet = soloSudokuNotes[r][c];
        if (notesSet && notesSet.size > 0) {
            const notesGrid = document.createElement('div');
            notesGrid.className = 'cell-notes';
            for (let num = 1; num <= 6; num++) {
                const noteSpan = document.createElement('span');
                noteSpan.className = 'note-num';
                noteSpan.innerText = notesSet.has(num) ? num : '';
                notesGrid.appendChild(noteSpan);
            }
            cellEl.appendChild(notesGrid);
        }
    }
}

function hasSudokuConflict(row, col, value) {
    if (value === 0) return false;

    // Check row
    for (let c = 0; c < 6; c++) {
        if (c !== col && soloSudokuCurrent[row][c] === value) return true;
    }

    // Check column
    for (let r = 0; r < 6; r++) {
        if (r !== row && soloSudokuCurrent[r][col] === value) return true;
    }

    // Check 2x3 block
    const blockRowStart = Math.floor(row / 2) * 2;
    const blockColStart = Math.floor(col / 3) * 3;
    for (let r = blockRowStart; r < blockRowStart + 2; r++) {
        for (let c = blockColStart; c < blockColStart + 3; c++) {
            if ((r !== row || c !== col) && soloSudokuCurrent[r][c] === value) return true;
        }
    }

    return false;
}

function highlightSudokuBoard(selectedRow, selectedCol) {
    const prefix = gameMode === 'solo' ? '.overlay-body' : '.room-game-body';
    
    // Clear all previous highlights
    document.querySelectorAll(`${prefix} .sudoku-cell`).forEach(cell => {
        cell.classList.remove('selected', 'highlight-axis', 'highlight-match');
    });

    if (selectedRow === null || selectedCol === null) return;

    const selectedVal = soloSudokuCurrent[selectedRow][selectedCol];

    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            const cell = document.querySelector(`${prefix} .sudoku-cell[data-row="${r}"][data-col="${c}"]`);
            if (!cell) continue;

            if (r === selectedRow && c === selectedCol) {
                cell.classList.add('selected');
                continue;
            }

            // Axis highlight (Row & Column)
            if (r === selectedRow || c === selectedCol) {
                cell.classList.add('highlight-axis');
            }

            // Identical number highlight
            const val = soloSudokuCurrent[r][c];
            if (selectedVal !== 0 && val === selectedVal) {
                cell.classList.add('highlight-match');
            }
        }
    }
}

function handleSudokuEntry(row, col, value) {
    const prefix = gameMode === 'solo' ? '.overlay-body' : '.room-game-body';
    
    if (sudokuNotesMode && value !== 0) {
        // Toggle notes candidate
        const notesSet = soloSudokuNotes[row][col];
        if (notesSet.has(value)) {
            notesSet.delete(value);
        } else {
            notesSet.add(value);
        }
        soloSudokuCurrent[row][col] = 0; // Value is empty when candidates show
    } else {
        // Value entry
        soloSudokuCurrent[row][col] = value;
        soloSudokuNotes[row][col].clear(); // Clear candidates when value entered
    }

    const cell = document.querySelector(`${prefix} .sudoku-cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        drawCellContent(cell, row, col);
    }

    // Refresh highlighting
    highlightSudokuBoard(row, col);

    // Sync state
    if (gameMode === 'room' && state.activeRoomId) {
        socket.emit('sudoku_cell_change', {
            roomId: state.activeRoomId,
            row,
            col,
            value: soloSudokuCurrent[row][col],
            notes: Array.from(soloSudokuNotes[row][col])
        });
    }

    checkSudokuCompletion();
}

function bindSudokuControls() {
    const prefix = gameMode === 'solo' ? '.overlay-body' : '.room-game-body';
    
    // Bind Numpad Buttons (1 to 6)
    const numButtons = document.querySelectorAll(`${prefix} .numpad-btn`);
    numButtons.forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        
        newBtn.addEventListener('click', () => {
            if (!selectedSudokuCell) return;
            const { row, col } = selectedSudokuCell;
            const isFixed = soloSudokuInitial[row][col] !== 0;
            if (isFixed) return;

            const val = newBtn.dataset.val;
            const intVal = val === 'clear' ? 0 : parseInt(val);
            handleSudokuEntry(row, col, intVal);
        });
    });

    // Bind Notes Mode Toggle Button
    const notesBtn = document.querySelector(`${prefix} #sudoku-notes-btn`);
    if (notesBtn) {
        const newNotesBtn = notesBtn.cloneNode(true);
        notesBtn.parentNode.replaceChild(newNotesBtn, notesBtn);
        
        newNotesBtn.addEventListener('click', () => {
            sudokuNotesMode = !sudokuNotesMode;
            newNotesBtn.querySelector('.notes-status-lbl').innerText = sudokuNotesMode ? 'ON' : 'OFF';
            if (sudokuNotesMode) {
                newNotesBtn.classList.add('primary-btn');
                newNotesBtn.classList.remove('secondary-btn');
            } else {
                newNotesBtn.classList.remove('primary-btn');
                newNotesBtn.classList.add('secondary-btn');
            }
        });
    }

    // Bind Hint button
    const hintBtn = document.querySelector(`${prefix} #sudoku-hint-btn`);
    if (hintBtn) {
        const newHintBtn = hintBtn.cloneNode(true);
        hintBtn.parentNode.replaceChild(newHintBtn, hintBtn);
        
        newHintBtn.addEventListener('click', () => {
            if (!selectedSudokuCell) {
                return showToast('Hint', 'Please select a cell first.', 'info');
            }
            const { row, col } = selectedSudokuCell;
            const isFixed = soloSudokuInitial[row][col] !== 0;
            if (isFixed) return;
            
            const correctVal = soloSudokuSolution[row][col];
            handleSudokuEntry(row, col, correctVal);
        });
    }

    // Bind Restart button
    const restartBtn = document.querySelector(`${prefix} #sudoku-restart-btn`);
    if (restartBtn) {
        const newRestartBtn = restartBtn.cloneNode(true);
        restartBtn.parentNode.replaceChild(newRestartBtn, restartBtn);
        newRestartBtn.addEventListener('click', () => {
            restartSudokuGame();
        });
    }
}

function restartSudokuGame() {
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            soloSudokuCurrent[r][c] = soloSudokuInitial[r][c];
            soloSudokuNotes[r][c].clear();
        }
    }

    const prefix = gameMode === 'solo' ? '.overlay-body' : '.room-game-body';
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            const cell = document.querySelector(`${prefix} .sudoku-cell[data-row="${r}"][data-col="${c}"]`);
            if (cell) drawCellContent(cell, r, c);
        }
    }

    selectedSudokuCell = null;
    highlightSudokuBoard(null, null);

    if (gameMode === 'room' && state.activeRoomId) {
        socket.emit('sudoku_init', {
            roomId: state.activeRoomId,
            board: { initial: soloSudokuInitial, current: soloSudokuCurrent, solution: soloSudokuSolution }
        });
    }
}

function updateSudokuCell(row, col, value, notesArray) {
    const prefix = gameMode === 'solo' ? '.overlay-body' : '.room-game-body';
    
    soloSudokuCurrent[row][col] = value;
    if (notesArray) {
        soloSudokuNotes[row][col] = new Set(notesArray);
    } else {
        soloSudokuNotes[row][col].clear();
    }

    const cell = document.querySelector(`${prefix} .sudoku-cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        drawCellContent(cell, row, col);
    }

    if (selectedSudokuCell) {
        highlightSudokuBoard(selectedSudokuCell.row, selectedSudokuCell.col);
    }

    checkSudokuCompletion();
}

function checkSudokuCompletion() {
    const statusText = document.getElementById(`${gameMode}-sudoku-status`);
    if (!statusText) return;

    let correct = true;
    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            if (soloSudokuCurrent[r][c] !== soloSudokuSolution[r][c]) {
                correct = false;
                break;
            }
        }
    }

    if (correct) {
        statusText.innerText = 'Completed! Congratulations!';
        showToast('Sudoku Completed!', 'You solved the Sudoku puzzle!', 'success');
    } else {
        statusText.innerText = gameMode === 'solo' ? 'Solve the Sudoku!' : 'Solve the board together!';
    }
}

// ── SUDOKU GENERATION UTILITIES (6x6 MINI) ──────────────────────────────────
const baseSudokuTemplate = [
    [1, 2, 3, 4, 5, 6],
    [4, 5, 6, 1, 2, 3],
    [2, 3, 1, 5, 6, 4],
    [5, 6, 4, 2, 3, 1],
    [3, 1, 2, 6, 4, 5],
    [6, 4, 5, 3, 1, 2]
];

function generateSudokuGrid(difficulty) {
    let board = JSON.parse(JSON.stringify(baseSudokuTemplate));

    // Remap digits 1-6
    const map = [1, 2, 3, 4, 5, 6];
    for (let i = map.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [map[i], map[j]] = [map[j], map[i]];
    }

    for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
            board[r][c] = map[board[r][c] - 1];
        }
    }

    const solution = JSON.parse(JSON.stringify(board));
    
    // Holes based on difficulty
    let removeCount = 12; // Easy
    if (difficulty === 'medium') removeCount = 18;
    if (difficulty === 'hard') removeCount = 24;

    let initial = JSON.parse(JSON.stringify(board));
    let cellIndices = Array.from({ length: 36 }, (_, i) => i);
    
    for (let i = cellIndices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cellIndices[i], cellIndices[j]] = [cellIndices[j], cellIndices[i]];
    }

    for (let i = 0; i < removeCount; i++) {
        const cellIdx = cellIndices[i];
        const r = Math.floor(cellIdx / 6);
        const c = cellIdx % 6;
        initial[r][c] = 0;
    }

    return { initial, solution };
}
