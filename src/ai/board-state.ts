import type { Piece, Position, PieceType, PieceColor, GameState, Move } from '../renderer/types'
import { INITIAL_PIECE_COUNT } from '../renderer/types'

const DARK_PIECE_TYPES: PieceType[] = ['chariot', 'horse', 'cannon', 'soldier', 'guard', 'elephant']

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function generateDarkPieceTypes(color: PieceColor, remainingPieces: Map<PieceColor, Map<PieceType, number>>): PieceType[] {
  const types: PieceType[] = []
  const colorMap = remainingPieces.get(color)
  
  if (!colorMap) return types
  
  for (const [type, count] of colorMap) {
    if (type !== 'king') {
      for (let i = 0; i < count; i++) {
        types.push(type)
      }
    }
  }
  
  return shuffleArray(types)
}

// 揭棋布局：每个位置对应的原始棋子类型
const INITIAL_LAYOUT: Record<PieceColor, PieceType[][]> = {
  black: [
    ['chariot', 'horse', 'elephant', 'guard', 'king', 'guard', 'elephant', 'horse', 'chariot'],
    [],
    [null, 'cannon', null, null, null, null, null, 'cannon', null],
    ['soldier', null, 'soldier', null, 'soldier', null, 'soldier', null, 'soldier'],
    [], [], [], [], [], []
  ],
  red: [
    [], [], [], [], [], [],
    ['soldier', null, 'soldier', null, 'soldier', null, 'soldier', null, 'soldier'],
    [null, 'cannon', null, null, null, null, null, 'cannon', null],
    [],
    ['chariot', 'horse', 'elephant', 'guard', 'king', 'guard', 'elephant', 'horse', 'chariot']
  ]
}

/**
 * 根据位置获取该位置在揭棋开局中对应的原始棋子类型
 * 这决定了暗子的移动规则
 */
function getOriginalPieceTypeAtPosition(row: number, col: number, color: PieceColor): PieceType {
  const layout = INITIAL_LAYOUT[color]
  return layout[row]?.[col] || 'soldier'
}

export function createInitialState(): GameState {
  const pieces: Piece[] = []
  
  const remainingPieces = new Map<PieceColor, Map<PieceType, number>>()
  for (const color of ['red', 'black'] as PieceColor[]) {
    const map = new Map<PieceType, number>()
    for (const [type, count] of Object.entries(INITIAL_PIECE_COUNT)) {
      map.set(type as PieceType, count)
    }
    remainingPieces.set(color, map)
  }
  
  const blackLayout: PieceType[][] = [
    ['chariot', 'horse', 'elephant', 'guard', 'king', 'guard', 'elephant', 'horse', 'chariot'],
    [],
    [null, 'cannon', null, null, null, null, null, 'cannon', null],
    ['soldier', null, 'soldier', null, 'soldier', null, 'soldier', null, 'soldier'],
    [],
    [],
    [],
    [],
    [],
    []
  ]
  
  const redLayout: PieceType[][] = [
    [],
    [],
    [],
    [],
    [],
    [],
    ['soldier', null, 'soldier', null, 'soldier', null, 'soldier', null, 'soldier'],
    [null, 'cannon', null, null, null, null, null, 'cannon', null],
    [],
    ['chariot', 'horse', 'elephant', 'guard', 'king', 'guard', 'elephant', 'horse', 'chariot']
  ]
  
  const redDarkTypes = generateDarkPieceTypes('red', remainingPieces)
  const blackDarkTypes = generateDarkPieceTypes('black', remainingPieces)
  let redDarkIndex = 0
  let blackDarkIndex = 0

  let pieceIndex = 0
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 9; col++) {
      let pieceType: PieceType | null = null
      let color: PieceColor = 'red'
      
      pieceType = blackLayout[row]?.[col] || null
      if (pieceType) {
        color = 'black'
      } else {
        pieceType = redLayout[row]?.[col] || null
        color = 'red'
      }
      
      if (pieceType) {
        const isRevealed = pieceType === 'king'
        const piece: Piece = {
          id: `piece-${row}-${col}-${pieceIndex}`,
          type: pieceType,
          color,
          isRevealed,
          position: { row, col }
        }
        
        if (!isRevealed) {
          if (color === 'black' && blackDarkIndex < blackDarkTypes.length) {
            piece.hiddenType = blackDarkTypes[blackDarkIndex++]
          } else if (color === 'red' && redDarkIndex < redDarkTypes.length) {
            piece.hiddenType = redDarkTypes[redDarkIndex++]
          }
        }
        
        pieces.push(piece)
        pieceIndex++
      }
    }
  }
  
  return {
    pieces,
    currentPlayer: 'red',
    history: [],
    status: 'playing',
    selectedPieceId: null,
    darkPieceProbabilities: [],
    remainingPieces,
    capturedPieces: { red: [], black: [] },
    isInCheck: false,
    positionHistory: [],
    repeatCount: 0
  }
}

// 生成棋盘位置的唯一标识符
function generatePositionKey(state: GameState): string {
  const pieces = state.pieces
    .filter(p => p.isRevealed || p.type === 'king')
    .map(p => `${p.id}-${p.position.row}-${p.position.col}-${p.type}-${p.color}-${p.isRevealed ? 1 : 0}`)
    .sort()
    .join('|')
  
  return `${state.currentPlayer}-${pieces}`
}

// 检查一个棋子是否正在攻击另一个棋子
function isPieceAttacking(state: GameState, attacker: Piece, target: Piece): boolean {
  if (attacker.color === target.color) return false
  const attacks = getLegalMovesForCheck(state, attacker)
  return attacks.some(pos => pos.row === target.position.row && pos.col === target.position.col)
}

// 获取当前状态下所有正在被攻击的棋子
function getAttackedPieces(state: GameState, attackerColor: PieceColor): Piece[] {
  const attackedPieces: Piece[] = []
  const attackers = state.pieces.filter(p => p.color === attackerColor)
  const targets = state.pieces.filter(p => p.color !== attackerColor)
  
  for (const attacker of attackers) {
    for (const target of targets) {
      if (isPieceAttacking(state, attacker, target)) {
        if (!attackedPieces.find(p => p.id === target.id)) {
          attackedPieces.push(target)
        }
      }
    }
  }
  return attackedPieces
}

// 检测长捉 - 当同一玩家多次重复攻击同一组棋子时触发
function detectChase(state: GameState, newPositionKey: string): {
  isChase: boolean
  losingColor: PieceColor | null
} {
  // 保持最多16步的历史记录（2个完整循环）
  const updatedHistory = [...state.positionHistory, newPositionKey].slice(-16)
  
  // 检查是否有重复的局面模式（每2步是一个完整回合）
  let repeatCount = 0
  let lastOccurrenceIndex = -1
  
  for (let i = 0; i < updatedHistory.length - 2; i += 2) {
    // 检查从i开始的序列是否与最近的序列相同
    let isRepeat = true
    for (let j = 0; j < 4; j++) {
      if (updatedHistory[updatedHistory.length - 4 + j] !== updatedHistory[i + j]) {
        isRepeat = false
        break
      }
    }
    
    if (isRepeat) {
      lastOccurrenceIndex = i
      repeatCount++
      if (repeatCount >= 2) { // 2个完整循环（3次重复局面）
        break
      }
    }
  }
  
  // 如果有重复，分析攻击模式
  if (repeatCount >= 2 && lastOccurrenceIndex !== -1) {
    // 检查红方是否在长捉
    const isRedChase = isConsistentChase(state, 'red')
    // 检查黑方是否在长捉
    const isBlackChase = isConsistentChase(state, 'black')
    
    // 只有一方在长捉时才判负
    if (isRedChase && !isBlackChase) {
      return { isChase: true, losingColor: 'red' }
    } else if (isBlackChase && !isRedChase) {
      return { isChase: true, losingColor: 'black' }
    }
  }
  
  return { isChase: false, losingColor: null }
}

// 检查某一方是否在持续攻击有根或无根的关键棋子（排除将帅被将军的情况）
function isConsistentChase(state: GameState, attackerColor: PieceColor): boolean {
  // 获取被攻击的棋子
  const attacked = getAttackedPieces(state, attackerColor)
  
  // 如果没有攻击任何非将帅棋子，不是长捉
  const nonKingAttacks = attacked.filter(p => p.type !== 'king')
  if (nonKingAttacks.length === 0) return false
  
  // 简化判断：只要有非将帅棋子被持续攻击就可能是长捉
  // 更精确的判断需要对比历史状态，但为了简化，我们主要通过局面重复次数来判断
  return true
}

export function getPieceAt(state: GameState, pos: Position): Piece | undefined {
  return state.pieces.find(p => p.position.row === pos.row && p.position.col === pos.col)
}

export function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < 10 && pos.col >= 0 && pos.col < 9
}

export function getLegalMoves(state: GameState, piece: Piece): Position[] {
  const moves: Position[] = []
  
  if (!piece.isRevealed) {
    // 揭棋规则：暗子的移动规则基于该位置在开局布局中对应的原始棋子类型
    const moveType = getOriginalPieceTypeAtPosition(piece.position.row, piece.position.col, piece.color)
    
    switch (moveType) {
      case 'chariot':
        moves.push(...chariotMoves(piece.position, state))
        break
      case 'horse':
        moves.push(...horseMoves(piece.position, state))
        break
      case 'cannon':
        moves.push(...cannonMoves(piece.position, state))
        break
      case 'soldier':
        moves.push(...soldierMoves(piece.position, piece.color))
        break
      case 'guard':
        moves.push(...guardMoves(piece.position, piece.color))
        break
      case 'elephant':
        moves.push(...elephantMoves(piece.position, piece.color, state))
        break
      case 'king':
        moves.push(...kingMoves(piece.position, piece.color, state))
        break
      default:
        // 默认按兵的方式走
        moves.push(...soldierMoves(piece.position, piece.color))
        break
    }
    
    return filterValidMoves(state, piece, moves)
  }
  
  const { type, position } = piece
  
  switch (type) {
    case 'king':
      moves.push(...kingMoves(position, piece.color, state))
      break
    case 'guard':
      moves.push(...guardMovesRevealed(position))
      break
    case 'elephant':
      moves.push(...elephantMovesRevealed(position, state))
      break
    case 'horse':
      moves.push(...horseMoves(position, state))
      break
    case 'chariot':
      moves.push(...chariotMoves(position, state))
      break
    case 'cannon':
      moves.push(...cannonMoves(position, state))
      break
    case 'soldier':
      moves.push(...soldierMoves(position, piece.color))
      break
  }
  
  return filterValidMoves(state, piece, moves)
}

function filterValidMoves(state: GameState, piece: Piece, moves: Position[]): Position[] {
  // 基础过滤：有效位置和不被己方棋子阻挡
  let validMoves = moves.filter(pos => {
    if (!isValidPosition(pos)) return false
    const targetPiece = getPieceAt(state, pos)
    return !targetPiece || targetPiece.color !== piece.color
  })
  
  // 关键检查：过滤掉那些走了之后会导致己方将帅被将军的走法
  // 这包括：
  // 1. 被对方棋子将军（车、马、炮、兵等）
  // 2. 与对方将帅面对面（中间没有棋子阻隔）
  validMoves = validMoves.filter(pos => {
    const newState = simulateMoveForCheck(state, piece, pos)
    // 检查移动后己方是否被将军
    return !isKingInCheck(newState, piece.color)
  })
  
  return validMoves
}

function wouldKingFaceKing(state: GameState, newPos: Position, color: PieceColor): boolean {
  const opponentColor = color === 'red' ? 'black' : 'red'
  const opponentKing = state.pieces.find(p => p.type === 'king' && p.color === opponentColor)
  
  if (!opponentKing) return false
  
  if (newPos.col !== opponentKing.position.col) return false
  
  const minRow = Math.min(newPos.row, opponentKing.position.row)
  const maxRow = Math.max(newPos.row, opponentKing.position.row)
  
  for (let row = minRow + 1; row < maxRow; row++) {
    if (getPieceAt(state, { row, col: newPos.col })) {
      return false
    }
  }
  
  return true
}

function wouldKingBeAttackedByCannon(state: GameState, newPos: Position, color: PieceColor): boolean {
  const opponentColor = color === 'red' ? 'black' : 'red'
  const opponentCannons = state.pieces.filter(p => p.type === 'cannon' && p.color === opponentColor && p.isRevealed)
  
  for (const cannon of opponentCannons) {
    if (cannon.position.row === newPos.row) {
      const minCol = Math.min(newPos.col, cannon.position.col)
      const maxCol = Math.max(newPos.col, cannon.position.col)
      let pieceCount = 0
      
      for (let col = minCol + 1; col < maxCol; col++) {
        if (getPieceAt(state, { row: newPos.row, col })) {
          pieceCount++
        }
      }
      
      if (pieceCount === 1) {
        return true
      }
    }
    
    if (cannon.position.col === newPos.col) {
      const minRow = Math.min(newPos.row, cannon.position.row)
      const maxRow = Math.max(newPos.row, cannon.position.row)
      let pieceCount = 0
      
      for (let row = minRow + 1; row < maxRow; row++) {
        if (getPieceAt(state, { row, col: newPos.col })) {
          pieceCount++
        }
      }
      
      if (pieceCount === 1) {
        return true
      }
    }
  }
  
  return false
}

function kingMoves(pos: Position, color: PieceColor, state: GameState): Position[] {
  const moves: Position[] = []
  const deltas = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  
  const rowMin = color === 'red' ? 7 : 0
  const rowMax = color === 'red' ? 9 : 2
  
  for (const [dr, dc] of deltas) {
    const newRow = pos.row + dr
    const newCol = pos.col + dc
    if (newRow >= rowMin && newRow <= rowMax && newCol >= 3 && newCol <= 5) {
      if (!wouldKingFaceKing(state, { row: newRow, col: newCol }, color) &&
          !wouldKingBeAttackedByCannon(state, { row: newRow, col: newCol }, color)) {
        moves.push({ row: newRow, col: newCol })
      }
    }
  }
  return moves
}

function guardMoves(pos: Position, color: PieceColor): Position[] {
  const moves: Position[] = []
  const deltas = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  
  const rowMin = color === 'red' ? 7 : 0
  const rowMax = color === 'red' ? 9 : 2
  
  for (const [dr, dc] of deltas) {
    const newRow = pos.row + dr
    const newCol = pos.col + dc
    if (newRow >= rowMin && newRow <= rowMax && newCol >= 3 && newCol <= 5) {
      moves.push({ row: newRow, col: newCol })
    }
  }
  return moves
}

function guardMovesRevealed(pos: Position): Position[] {
  const moves: Position[] = []
  const deltas = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
  
  for (const [dr, dc] of deltas) {
    const newRow = pos.row + dr
    const newCol = pos.col + dc
    if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
      moves.push({ row: newRow, col: newCol })
    }
  }
  return moves
}

function elephantMoves(pos: Position, color: PieceColor, state: GameState): Position[] {
  const moves: Position[] = []
  const deltas = [[-2, -2], [-2, 2], [2, -2], [2, 2]]
  const maxRow = color === 'red' ? 9 : 4
  const minRow = color === 'red' ? 5 : 0
  
  for (const [dr, dc] of deltas) {
    const midRow = pos.row + dr / 2
    const midCol = pos.col + dc / 2
    const newRow = pos.row + dr
    const newCol = pos.col + dc
    
    if (newRow > maxRow || newRow < minRow) {
      continue
    }
    
    if (getPieceAt(state, { row: midRow, col: midCol })) {
      continue
    }
    
    if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
      moves.push({ row: newRow, col: newCol })
    }
  }
  return moves
}

function elephantMovesRevealed(pos: Position, state: GameState): Position[] {
  const moves: Position[] = []
  const deltas = [[-2, -2], [-2, 2], [2, -2], [2, 2]]
  
  for (const [dr, dc] of deltas) {
    const midRow = pos.row + dr / 2
    const midCol = pos.col + dc / 2
    const newRow = pos.row + dr
    const newCol = pos.col + dc
    
    if (getPieceAt(state, { row: midRow, col: midCol })) {
      continue
    }
    
    if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
      moves.push({ row: newRow, col: newCol })
    }
  }
  return moves
}

function horseMoves(pos: Position, state: GameState): Position[] {
  const moves: Position[] = []
  const deltas = [
    [-2, -1], [-2, 1], [-1, -2], [-1, 2],
    [1, -2], [1, 2], [2, -1], [2, 1]
  ]
  
  const blockers = [
    [[-1, 0]], [[-1, 0]], [[0, -1]], [[0, 1]],
    [[0, -1]], [[0, 1]], [[1, 0]], [[1, 0]]
  ]
  
  for (let i = 0; i < deltas.length; i++) {
    const [dr, dc] = deltas[i]
    const blockerPositions = blockers[i]
    
    let blocked = false
    for (const [bdr, bdc] of blockerPositions) {
      const blockerPos = { row: pos.row + bdr, col: pos.col + bdc }
      if (getPieceAt(state, blockerPos)) {
        blocked = true
        break
      }
    }
    
    if (!blocked) {
      const newRow = pos.row + dr
      const newCol = pos.col + dc
      if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
        moves.push({ row: newRow, col: newCol })
      }
    }
  }
  return moves
}

function chariotMoves(pos: Position, state: GameState): Position[] {
  const moves: Position[] = []
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  
  for (const [dr, dc] of directions) {
    let newRow = pos.row + dr
    let newCol = pos.col + dc
    
    while (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
      const piece = getPieceAt(state, { row: newRow, col: newCol })
      if (piece) {
        moves.push({ row: newRow, col: newCol })
        break
      }
      moves.push({ row: newRow, col: newCol })
      newRow += dr
      newCol += dc
    }
  }
  return moves
}

function cannonMoves(pos: Position, state: GameState): Position[] {
  const moves: Position[] = []
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]]
  
  for (const [dr, dc] of directions) {
    let newRow = pos.row + dr
    let newCol = pos.col + dc
    let jumped = false
    
    while (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
      const piece = getPieceAt(state, { row: newRow, col: newCol })
      
      if (piece) {
        if (!jumped) {
          jumped = true
        } else {
          moves.push({ row: newRow, col: newCol })
          break
        }
      } else {
        if (!jumped) {
          moves.push({ row: newRow, col: newCol })
        }
      }
      
      newRow += dr
      newCol += dc
    }
  }
  return moves
}

function soldierMoves(pos: Position, color: PieceColor): Position[] {
  const moves: Position[] = []
  const direction = color === 'red' ? -1 : 1
  
  moves.push({ row: pos.row + direction, col: pos.col })
  
  if ((color === 'red' && pos.row <= 4) || (color === 'black' && pos.row >= 5)) {
    moves.push({ row: pos.row, col: pos.col - 1 })
    moves.push({ row: pos.row, col: pos.col + 1 })
  }
  
  return moves.filter(p => p.row >= 0 && p.row < 10 && p.col >= 0 && p.col < 9)
}

export function isKingInCheck(state: GameState, kingColor: PieceColor): boolean {
  const king = state.pieces.find(p => p.type === 'king' && p.color === kingColor)
  if (!king) return false
  
  // 检查将帅面对面的情况
  if (wouldKingFaceKing(state, king.position, kingColor)) {
    return true
  }
  
  const opponentColor = kingColor === 'red' ? 'black' : 'red'
  const opponentPieces = state.pieces.filter(p => p.color === opponentColor)
  
  for (const piece of opponentPieces) {
    const attacks = getLegalMovesForCheck(state, piece)
    if (attacks.some(pos => pos.row === king.position.row && pos.col === king.position.col)) {
      return true
    }
  }
  
  return false
}

function getLegalMovesForCheck(state: GameState, piece: Piece): Position[] {
  const moves: Position[] = []
  
  if (!piece.isRevealed) {
    // 揭棋规则：暗子的移动规则基于该位置在开局布局中对应的原始棋子类型
    const moveType = getOriginalPieceTypeAtPosition(piece.position.row, piece.position.col, piece.color)
    
    switch (moveType) {
      case 'chariot':
        moves.push(...chariotMoves(piece.position, state))
        break
      case 'horse':
        moves.push(...horseMoves(piece.position, state))
        break
      case 'cannon':
        moves.push(...cannonMoves(piece.position, state))
        break
      case 'soldier':
        moves.push(...soldierMoves(piece.position, piece.color))
        break
      case 'guard':
        moves.push(...guardMoves(piece.position, piece.color))
        break
      case 'elephant':
        moves.push(...elephantMoves(piece.position, piece.color, state))
        break
      default:
        moves.push(...soldierMoves(piece.position, piece.color))
        break
    }
  } else {
    const { type, position } = piece
    
    switch (type) {
      case 'king':
        moves.push(...kingMoves(position, piece.color, state))
        break
      case 'guard':
        moves.push(...guardMovesRevealed(position))
        break
      case 'elephant':
        moves.push(...elephantMovesRevealed(position, state))
        break
      case 'horse':
        moves.push(...horseMoves(position, state))
        break
      case 'chariot':
        moves.push(...chariotMoves(position, state))
        break
      case 'cannon':
        moves.push(...cannonMoves(position, state))
        break
      case 'soldier':
        moves.push(...soldierMoves(position, piece.color))
        break
    }
  }
  
  return moves.filter(pos => {
    if (!isValidPosition(pos)) return false
    const targetPiece = getPieceAt(state, pos)
    return !targetPiece || targetPiece.color !== piece.color
  })
}

export function canPlayerEscapeCheck(state: GameState, playerColor: PieceColor): boolean {
  const playerPieces = state.pieces.filter(p => p.color === playerColor)
  
  for (const piece of playerPieces) {
    const moves = getLegalMoves(state, piece)
    
    for (const move of moves) {
      const newState = simulateMoveForCheck(state, piece, move)
      if (!isKingInCheck(newState, playerColor)) {
        return true
      }
    }
  }
  
  return false
}

export function canPlayerMove(state: GameState, playerColor: PieceColor): boolean {
  const playerPieces = state.pieces.filter(p => p.color === playerColor)
  
  for (const piece of playerPieces) {
    const moves = getLegalMoves(state, piece)
    if (moves.length > 0) {
      return true
    }
  }
  
  return false
}

function simulateMoveForCheck(state: GameState, piece: Piece, to: Position): GameState {
  const newPieces = state.pieces.map(p => ({ ...p }))
  const pieceIndex = newPieces.findIndex(p => p.id === piece.id)
  
  if (pieceIndex === -1) return state
  
  const newPiece = newPieces[pieceIndex]
  
  if (!newPiece.isRevealed && newPiece.hiddenType) {
    newPiece.type = newPiece.hiddenType
    newPiece.isRevealed = true
  }
  
  newPiece.position = { ...to }
  
  const targetPiece = getPieceAt(state, to)
  if (targetPiece) {
    const idx = newPieces.findIndex(p => p.id === targetPiece.id)
    if (idx !== -1) {
      newPieces.splice(idx, 1)
    }
  }
  
  return {
    ...state,
    pieces: newPieces,
    isInCheck: false
  }
}

export function makeMove(state: GameState, move: Move): GameState {
  const newPieces = state.pieces.map(p => ({ ...p }))
  const pieceIndex = newPieces.findIndex(p => p.id === move.pieceId)
  
  if (pieceIndex === -1) return state
  
  const piece = newPieces[pieceIndex]
  const targetPiece = getPieceAt(state, move.to)
  
  if (!piece.isRevealed && piece.hiddenType) {
    piece.type = piece.hiddenType
    piece.isRevealed = true
  }
  
  piece.position = { ...move.to }
  
  let newRemainingPieces = new Map(state.remainingPieces)
  let newCapturedPieces = {
    red: [...state.capturedPieces.red],
    black: [...state.capturedPieces.black]
  }
  
  if (targetPiece) {
    const idx = newPieces.findIndex(p => p.id === targetPiece.id)
    if (idx !== -1) {
      newPieces.splice(idx, 1)
    }
    
    const capturedPiece = { ...targetPiece }
    newCapturedPieces[piece.color].push(capturedPiece)
    
    if (targetPiece.isRevealed) {
      const colorMap = new Map(newRemainingPieces.get(targetPiece.color)!)
      colorMap.set(targetPiece.type, (colorMap.get(targetPiece.type) || 0) - 1)
      newRemainingPieces.set(targetPiece.color, colorMap)
    }
  }
  
  const newHistory = [...state.history, move]
  
  const nextPlayer = state.currentPlayer === 'red' ? 'black' : 'red'
  
  const tempState = { ...state, pieces: newPieces, isInCheck: false }
  const inCheck = isKingInCheck(tempState, nextPlayer)
  
  let status: 'playing' | 'red_win' | 'black_win' | 'draw' | 'red_chase_lose' | 'black_chase_lose' = 'playing'
  
  if (targetPiece && targetPiece.type === 'king') {
    status = state.currentPlayer === 'red' ? 'red_win' : 'black_win'
  } else if (inCheck) {
    if (!canPlayerEscapeCheck(tempState, nextPlayer)) {
      status = nextPlayer === 'red' ? 'black_win' : 'red_win'
    }
  } else if (!canPlayerMove(tempState, nextPlayer)) {
    status = nextPlayer === 'red' ? 'black_win' : 'red_win'
  }
  
  // 只有在游戏还在进行中时才检测长捉
  if (status === 'playing') {
    // 生成新状态的位置Key
    const stateForPositionKey = {
      ...tempState,
      currentPlayer: nextPlayer
    }
    const positionKey = generatePositionKey(stateForPositionKey)
    
    // 检测长捉
    const chaseResult = detectChase(state, positionKey)
    
    if (chaseResult.isChase && chaseResult.losingColor) {
      status = chaseResult.losingColor === 'red' ? 'red_chase_lose' : 'black_chase_lose'
    }
    
    // 更新位置历史
    const newPositionHistory = [...state.positionHistory, positionKey].slice(-16)
    
    return {
      ...state,
      pieces: newPieces,
      currentPlayer: nextPlayer,
      history: newHistory,
      status,
      selectedPieceId: null,
      remainingPieces: newRemainingPieces,
      capturedPieces: newCapturedPieces,
      isInCheck: inCheck,
      positionHistory: newPositionHistory,
      repeatCount: chaseResult.isChase ? state.repeatCount + 1 : 0
    }
  }
  
  return {
    ...state,
    pieces: newPieces,
    currentPlayer: nextPlayer,
    history: newHistory,
    status,
    selectedPieceId: null,
    remainingPieces: newRemainingPieces,
    capturedPieces: newCapturedPieces,
    isInCheck: inCheck,
    positionHistory: state.positionHistory,
    repeatCount: 0
  }
}

export function isGameOver(state: GameState): boolean {
  return state.status !== 'playing'
}

export function getWinner(state: GameState): PieceColor | null {
  if (state.status === 'red_win' || state.status === 'black_chase_lose') return 'red'
  if (state.status === 'black_win' || state.status === 'red_chase_lose') return 'black'
  return null
}

// ============================================================
// 揭棋FEN格式支持
// ============================================================

// 棋子类型到符号的映射
const PIECE_SYMBOLS: Record<PieceType, string> = {
  king: 'K',
  guard: 'G',
  elephant: 'E',
  horse: 'H',
  chariot: 'C',
  cannon: 'N',
  soldier: 'S'
}

const SYMBOL_TO_PIECE: Record<string, PieceType> = {
  'K': 'king',
  'G': 'guard',
  'E': 'elephant',
  'H': 'horse',
  'C': 'chariot',
  'N': 'cannon',
  'S': 'soldier',
  'k': 'king',
  'g': 'guard',
  'e': 'elephant',
  'h': 'horse',
  'c': 'chariot',
  'n': 'cannon',
  's': 'soldier'
}

/**
 * 将游戏状态转换为FEN字符串
 * 格式: <board>_<currentPlayer>_<remainingPieces>_<capturedPieces>
 * 棋盘: 10行，每行9个字符，用/分隔
 *       大写=红方明子，小写=黑方明子，?=暗子
 */
export function stateToFEN(state: GameState): string {
  // 1. 棋盘布局
  let board = ''
  for (let row = 0; row < 10; row++) {
    if (row > 0) board += '/'
    for (let col = 0; col < 9; col++) {
      const piece = getPieceAt(state, { row, col })
      if (!piece) {
        board += '.'
      } else if (piece.isRevealed) {
        const symbol = PIECE_SYMBOLS[piece.type]
        board += piece.color === 'red' ? symbol : symbol.toLowerCase()
      } else {
        board += '?'
      }
    }
  }
  
  // 2. 当前玩家
  const currentPlayer = state.currentPlayer === 'red' ? 'R' : 'B'
  
  // 3. 剩余未翻开棋子池
  let remaining = ''
  for (const color of ['red', 'black'] as PieceColor[]) {
    if (color === 'black') remaining += '|'
    const map = state.remainingPieces.get(color)
    if (map) {
      for (const [type, count] of map) {
        if (count > 0) {
          const symbol = PIECE_SYMBOLS[type]
          remaining += (color === 'black' ? symbol.toLowerCase() : symbol).repeat(count)
        }
      }
    }
  }
  
  // 4. 被吃掉的棋子
  let captured = ''
  for (const color of ['red', 'black'] as PieceColor[]) {
    if (color === 'black') captured += '|'
    for (const piece of state.capturedPieces[color]) {
      const symbol = PIECE_SYMBOLS[piece.type]
      captured += color === 'black' ? symbol.toLowerCase() : symbol
    }
  }
  
  // 5. 暗子的真实类型映射（用于准确还原）
  let darkTypes = ''
  const darkPieces = state.pieces.filter(p => !p.isRevealed && p.hiddenType)
  if (darkPieces.length > 0) {
    for (let i = 0; i < darkPieces.length; i++) {
      if (i > 0) darkTypes += ','
      const piece = darkPieces[i]
      const symbol = PIECE_SYMBOLS[piece.hiddenType!]
      darkTypes += `${piece.position.row},${piece.position.col},${piece.color === 'red' ? symbol : symbol.toLowerCase()}`
    }
  }
  
  return `${board}_${currentPlayer}_${remaining}_${captured}_${darkTypes}`
}

/**
 * 从FEN字符串解析游戏状态
 */
export function FENToState(fen: string): GameState | null {
  const parts = fen.split('_')
  if (parts.length < 4) return null
  
  const [boardStr, playerStr, remainingStr, capturedStr, darkTypesStr] = parts
  
  // 解析棋盘
  const pieces: Piece[] = []
  const rows = boardStr.split('/')
  if (rows.length !== 10) return null
  
  // 解析暗子类型映射
  const darkTypeMap = new Map<string, { type: PieceType; color: PieceColor }>()
  if (darkTypesStr && darkTypesStr.length > 0) {
    const darkEntries = darkTypesStr.split(',')
    for (let i = 0; i < darkEntries.length; i += 3) {
      const row = parseInt(darkEntries[i])
      const col = parseInt(darkEntries[i + 1])
      const symbol = darkEntries[i + 2]
      const type = SYMBOL_TO_PIECE[symbol.toUpperCase()]
      const color = symbol === symbol.toUpperCase() ? 'red' : 'black'
      if (type) {
        darkTypeMap.set(`${row},${col}`, { type, color })
      }
    }
  }
  
  let pieceIndex = 0
  
  for (let row = 0; row < 10; row++) {
    const rowStr = rows[row]
    if (rowStr.length !== 9) return null
    
    for (let col = 0; col < 9; col++) {
      const char = rowStr[col]
      if (char === '.') continue
      
      const isDark = char === '?'
      // 根据 FEN 或位置判断颜色
      const isRed = isDark ? (() => {
        const key = `${row},${col}`
        return darkTypeMap.has(key) && darkTypeMap.get(key)!.color === 'red'
      })() : char === char.toUpperCase()
      const color = isRed ? 'red' : 'black'
      
      // 暗子的真实类型（从 FEN 的 darkTypesStr 获取）
      const hiddenType = isDark ? (() => {
        const key = `${row},${col}`
        return darkTypeMap.has(key) ? darkTypeMap.get(key)!.type : 'soldier'
      })() : undefined
      
      // 揭棋规则：暗子的 type 基于该位置在开局布局中的原始类型
      const type = isDark 
        ? getOriginalPieceTypeAtPosition(row, col, color)  // 位置决定移动规则
        : SYMBOL_TO_PIECE[char.toUpperCase()]
      
      if (!type) return null
      
      const piece: Piece = {
        id: `piece-${row}-${col}-${pieceIndex++}`,
        type,
        color,
        isRevealed: !isDark,
        position: { row, col }
      }
      
      if (isDark && hiddenType) {
        piece.hiddenType = hiddenType
      }
      
      pieces.push(piece)
    }
  }
  
  // 解析当前玩家
  const currentPlayer = playerStr === 'R' ? 'red' : 'black'
  
  // 解析剩余棋子池
  const remainingPieces = new Map<PieceColor, Map<PieceType, number>>()
  for (const color of ['red', 'black'] as PieceColor[]) {
    const colorStr = remainingStr.split('|')[color === 'red' ? 0 : 1] || ''
    const map = new Map<PieceType, number>()
    // 初始化所有类型为0
    for (const type of ['king', 'guard', 'elephant', 'horse', 'chariot', 'cannon', 'soldier'] as PieceType[]) {
      map.set(type, 0)
    }
    for (const char of colorStr) {
      const type = SYMBOL_TO_PIECE[char.toUpperCase()]
      if (type) {
        map.set(type, (map.get(type) || 0) + 1)
      }
    }
    remainingPieces.set(color, map)
  }
  
  // 解析被吃掉的棋子
  const capturedPieces = { red: [] as Piece[], black: [] as Piece[] }
  for (const color of ['red', 'black'] as PieceColor[]) {
    const colorStr = capturedStr.split('|')[color === 'red' ? 0 : 1] || ''
    for (const char of colorStr) {
      const type = SYMBOL_TO_PIECE[char.toUpperCase()]
      if (type) {
        capturedPieces[color].push({
          id: `captured-${color}-${type}-${capturedPieces[color].length}`,
          type,
          color,
          isRevealed: true,
          position: { row: -1, col: -1 }
        })
      }
    }
  }
  
  return {
    pieces,
    currentPlayer,
    history: [],
    status: 'playing',
    selectedPieceId: null,
    darkPieceProbabilities: [],
    remainingPieces,
    capturedPieces,
    isInCheck: false,
    positionHistory: [],
    repeatCount: 0
  }
}
