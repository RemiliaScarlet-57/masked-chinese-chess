export type PieceType = 'king' | 'guard' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'soldier'
export type PieceColor = 'red' | 'black'

export interface Position {
  row: number
  col: number
}

export interface Piece {
  id: string
  type: PieceType
  color: PieceColor
  isRevealed: boolean
  position: Position
  hiddenType?: PieceType // 暗子内部的真实类型
}

export interface DarkPieceProbability {
  pieceId: string
  possibleTypes: Map<PieceType, number>
}

export interface Move {
  pieceId: string
  from: Position
  to: Position
  capturedPieceId?: string
  isReveal: boolean
  isCheck: boolean
}

export interface MoveKey {
  pieceId: string
  fromRow: number
  fromCol: number
  toRow: number
  toCol: number
}

export interface CaptureInfo {
  pieceId: string
  type: PieceType
  color: PieceColor
}

export interface GameState {
  pieces: Piece[]
  currentPlayer: PieceColor
  history: Move[]
  status: 'playing' | 'red_win' | 'black_win' | 'draw' | 'red_chase_lose' | 'black_chase_lose'
  selectedPieceId: string | null
  darkPieceProbabilities: DarkPieceProbability[]
  remainingPieces: Map<PieceColor, Map<PieceType, number>>
  capturedPieces: {
    red: Piece[]
    black: Piece[]
  }
  isInCheck: boolean
  // 长捉相关状态
  positionHistory: string[]
  repeatCount: number
}

export interface HistoryItem {
  move: Move
  state: GameState
}

export const PIECE_VALUES: Record<PieceType, number> = {
  king: 10000,
  guard: 200,
  elephant: 200,
  horse: 450,
  chariot: 900,
  cannon: 450,
  soldier: 100
}

export const INITIAL_PIECE_COUNT: Record<PieceType, number> = {
  king: 1,
  guard: 2,
  elephant: 2,
  horse: 2,
  chariot: 2,
  cannon: 2,
  soldier: 5
}

export const PIECE_SYMBOLS: Record<PieceType, string> = {
  king: '帅',
  guard: '仕',
  elephant: '相',
  horse: '马',
  chariot: '车',
  cannon: '炮',
  soldier: '兵'
}

export const BLACK_PIECE_SYMBOLS: Record<PieceType, string> = {
  king: '将',
  guard: '士',
  elephant: '象',
  horse: '马',
  chariot: '車',
  cannon: '砲',
  soldier: '卒'
}
