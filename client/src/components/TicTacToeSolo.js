import React, { useState, useEffect, useCallback } from 'react';

function checkWinner(squares) {
    const lines = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
        [0, 4, 8], [2, 4, 6]             // diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
        const [a, b, c] = lines[i];
        if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
            return { winner: squares[a], line: lines[i] };
        }
    }
    return null;
}

export default function TicTacToeSolo({ onClose }) {
    const [board, setBoard] = useState(Array(9).fill(null));
    const [difficulty, setDifficulty] = useState('medium'); // easy | medium (smart)
    const [playerSymbol, setPlayerSymbol] = useState('X');
    const [aiSymbol, setAiSymbol] = useState('O');
    const [turn, setTurn] = useState('X'); // X always goes first
    const [scores, setScores] = useState({ player: 0, ai: 0, draws: 0 });
    const [gameResult, setGameResult] = useState(null); // 'player' | 'ai' | 'draw' | null

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setTurn('X');
        setGameResult(null);
    };

    const makeAIMove = useCallback((currentBoard) => {
        const emptyIndices = currentBoard.map((val, idx) => val === null ? idx : null).filter(val => val !== null);
        if (emptyIndices.length === 0) return;

        let moveIndex;

        if (difficulty === 'easy') {
            // Random move
            moveIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        } else {
            // Smart Move: Check if AI can win, or if AI needs to block player, else random
            // 1. Can AI win in this move?
            for (let i = 0; i < emptyIndices.length; i++) {
                const testBoard = [...currentBoard];
                testBoard[emptyIndices[i]] = aiSymbol;
                if (checkWinner(testBoard)) {
                    moveIndex = emptyIndices[i];
                    break;
                }
            }

            // 2. Can player win? Block them
            if (moveIndex === undefined) {
                for (let i = 0; i < emptyIndices.length; i++) {
                    const testBoard = [...currentBoard];
                    testBoard[emptyIndices[i]] = playerSymbol;
                    if (checkWinner(testBoard)) {
                        moveIndex = emptyIndices[i];
                        break;
                    }
                }
            }

            // 3. Take center if available
            if (moveIndex === undefined && emptyIndices.includes(4)) {
                moveIndex = 4;
            }

            // 4. Default to random
            if (moveIndex === undefined) {
                moveIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            }
        }

        const newBoard = [...currentBoard];
        newBoard[moveIndex] = aiSymbol;
        setBoard(newBoard);

        const winInfo = checkWinner(newBoard);
        if (winInfo) {
            setGameResult('ai');
            setScores(prev => ({ ...prev, ai: prev.ai + 1 }));
        } else if (newBoard.every(cell => cell !== null)) {
            setGameResult('draw');
            setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
        } else {
            setTurn(playerSymbol);
        }
    }, [aiSymbol, playerSymbol, difficulty]);

    // Effect for AI Turn
    useEffect(() => {
        if (turn === aiSymbol && !gameResult) {
            const timer = setTimeout(() => {
                makeAIMove(board);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [turn, aiSymbol, gameResult, board, makeAIMove]);

    const handleCellClick = (idx) => {
        if (board[idx] || turn !== playerSymbol || gameResult) return;

        const newBoard = [...board];
        newBoard[idx] = playerSymbol;
        setBoard(newBoard);

        const winInfo = checkWinner(newBoard);
        if (winInfo) {
            setGameResult('player');
            setScores(prev => ({ ...prev, player: prev.player + 1 }));
        } else if (newBoard.every(cell => cell !== null)) {
            setGameResult('draw');
            setScores(prev => ({ ...prev, draws: prev.draws + 1 }));
        } else {
            setTurn(aiSymbol);
        }
    };

    const toggleSymbol = () => {
        const newPlayer = playerSymbol === 'X' ? 'O' : 'X';
        const newAi = newPlayer === 'X' ? 'O' : 'X';
        setPlayerSymbol(newPlayer);
        setAiSymbol(newAi);
        resetGame();
    };

    const winInfo = checkWinner(board);
    const winningLine = winInfo ? winInfo.line : [];

    return (
        <div style={st.overlay} onClick={(e) => e.target === e.currentTarget && onClose && onClose()}>
            <div style={st.modal}>
                <div style={st.header}>
                    <span style={st.title}>⭕ Tic Tac Toe (Solo)</span>
                    <button style={st.closeBtn} onClick={onClose}>✕</button>
                </div>

                <div style={st.configRow}>
                    <button style={st.toggleBtn} onClick={toggleSymbol}>
                        Playing as: <b>{playerSymbol}</b> (Swap)
                    </button>
                    <div style={{ display: 'flex', gap: 4, flex: 1 }}>
                        {['easy', 'medium'].map(d => (
                            <button 
                                key={d} 
                                style={st.diffBtn(difficulty === d)}
                                onClick={() => setDifficulty(d)}
                            >
                                {d === 'easy' ? 'Easy' : 'Smart'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scores */}
                <div style={st.statsRow}>
                    <div style={st.stat}>
                        <div style={{ fontSize: 10, color: '#666' }}>YOU</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>{scores.player}</div>
                    </div>
                    <div style={st.stat}>
                        <div style={{ fontSize: 10, color: '#666' }}>DRAWS</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#aaa' }}>{scores.draws}</div>
                    </div>
                    <div style={st.stat}>
                        <div style={{ fontSize: 10, color: '#666' }}>AI</div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#ef4444' }}>{scores.ai}</div>
                    </div>
                </div>

                {/* Status Message */}
                <div style={st.statusBox}>
                    {gameResult === 'player' && <span style={{ color: '#22c55e', fontWeight: 700 }}>🎉 You Win!</span>}
                    {gameResult === 'ai' && <span style={{ color: '#ef4444', fontWeight: 700 }}>😔 AI Wins</span>}
                    {gameResult === 'draw' && <span style={{ color: '#aaa', fontWeight: 700 }}>🤝 It's a Draw</span>}
                    {!gameResult && turn === playerSymbol && <span style={{ color: '#6C63FF', fontWeight: 600 }}>Your Turn</span>}
                    {!gameResult && turn === aiSymbol && <span style={{ color: '#888' }}>AI is thinking...</span>}
                </div>

                {/* Grid */}
                <div style={st.grid}>
                    {board.map((cell, idx) => {
                        const isWinning = winningLine.includes(idx);
                        return (
                            <button
                                key={idx}
                                onClick={() => handleCellClick(idx)}
                                style={st.cell(cell, isWinning)}
                            >
                                {cell}
                            </button>
                        );
                    })}
                </div>

                <button style={st.resetBtn} onClick={resetGame}>
                    ↺ Reset Board
                </button>
            </div>
        </div>
    );
}

const st = {
    overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' },
    modal: { background: '#0f0f14', border: '1px solid #2a2a3a', borderRadius: 20, padding: '28px 24px', width: '100%', maxWidth: 360, boxShadow: '0 32px 80px rgba(0,0,0,0.7)', fontFamily: "'Segoe UI', sans-serif", color: '#e8e8f0', textAlign: 'center' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: 700, color: '#fff' },
    closeBtn: { background: '#1e1e2e', border: '1px solid #2a2a3a', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', color: '#888', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    configRow: { display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' },
    toggleBtn: { padding: '7px 10px', background: '#1a1a26', border: '1px solid #2a2a3a', borderRadius: 8, color: '#ccc', fontSize: 11, cursor: 'pointer', outline: 'none' },
    diffBtn: (active) => ({ flex: 1, padding: '7px 0', background: active ? '#6C63FF' : 'transparent', border: '1px solid ' + (active ? '#6C63FF' : '#2a2a3a'), borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', outline: 'none' }),
    statsRow: { display: 'flex', gap: 12, marginBottom: 16 },
    stat: { flex: 1, background: '#1a1a26', borderRadius: 10, padding: '8px 10px' },
    statusBox: { height: 24, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: 270, margin: '0 auto 20px' },
    cell: (val, isWinning) => ({
        height: 84,
        fontSize: 36,
        fontWeight: 700,
        background: isWinning ? 'rgba(34,197,94,0.15)' : val === 'X' ? 'rgba(108,99,255,0.15)' : val === 'O' ? 'rgba(239,68,68,0.15)' : '#1a1a26',
        border: '2px solid ' + (isWinning ? '#22c55e' : val === 'X' ? '#6C63FF' : val === 'O' ? '#ef4444' : '#2a2a3a'),
        color: isWinning ? '#22c55e' : val === 'X' ? '#a78bfa' : '#f87171',
        borderRadius: 10,
        cursor: val ? 'default' : 'pointer',
        transition: 'all 0.12s',
        outline: 'none'
    }),
    resetBtn: { width: '100%', background: 'linear-gradient(135deg,#6d5fdf,#a78bfa)', border: 'none', borderRadius: 10, padding: '12px 0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }
};
