import type { GameState, Move, PieceColor, PieceType, Piece, Position } from '../renderer/types'
import { getLegalMoves, makeMove, isGameOver, getPieceAt } from './board-state'
import { 
  evaluate, 
  getPieceValue, 
  POSITION_SCORES,
  getThreatPositions,
  isPieceThreatened,
  isPositionRooted,
  calculateFlipWeight,
  calculateValueAdvantage
} from './evaluation'
import { generateHypotheticalState } from './probability'

// 简化的位置Key生成函数（与board-state.ts中的逻辑一致）
function generateSimplePositionKey(state: GameState): string {
  const pieces = state.pieces
    .filter(p => p.isRevealed || p.type === 'king')
    .map(p => `${p.id}-${p.position.row}-${p.position.col}-${p.type}-${p.color}-${p.isRevealed ? 1 : 0}`)
    .sort()
    .join('|')
  
  return `${state.currentPlayer}-${pieces}`
}

interface SearchResult {
  bestMove: Move | null
  score: number
  nodesSearched: number
  pvLine: string
}

let nodesSearched = 0
let abortSearch = false

export function resetSearch(): void {
  nodesSearched = 0
  abortSearch = false
}

export function abort(): void {
  abortSearch = true
}

// ============================================================
// 工具函数
// ============================================================

function mirrorPosition(row: number, col: number): Position {
  return { row: 9 - row, col }
}

function getPositionScoresForType(type: string): number[][] {
  return POSITION_SCORES[type as PieceType] || POSITION_SCORES.chariot
}

// ============================================================
// 模块4：高维启发式排序 (Heuristic Move Ordering)
// ============================================================

/**
 * MVV-LVA排序分数
 * Most Valuable Victim - Least Valuable Attacker
 * 被吃子价值 * 10 - 攻击子价值
 */
function calculateMVV_LVA(attackerType: PieceType, victimType: PieceType): number {
  const attackerValue = getPieceValue(attackerType)
  const victimValue = getPieceValue(victimType)
  return victimValue * 10 - attackerValue
}

/**
 * 检查移动后棋子是否会被威胁
 */
function willPieceBeThreatenedAfterMove(state: GameState, move: Move, enemyColor: PieceColor): boolean {
  const childState = makeMove(state, move)
  const movedPiece = childState.pieces.find(p => p.id === move.pieceId)
  
  if (!movedPiece) return false
  
  return isPieceThreatened(childState, movedPiece, enemyColor)
}

/**
 * 检查移动后位置是否有根（有我方棋子保护）
 */
function willPositionBeRootedAfterMove(state: GameState, move: Move, ourColor: PieceColor): boolean {
  const childState = makeMove(state, move)
  return isPositionRooted(childState, move.to, ourColor)
}

/**
 * 检查除将帅外我方是否都是暗子
 */
function areAllNonKingsDark(state: GameState, ourColor: PieceColor): boolean {
  const ourPieces = state.pieces.filter(p => p.color === ourColor && p.type !== 'king')
  return ourPieces.every(p => !p.isRevealed)
}

/**
 * 检查是否处于残局
 */
function isEndgame(state: GameState): boolean {
  return state.pieces.length <= 16
}

/**
 * 检查是否是等价互换（车换车、马换马等）
 */
function isEquivalentExchange(attackerType: PieceType, victimType: PieceType): boolean {
  return attackerType === victimType && attackerType !== 'soldier'
}

/**
 * 生成所有合法移动
 */
function getAllMoves(state: GameState): Move[] {
  const moves: Move[] = []
  const currentColor = state.currentPlayer
  
  for (const piece of state.pieces) {
    if (piece.color !== currentColor) continue
    
    const legalMoves = getLegalMoves(state, piece)
    for (const targetPos of legalMoves) {
      const targetPiece = getPieceAt(state, targetPos)
      moves.push({
        pieceId: piece.id,
        from: { ...piece.position },
        to: targetPos,
        capturedPieceId: targetPiece?.id,
        isReveal: !piece.isRevealed,
        isCheck: false
      })
    }
  }
  
  // 使用高维启发式排序
  return sortMovesAdvanced(state, moves)
}

/**
 * 高维启发式移动排序
 * 
 * 排序优先级：
 * 1. 吃子（MVV-LVA排序）
 * 2. 翻安全子（处于我方绝对保护下的暗子）
 * 3. 普通移动
 */
function sortMovesAdvanced(state: GameState, moves: Move[]): Move[] {
  const currentColor = state.currentPlayer
  const enemyColor = currentColor === 'red' ? 'black' : 'red'
  
  // 计算各种状态标志
  const allNonKingsDark = areAllNonKingsDark(state, currentColor)
  const flipWeight = calculateFlipWeight(state, currentColor)
  const advantage = calculateValueAdvantage(state, currentColor)
  const endgame = isEndgame(state)
  
  // 分类移动
  const captureMoves: { move: Move; score: number }[] = []
  const flipMoves: { move: Move; score: number }[] = []
  const normalMoves: { move: Move; score: number }[] = []
  
  for (const move of moves) {
    const piece = state.pieces.find(p => p.id === move.pieceId)
    if (!piece) continue
    
    // 模拟这个移动，查看是否会导致重复局面
    let repeatPenalty = 0
    try {
      const tempState = makeMove(state, move)
      const tempPositionKey = generateSimplePositionKey(tempState)
      
      // 检查这个局面在历史中是否出现过
      const repeatCount = state.positionHistory.filter(key => key === tempPositionKey).length
      
      // 重复次数越多，惩罚越大
      if (repeatCount >= 1) {
        repeatPenalty = -500 * repeatCount // 每次重复扣500分
      }
      
      // 检查是否接近形成长捉模式
      if (state.positionHistory.length >= 4) {
        // 检查最近4步的模式
        const recentHistory = state.positionHistory.slice(-4)
        // 如果新的局面与之前某一步相似，加大惩罚
        for (let i = 0; i < recentHistory.length; i++) {
          if (recentHistory[i] === tempPositionKey) {
            repeatPenalty -= 300
          }
        }
      }
    } catch (e) {
      // 模拟失败，忽略惩罚
    }
    
    // 1. 吃子移动
    if (move.capturedPieceId) {
      const capturedPiece = state.pieces.find(p => p.id === move.capturedPieceId)
      if (capturedPiece) {
        // MVV-LVA分数
        let score = calculateMVV_LVA(piece.type, capturedPiece.type)
        
        // 等价互换奖励（优势时鼓励兑子）
        if (isEquivalentExchange(piece.type, capturedPiece.type) && advantage > 400) {
          score += 500
        }
        
        // 检查移动后是否会被反吃
        const willBeThreatened = willPieceBeThreatenedAfterMove(state, move, enemyColor)
        if (willBeThreatened) {
          // 如果有根保护，惩罚较小
          const willBeRooted = willPositionBeRootedAfterMove(state, move, currentColor)
          if (willBeRooted) {
            score -= 50 // 有根保护，只扣50分
          } else {
            // 无根保护，按棋子价值扣分
            score -= getPieceValue(piece.type) * 0.5
          }
        }
        
        // 应用重复局面惩罚
        score += repeatPenalty
        
        captureMoves.push({ move, score })
        continue
      }
    }
    
    // 2. 翻开暗子
    if (move.isReveal) {
      let score = 0
      
      // 基础翻子分数（受翻子权重影响）
      score += 1000 * flipWeight
      
      // 全是暗子时，大幅提升优先级
      if (allNonKingsDark) {
        score += 1500
      }
      
      // 安全翻子评估
      const willBeRooted = willPositionBeRootedAfterMove(state, move, currentColor)
      const willBeThreatened = willPieceBeThreatenedAfterMove(state, move, enemyColor)
      
      // 暗子当前是否被威胁
      const currentlyThreatened = isPieceThreatened(state, piece, enemyColor)
      
      // 逃离威胁奖励（暗子被攻击时，优先选择躲避）
      if (currentlyThreatened && !willBeThreatened) {
        score += getPieceValue(piece.type) * 1.5
      }
      
      if (willBeRooted && !willBeThreatened) {
        // 处于我方绝对保护下，大幅加分
        score += 500
      } else if (willBeThreatened) {
        // 翻出来会被威胁，扣分
        score -= 300
      }
      
      // 位置价值
      const scores = getPositionScoresForType(piece.type)
      const pos = piece.color === 'black' 
        ? mirrorPosition(move.to.row, move.to.col)
        : move.to
      score += (scores[pos.row]?.[pos.col] || 0) * 2
      
      // 应用重复局面惩罚
      score += repeatPenalty
      
      flipMoves.push({ move, score })
      continue
    }
    
    // 3. 普通移动
    let score = 0
    
    // 逃离威胁奖励
    const currentlyThreatened = isPieceThreatened(state, piece, enemyColor)
    const willBeThreatened = willPieceBeThreatenedAfterMove(state, move, enemyColor)
    
    if (currentlyThreatened && !willBeThreatened) {
      score += getPieceValue(piece.type) * 0.8
    }
    
    // 移动后被威胁惩罚（考虑有根保护）
    if (!currentlyThreatened && willBeThreatened) {
      const willBeRooted = willPositionBeRootedAfterMove(state, move, currentColor)
      if (!willBeRooted) {
        score -= getPieceValue(piece.type) * 0.4
      }
    }
    
    // 将帅移动（残局时鼓励参与进攻）
    if (piece.type === 'king') {
      if (endgame) {
        // 残局时，将帅控制中路给予奖励
        const centerCols = [3, 4, 5]
        if (centerCols.includes(move.to.col)) {
          score += 100
        }
      } else {
        // 非残局时，将帅移动优先级较低
        score -= 200
      }
    }
    
    // 位置价值
    const scores = getPositionScoresForType(piece.type)
    const pos = piece.color === 'black' 
      ? mirrorPosition(move.to.row, move.to.col)
      : move.to
    score += (scores[pos.row]?.[pos.col] || 0) * 0.3
    
    // 应用重复局面惩罚
    score += repeatPenalty
    
    normalMoves.push({ move, score })
  }
  
  // 按分数降序排序各类移动
  captureMoves.sort((a, b) => b.score - a.score)
  flipMoves.sort((a, b) => b.score - a.score)
  normalMoves.sort((a, b) => b.score - a.score)
  
  // 合并：吃子 -> 翻子 -> 普通移动
  return [
    ...captureMoves.map(item => item.move),
    ...flipMoves.map(item => item.move),
    ...normalMoves.map(item => item.move)
  ]
}

// ============================================================
// Alpha-Beta搜索（带PV跟踪）
// ============================================================

interface SearchResultWithPV {
  score: number
  pv: Move[]
}

function alphaBetaWithPV(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean
): SearchResultWithPV {
  if (abortSearch) {
    return { 
      score: maximizingPlayer ? -Infinity : Infinity, 
      pv: [] 
    }
  }
  
  nodesSearched++
  
  // 限制搜索节点数量
  if (nodesSearched > 50000) {
    abortSearch = true
    return { 
      score: evaluate(state), 
      pv: [] 
    }
  }
  
  if (depth === 0 || isGameOver(state)) {
    return { 
      score: evaluate(state), 
      pv: [] 
    }
  }
  
  const moves = getAllMoves(state)
  
  if (moves.length === 0) {
    return { 
      score: evaluate(state), 
      pv: [] 
    }
  }
  
  // 只评估最重要的移动
  const maxMovesToCheck = 15
  const movesToCheck = moves.slice(0, maxMovesToCheck)
  
  if (maximizingPlayer) {
    let maxEval = -Infinity
    let bestPV: Move[] = []
    
    for (const move of movesToCheck) {
      if (abortSearch) break
      
      const childState = makeMove(state, move)
      const result = alphaBetaWithPV(childState, depth - 1, alpha, beta, false)
      
      if (result.score > maxEval) {
        maxEval = result.score
        bestPV = [move, ...result.pv]
      }
      
      alpha = Math.max(alpha, result.score)
      if (beta <= alpha) {
        break
      }
    }
    
    return { score: maxEval, pv: bestPV }
  } else {
    let minEval = Infinity
    let bestPV: Move[] = []
    
    for (const move of movesToCheck) {
      if (abortSearch) break
      
      const childState = makeMove(state, move)
      const result = alphaBetaWithPV(childState, depth - 1, alpha, beta, true)
      
      if (result.score < minEval) {
        minEval = result.score
        bestPV = [move, ...result.pv]
      }
      
      beta = Math.min(beta, result.score)
      if (beta <= alpha) {
        break
      }
    }
    
    return { score: minEval, pv: bestPV }
  }
}

function probabilisticAlphaBeta(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: boolean,
  samples: number = 2
): number {
  if (abortSearch) return maximizingPlayer ? -Infinity : Infinity
  
  const darkPieces = state.pieces.filter(p => !p.isRevealed)
  
  if (darkPieces.length === 0 || samples <= 0 || depth <= 1) {
    const result = alphaBetaWithPV(state, depth, alpha, beta, maximizingPlayer)
    return result.score
  }
  
  let totalEval = 0
  const numSamples = Math.min(samples, 3)
  
  for (let i = 0; i < numSamples; i++) {
    if (abortSearch) break
    const hypotheticalState = generateHypotheticalState(state)
    const result = alphaBetaWithPV(hypotheticalState, depth, alpha, beta, maximizingPlayer)
    totalEval += result.score
  }
  
  return totalEval / numSamples
}

export function findBestMove(
  state: GameState,
  depth: number = 2,
  samples: number = 2
): SearchResult {
  resetSearch()
  
  const moves = getAllMoves(state)
  
  if (moves.length === 0) {
    return { bestMove: null, score: 0, nodesSearched: 0 }
  }
  
  let bestMove: Move | null = null
  let bestScore = state.currentPlayer === 'red' ? -Infinity : Infinity
  const maximizingPlayer = state.currentPlayer === 'red'
  const moveResults: { move: Move; score: number }[] = []
  
  for (const move of moves) {
    if (abortSearch) break
    
    const childState = makeMove(state, move)
    const score = probabilisticAlphaBeta(
      childState, 
      Math.max(1, depth - 1), 
      -Infinity, 
      Infinity, 
      !maximizingPlayer, 
      samples
    )
    
    moveResults.push({ move, score })
    
    if (maximizingPlayer) {
      if (score > bestScore) {
        bestScore = score
        bestMove = move
      }
    } else {
      if (score < bestScore) {
        bestScore = score
        bestMove = move
      }
    }
  }
  
  // 根据当前玩家选择排序方向：红方选高分，黑方选低分（因为评分是从红方视角）
  const sortedResults = [...moveResults].sort((a, b) => {
    if (maximizingPlayer) {
      return b.score - a.score // 红方：高分优先
    } else {
      return a.score - b.score // 黑方：低分优先（因为负分对黑方有利）
    }
  })
  
  // 输出到控制台
  // 获取 PV 路线
  const pvResult = alphaBetaWithPV(state, depth, -Infinity, Infinity, maximizingPlayer)
  const pvMoves = pvResult.pv
  
  console.log(`\n🤖 AI(${state.currentPlayer === 'red' ? '红方' : '黑方'}) 最有利的选择 (深度${depth}, ${moves.length}个选项):`)
  console.log('=' .repeat(80))
  
  // 红方中文数字列名（从己方视角右边是一），在屏幕上从左到右是九→一
  const redColNames = ['九', '八', '七', '六', '五', '四', '三', '二', '一']
  // 黑方阿拉伯数字列名（从红方视角从左到右是1、2、3、4、5、6、7、8、9）
  const blackColNames = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  // 红方行名（从己方视角下边是一，上边是十）
  const redRowNames = ['十', '九', '八', '七', '六', '五', '四', '三', '二', '一']
  
  // 输出 PV 路线
  if (pvMoves.length > 0) {
    console.log('📊 PV路线（预期最佳后续）:')
    let currentState = state
    let pvLine = '    '
    
    for (let i = 0; i < pvMoves.length; i++) {
      const pvMove = pvMoves[i]
      const piece = currentState.pieces.find(p => p.id === pvMove.pieceId)
      const isRed = piece?.color === 'red'
      const colNames = isRed ? redColNames : blackColNames
      
      const fromCol = colNames[pvMove.from.col]
      const fromRow = isRed ? redRowNames[pvMove.from.row] : (pvMove.from.row + 1)
      const toCol = colNames[pvMove.to.col]
      const toRow = isRed ? redRowNames[pvMove.to.row] : (pvMove.to.row + 1)
      
      const moveType = pvMove.isReveal ? '翻' : pvMove.capturedPieceId ? '吃' : ''
      pvLine += `${fromCol}${fromRow}→${toCol}${toRow}${moveType ? `(${moveType})` : ''}`
      
      if (i < pvMoves.length - 1) {
        pvLine += ' → '
      }
      
      currentState = makeMove(currentState, pvMove)
    }
    
    console.log(pvLine)
    console.log('')
  }
  
  // 输出候选移动列表
  sortedResults.slice(0, 5).forEach((result, index) => {
    const piece = state.pieces.find(p => p.id === result.move.pieceId)
    const isRed = piece?.color === 'red'
    
    // 根据棋子颜色选择对应的列坐标名
    const colNames = isRed ? redColNames : blackColNames
    const fromCol = colNames[result.move.from.col]
    const fromRow = isRed ? redRowNames[result.move.from.row] : (result.move.from.row + 1)
    const toCol = colNames[result.move.to.col]
    const toRow = isRed ? redRowNames[result.move.to.row] : (result.move.to.row + 1)
    
    const from = `${fromCol}${fromRow}`
    const to = `${toCol}${toRow}`
    
    const moveType = result.move.isReveal ? '🔓翻子' : 
                     result.move.capturedPieceId ? '⚔️吃子' : '🚶移动'
    const pieceName = piece ? `${piece.color === 'red' ? '红' : '黑'}${piece.type}` : '未知'
    const capturedPiece = result.move.capturedPieceId 
      ? state.pieces.find(p => p.id === result.move.capturedPieceId)
      : null
    const capturedInfo = capturedPiece 
      ? ` → 吃${capturedPiece.color === 'red' ? '红' : '黑'}${capturedPiece.type}` 
      : ''
    
    // 标记最终选择的选项
    const isSelected = bestMove && result.move.pieceId === bestMove.pieceId && 
                       result.move.to.row === bestMove.to.row && 
                       result.move.to.col === bestMove.to.col
    const marker = isSelected ? '✅ ' : `${index + 1}. `
    
    console.log(
      `${marker}[${pieceName}] ${from} → ${to} ${moveType}${capturedInfo} | 评分: ${result.score.toFixed(2)}`
    )
  })
  
  console.log('=' .repeat(80))
  console.log(`📈 AI 认为当前局面得分: ${(maximizingPlayer ? bestScore : -bestScore).toFixed(2)}`)
  console.log(`🔍 搜索节点数: ${nodesSearched}\n`)
  
  // 构建 PV 字符串
  let pvLine = ''
  if (pvMoves.length > 0) {
    let currentState = state
    for (let i = 0; i < pvMoves.length; i++) {
      const pvMove = pvMoves[i]
      const piece = currentState.pieces.find(p => p.id === pvMove.pieceId)
      const isRed = piece?.color === 'red'
      const colNames = isRed ? redColNames : blackColNames
      
      const fromCol = colNames[pvMove.from.col]
      const fromRow = isRed ? redRowNames[pvMove.from.row] : (pvMove.from.row + 1)
      const toCol = colNames[pvMove.to.col]
      const toRow = isRed ? redRowNames[pvMove.to.row] : (pvMove.to.row + 1)
      
      const moveType = pvMove.isReveal ? '(翻)' : pvMove.capturedPieceId ? '(吃)' : ''
      pvLine += `${fromCol}${fromRow}→${toCol}${toRow}${moveType}`
      
      if (i < pvMoves.length - 1) {
        pvLine += ' → '
      }
      
      currentState = makeMove(currentState, pvMove)
    }
  }
  
  return {
    bestMove,
    score: bestScore,
    nodesSearched,
    pvLine
  }
}

export function iterativeDeepeningSearch(
  state: GameState,
  maxDepth: number = 2,
  timeLimit: number = 5000
): SearchResult {
  resetSearch()
  
  const startTime = Date.now()
  let bestResult: SearchResult = { bestMove: null, score: 0, nodesSearched: 0 }
  
  for (let depth = 1; depth <= maxDepth; depth++) {
    if (Date.now() - startTime >= timeLimit) break
    if (abortSearch) break
    
    const result = findBestMove(state, depth, Math.max(1, 3 - depth))
    
    if (result.bestMove) {
      bestResult = result
    }
    
    if (Math.abs(result.score) > 9000) {
      break
    }
  }
  
  return bestResult
}
