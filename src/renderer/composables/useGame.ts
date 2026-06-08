import { ref, computed, watch, onUnmounted } from 'vue';
import type { GameState, Move, PieceColor } from '../types';
import { PIECE_SYMBOLS, BLACK_PIECE_SYMBOLS } from '../types';
import { createInitialState, getLegalMoves, makeMove, getPieceAt, isGameOver, stateToFEN, FENToState } from '../../ai/board-state';
import { calculateProbabilities } from '../../ai/probability';
import { findBestMove } from '../../ai/search';
import { createGameRecord, exportToJSON, exportToText, downloadGameRecord } from '../utils/gameRecord';

interface AIEvaluation {
 turn: number;
 player: PieceColor;
 score: number;
 pvLine: string;
 nodesSearched: number;
}

const gameState = ref<GameState>(createInitialState());
const selectedPieceId = ref<string | null>(null);
const validMoves = ref<{
 row: number;
 col: number;
}[]>([]);
const gameMode = ref<'human-vs-human' | 'human-vs-ai' | 'ai-vs-ai'>('human-vs-ai');
const aiDepth = ref(2);
const isAIThinking = ref(false);
const statusMessage = ref('');
const showAlert = ref(false);
const alertType = ref<'check' | 'checkmate' | 'stalemate' | 'chase_lose'>('check');
const alertPlayer = ref<'red' | 'black'>('red');
const lastMoveFrom = ref<{ row: number; col: number } | null>(null);
const lastMoveTo = ref<{ row: number; col: number } | null>(null);
const aiEvaluations = ref<AIEvaluation[]>([]);
let aiTimer: ReturnType<typeof setTimeout> | null = null;

export function useGame() {
 const currentPlayer = computed(() => gameState.value.currentPlayer);
 const isGameEnded = computed(() => isGameOver(gameState.value));
 const isInCheck = computed(() => gameState.value.isInCheck);
 const capturedPieces = computed(() => gameState.value.capturedPieces);
 const winner = computed(() => {
 if (gameState.value.status === 'red_win')
 return 'red';
 if (gameState.value.status === 'black_win')
 return 'black';
 return null;
 });
 const darkPieceProbabilities = computed(() => {
 return calculateProbabilities(gameState.value);
 });

 function clearAITimer() {
 if (aiTimer) {
 clearTimeout(aiTimer);
 aiTimer = null;
 }
}

function newGame() {
 clearAITimer();
 gameState.value = createInitialState();
 selectedPieceId.value = null;
 validMoves.value = [];
 lastMoveFrom.value = null;
 lastMoveTo.value = null;
 statusMessage.value = '新游戏开始！红方先行';
}

 function selectPiece(pieceId: string) {
 if (isGameEnded.value)
 return;
 const piece = gameState.value.pieces.find(p => p.id === pieceId);
 if (!piece)
 return;
 if (piece.color !== gameState.value.currentPlayer)
 return;
 if (selectedPieceId.value === pieceId) {
 selectedPieceId.value = null;
 validMoves.value = [];
 return;
 }
 selectedPieceId.value = pieceId;
 // 获取所有合法移动
 validMoves.value = getLegalMoves(gameState.value, piece);
 }

 function movePiece(toRow: number, toCol: number) {
 if (!selectedPieceId.value)
 return;
 const piece = gameState.value.pieces.find(p => p.id === selectedPieceId.value);
 if (!piece)
 return;
 const isValidMove = validMoves.value.some(m => m.row === toRow && m.col === toCol);
 if (!isValidMove)
 return;
 const isReveal = !piece.isRevealed;
 const targetPiece = getPieceAt(gameState.value, { row: toRow, col: toCol });
 const move: Move = {
 pieceId: piece.id,
 from: { ...piece.position },
 to: { row: toRow, col: toCol },
 capturedPieceId: targetPiece?.id,
 isReveal,
 isCheck: false
 };
 
 // 保存当前玩家，用于调试
 const previousPlayer = gameState.value.currentPlayer;
 
 // 记录最后一步的起始位置
 lastMoveFrom.value = { row: piece.position.row, col: piece.position.col };
 // 记录最后一步的目标位置
 lastMoveTo.value = { row: toRow, col: toCol };

 gameState.value = makeMove(gameState.value, move);
 selectedPieceId.value = null;
 validMoves.value = [];
 
 // 根据将军状态和游戏结束状态生成消息和弹窗
 const checkStatus = gameState.value.isInCheck;
 const nextPlayerColor = gameState.value.currentPlayer === 'red' ? '红方' : '黑方';
 const nextPlayer = gameState.value.currentPlayer;
 const isGameEndedNow = gameState.value.status !== 'playing';
 
 if (isGameEndedNow) {
 // 检查是将死、困毙还是长捉
 if (gameState.value.status === 'red_chase_lose' || gameState.value.status === 'black_chase_lose') {
 const losingColor = gameState.value.status === 'red_chase_lose' ? '红方' : '黑方';
 const winningColor = gameState.value.status === 'red_chase_lose' ? '黑方' : '红方';
 alertType.value = 'chase_lose';
 statusMessage.value = `${losingColor}长捉判负！${winningColor}获胜！`;
 alertPlayer.value = gameState.value.status === 'red_chase_lose' ? 'red' : 'black';
 } else {
 const wasInCheck = checkStatus;
 if (wasInCheck) {
 alertType.value = 'checkmate';
 statusMessage.value = `${nextPlayerColor}被将死！${nextPlayer === 'red' ? '黑方' : '红方'}获胜！`;
 } else {
 alertType.value = 'stalemate';
 statusMessage.value = `${nextPlayerColor}无子可走！${nextPlayer === 'red' ? '黑方' : '红方'}获胜！`;
 }
 alertPlayer.value = nextPlayer;
 }
 // 先重置，再设置
 showAlert.value = false;
 setTimeout(() => {
 showAlert.value = true;
 }, 0);
 } else if (checkStatus) {
 alertType.value = 'check';
 alertPlayer.value = nextPlayer;
 // 先重置，再设置
 showAlert.value = false;
 setTimeout(() => {
 showAlert.value = true;
 }, 0);
 statusMessage.value = `${nextPlayerColor}被将军！`;
 } else {
 statusMessage.value = generateStatusMessage(move);
 }
 
 // 调试：确保玩家正确切换
 console.log('移动后:', {
 previousPlayer,
 currentPlayer: gameState.value.currentPlayer,
 isGameEnded: isGameEnded.value,
 gameMode: gameMode.value,
 isInCheck: checkStatus,
 status: gameState.value.status
 });
 
 checkAutoPlay();
 }

 function checkAutoPlay() {
 if (isGameEnded.value) return;

 if (gameMode.value === 'human-vs-ai' && gameState.value.currentPlayer === 'black') {
 setTimeout(aiMove, 500);
 } else if (gameMode.value === 'ai-vs-ai') {
 setTimeout(aiMove, 800);
 }
 }

 function generateStatusMessage(move: Move): string {
 const piece = gameState.value.pieces.find(p => p.id === move.pieceId);
 if (!piece)
 return '';
 const symbols = piece.color === 'red' ? PIECE_SYMBOLS : BLACK_PIECE_SYMBOLS;
 const pieceName = symbols[piece.type];
 const colLabels = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
 const rowLabels = ['十', '九', '八', '七', '六', '五', '四', '三', '二', '一'];
 const toPos = `${colLabels[move.to.col]}${rowLabels[move.to.row]}`;
 
 // 暗子移动并翻开
 if (move.isReveal) {
 if (move.capturedPieceId) {
 return `${piece.color === 'red' ? '红方' : '黑方'}暗子移动到${toPos}，翻开为${pieceName}，吃掉对方棋子！`;
 }
 return `${piece.color === 'red' ? '红方' : '黑方'}暗子移动到${toPos}，翻开为${pieceName}`;
 }
 
 // 明子移动
 const fromPos = `${colLabels[move.from.col]}${rowLabels[move.from.row]}`;
 if (move.capturedPieceId) {
 return `${piece.color === 'red' ? '红方' : '黑方'}${pieceName}从${fromPos}走到${toPos}，吃掉对方棋子`;
 }
 return `${piece.color === 'red' ? '红方' : '黑方'}${pieceName}从${fromPos}走到${toPos}`;
 }

 async function aiMove() {
 if (isGameEnded.value) return;
 isAIThinking.value = true;
 statusMessage.value = 'AI正在思考...';
 setTimeout(() => {
 const result = findBestMove(gameState.value, aiDepth.value);
 if (result.bestMove) {
 const move = result.bestMove;
 // 记录最后一步的起始位置
 lastMoveFrom.value = { row: move.from.row, col: move.from.col };
 // 记录最后一步的目标位置
 lastMoveTo.value = { row: move.to.row, col: move.to.col };

 // 在移动前获取棋子颜色
 const movingPiece = gameState.value.pieces.find(p => p.id === move.pieceId);
 const playerColor = movingPiece?.color || gameState.value.currentPlayer;
 
 gameState.value = makeMove(gameState.value, move);
 statusMessage.value = generateStatusMessage(move);
 
 // 记录AI评估结果
 const evalResult: AIEvaluation = {
 turn: gameState.value.history.length,
 player: playerColor,
 score: result.score,
 pvLine: result.pvLine || '',
 nodesSearched: result.nodesSearched
 };
 // 使用 concat 创建新数组以确保响应式更新，新结果添加到后面
 const newEvaluations = [...aiEvaluations.value, evalResult].slice(-3);
 aiEvaluations.value = newEvaluations;
 }
 isAIThinking.value = false;
 checkAutoPlay();
 }, 100);
}

 function setGameMode(mode: 'human-vs-human' | 'human-vs-ai' | 'ai-vs-ai') {
 clearAITimer();
 gameMode.value = mode;
 newGame();
 if (mode === 'ai-vs-ai') {
 setTimeout(aiMove, 1000);
 }
 }

 function setAIDepth(depth: number) {
 aiDepth.value = depth;
}

function exportGameAsJSON() {
 const record = createGameRecord(gameState.value, gameMode.value);
 const content = exportToJSON(record);
 const filename = `chess-game-${new Date().toISOString().slice(0, 10)}`;
 downloadGameRecord(content, filename, 'json');
}

function exportGameAsText() {
 const record = createGameRecord(gameState.value, gameMode.value);
 const content = exportToText(record);
 const filename = `chess-game-${new Date().toISOString().slice(0, 10)}`;
 downloadGameRecord(content, filename, 'txt');
}

function exportFEN(): string {
 return stateToFEN(gameState.value);
}

function importFEN(fen: string): boolean {
 const state = FENToState(fen);
 if (state) {
 gameState.value = state;
 selectedPieceId.value = null;
 validMoves.value = [];
 lastMoveFrom.value = null;
 lastMoveTo.value = null;
 return true;
 }
 return false;
}

onUnmounted(() => {
 clearAITimer();
});

return {
 gameState,
 selectedPieceId,
 validMoves,
 gameMode,
 aiDepth,
 isAIThinking,
 statusMessage,
 showAlert,
 alertType,
 alertPlayer,
 lastMoveFrom,
 lastMoveTo,
 aiEvaluations,
 currentPlayer,
 isGameEnded,
 isInCheck,
 capturedPieces,
 winner,
 darkPieceProbabilities,
 newGame,
 selectPiece,
 movePiece,
 setGameMode,
 setAIDepth,
 exportGameAsJSON,
 exportGameAsText,
 exportFEN,
 importFEN
 };
}
