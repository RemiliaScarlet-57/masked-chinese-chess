import type { GameState, Piece, PieceType, PieceColor, Position } from '../renderer/types'
import { getPieceAt, getLegalMoves } from './board-state'
import { calculateProbabilities, estimatePieceValue } from './probability'

// ============================================================
// 基础棋子价值（会被动态调整）
// ============================================================
const BASE_PIECE_VALUES: Record<PieceType, number> = {
  king: 10000,
  guard: 200,
  elephant: 200,
  horse: 450,
  chariot: 900,
  cannon: 450,
  soldier: 100
}

// ============================================================
// 位置分数表（中国象棋标准）
// ============================================================
const POSITION_SCORES: Record<PieceType, number[][]> = {
  king: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 10, 20, 10, 0, 0, 0],
    [0, 0, 0, 20, 30, 20, 0, 0, 0],
    [0, 0, 0, 10, 20, 10, 0, 0, 0]
  ],
  guard: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 10, 0, 10, 0, 0, 0],
    [0, 0, 0, 0, 15, 0, 0, 0, 0],
    [0, 0, 0, 5, 0, 5, 0, 0, 0]
  ],
  elephant: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 15, 0, 0, 0, 15, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 5, 0, 0, 10, 0, 0, 5, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  horse: [
    [0, 5, 10, 10, 10, 10, 10, 5, 0],
    [5, 10, 20, 20, 20, 20, 20, 10, 5],
    [10, 20, 30, 30, 30, 30, 30, 20, 10],
    [10, 20, 30, 40, 40, 40, 30, 20, 10],
    [10, 20, 30, 40, 50, 40, 30, 20, 10],
    [5, 10, 20, 30, 30, 30, 20, 10, 5],
    [0, 5, 10, 20, 20, 20, 10, 5, 0],
    [0, 0, 5, 10, 10, 10, 5, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  chariot: [
    [5, 5, 5, 5, 5, 5, 5, 5, 5],
    [10, 15, 15, 15, 20, 15, 15, 15, 10],
    [5, 10, 15, 15, 20, 15, 15, 10, 5],
    [5, 10, 15, 20, 25, 20, 15, 10, 5],
    [5, 10, 15, 20, 25, 20, 15, 10, 5],
    [5, 10, 15, 15, 20, 15, 15, 10, 5],
    [5, 10, 15, 15, 20, 15, 15, 10, 5],
    [5, 10, 15, 15, 20, 15, 15, 10, 5],
    [0, 5, 5, 5, 10, 5, 5, 5, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  cannon: [
    [0, 0, 5, 10, 15, 10, 5, 0, 0],
    [0, 5, 15, 20, 25, 20, 15, 5, 0],
    [5, 10, 20, 25, 30, 25, 20, 10, 5],
    [5, 15, 25, 30, 35, 30, 25, 15, 5],
    [5, 15, 25, 30, 35, 30, 25, 15, 5],
    [5, 10, 20, 25, 30, 25, 20, 10, 5],
    [0, 5, 15, 20, 25, 20, 15, 5, 0],
    [0, 0, 5, 10, 15, 10, 5, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  soldier: [
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 10, 15, 20, 25, 20, 15, 10, 0],
    [20, 30, 40, 50, 60, 50, 40, 30, 20],
    [30, 45, 60, 75, 80, 75, 60, 45, 30],
    [40, 60, 80, 100, 120, 100, 80, 60, 40],
    [80, 100, 120, 150, 200, 150, 120, 100, 80],
    [0, 0, 0, 0, 0, 0, 0, 0, 0]
  ]
}

// ============================================================
// 工具函数
// ============================================================
function mirrorPosition(row: number, col: number): Position {
  return { row: 9 - row, col }
}

function getPositionScore(piece: Piece): number {
  const scores = POSITION_SCORES[piece.type]
  const pos = piece.color === 'black' ? mirrorPosition(piece.position.row, piece.position.col) : piece.position
  return scores[pos.row]?.[pos.col] || 0
}

export function getPieceValue(type: PieceType): number {
  return BASE_PIECE_VALUES[type]
}

// ============================================================
// 阶段判定与全局计算
// ============================================================

/**
 * 计算全盘绝对子力总和
 * 用于判断是否进入残局阶段
 */
function calculateTotalMaterialValue(state: GameState): number {
  let total = 0
  const probabilities = calculateProbabilities(state)
  
  for (const piece of state.pieces) {
    if (piece.type === 'king') continue // 将帅不计入子力总和
    
    if (piece.isRevealed || piece.hiddenType) {
      // 明子或知道hidden type的暗子，用真实类型
      const actualType = piece.isRevealed ? piece.type : piece.hiddenType
      total += BASE_PIECE_VALUES[actualType]
    } else {
      // 完全未知的暗子，使用期望价值
      total += estimatePieceValue(piece, probabilities)
    }
  }
  
  return total
}

/**
 * 判断是否进入残局阶段
 * 残局阈值：剩余子力总价值 < 3000 分
 */
function isEndgame(state: GameState): boolean {
  const totalMaterial = calculateTotalMaterialValue(state)
  return totalMaterial < 3000
}

// ============================================================
// 动态棋子价值计算
// ============================================================

/**
 * 计算动态棋子价值
 * 考虑：残局阶段、炮架、马腿阻挡、兵过河等因素
 * 对于暗子：如果知道hidden type，用hidden type；否则用期望价值
 */
function getDynamicPieceValue(piece: Piece, state: GameState, isEndgame: boolean): number {
  // 如果棋子已翻开或者有hidden type，用真实类型计算
  let actualType = piece.isRevealed ? piece.type : (piece.hiddenType || piece.type)
  const baseValue = BASE_PIECE_VALUES[actualType]
  
  switch (actualType) {
    case 'chariot': {
      // 车：每减少一个全盘总子力，车获得微量加分（残局线路畅通）
      const totalPieces = state.pieces.length
      const maxPieces = 32
      const pieceRatio = totalPieces / maxPieces
      const boostFactor = 1.3 - 0.3 * pieceRatio // 从100%提升到130%
      return baseValue * boostFactor
    }
    
    case 'cannon': {
      // 炮：进入残局阶段后，如果本方缺少仕相或兵卒作为"炮架"，炮的价值按比例衰减
      if (!isEndgame) return baseValue
      
      // 统计本方可用炮架数量
      let frameCount = 0
      for (const p of state.pieces) {
        if (p.color === piece.color && p.type !== 'cannon' && p.type !== 'king') {
          frameCount++
        }
      }
      
      // 炮架越少，价值越低（最低降至70%）
      const decayFactor = Math.max(0.7, 0.7 + 0.3 * (frameCount / 10))
      return baseValue * decayFactor
    }
    
    case 'horse': {
      // 马：价值相对稳定，但在中局阶段若周围无阻挡（无蹩马腿危险），给予机动性加分
      if (isEndgame) return baseValue
      
      // 检查马腿是否被阻挡
      const legPositions = [
        { row: piece.position.row - 1, col: piece.position.col },
        { row: piece.position.row + 1, col: piece.position.col },
        { row: piece.position.row, col: piece.position.col - 1 },
        { row: piece.position.row, col: piece.position.col + 1 }
      ]
      
      let blockedLegs = 0
      for (const pos of legPositions) {
        if (getPieceAt(state, pos)) {
          blockedLegs++
        }
      }
      
      // 被阻挡的马腿越少，机动性越好
      const mobilityBonus = (4 - blockedLegs) * 10
      return baseValue + mobilityBonus
    }
    
    case 'soldier': {
      // 兵卒：过河前只值基础分；过河后附加横移控制分；逼近敌方九宫格内附加致命威胁分
      let value = baseValue
      
      const isRed = piece.color === 'red'
      const crossedRiver = isRed ? piece.position.row <= 4 : piece.position.row >= 5
      
      if (crossedRiver) {
        value += 50 // 过河加分
        
        // 逼近敌方九宫格
        const nearEnemyPalace = isRed 
          ? piece.position.row <= 2 && piece.position.col >= 3 && piece.position.col <= 5
          : piece.position.row >= 7 && piece.position.col >= 3 && piece.position.col <= 5
        
        if (nearEnemyPalace) {
          value += 100 // 九宫格威胁加分
        }
      }
      
      return value
    }
    
    case 'king': {
      // 将帅：开局/中局绝对静止；残局阶段，若将帅位于4,5,6列（中路控制），给予极高的战术加分
      if (!isEndgame) return baseValue
      
      const centerCols = [3, 4, 5]
      if (centerCols.includes(piece.position.col)) {
        return baseValue + 200 // 残局中路控制加分
      }
      
      return baseValue
    }
    
    default:
      return baseValue
  }
}

/**
 * 计算单个棋子的价值
 * 1. 如果是明子 → 使用真实类型的动态价值
 * 2. 如果是暗子且知道hidden type → 使用hidden type的动态价值
 * 3. 如果是暗子且不知道hidden type → 使用期望价值 + 位置价值 + 移动性能价值
 */
function calculatePieceValue(piece: Piece, state: GameState, isEndgame: boolean): number {
  if (piece.isRevealed || piece.hiddenType) {
    // 明子或者知道hidden type的暗子，用真实类型计算
    return getDynamicPieceValue(piece, state, isEndgame)
  } else {
    // 完全未知的暗子，使用期望价值 + 位置价值 + 移动性能价值
    const probabilities = calculateProbabilities(state)
    const expectedValue = estimatePieceValue(piece, probabilities)
    
    // 加上基于位置的价值调整
    const positionBonus = calculatePositionBonus(piece, state)
    
    // 加上移动性能的价值调整
    const mobilityBonus = calculateMobilityBonus(piece, state)
    
    return expectedValue + positionBonus + mobilityBonus
  }
}

/**
 * 计算基于位置的额外价值（仅用于暗子期望
 * 基于位置在棋盘上的重要性
 */
function calculatePositionBonus(piece: Piece, state: GameState): number {
  let bonus = 0
  const row = piece.position.row
  const col = piece.position.col
  const isRed = piece.color === 'red'
  
  // 中心位置价值更高
  const centerRow = isRed ? 4.5 : 4.5
  const distFromCenterRow = Math.abs(row - centerRow)
  const distFromCenterCol = Math.abs(col - 4)
  
  // 距离中心越近，价值越高
  bonus += (10 - distFromCenterRow) * 5
  bonus += (4 - distFromCenterCol) * 5
  
  // 前线位置价值更高
  if (isRed && row <= 4) {
    bonus += 30
  } else if (!isRed && row >= 5) {
    bonus += 30
  }
  
  return bonus
}

/**
 * 计算基于移动性能的额外价值（仅用于暗子期望
 * 基于位置潜在的移动能力
 */
function calculateMobilityBonus(piece: Piece, state: GameState): number {
  let bonus = 0
  
  // 我们假设暗子在不同位置可能有的各种子的平均移动性
  // 基于棋盘位置，计算平均移动潜力
  const row = piece.position.row
  const col = piece.position.col
  
  // 越靠近中心，潜在移动性越高
  const centerProximity = 10 - (Math.abs(row - 4.5) + (4 - Math.abs(col - 4)))
  bonus += centerProximity * 3
  
  return bonus
}

// ============================================================
// 威胁检测与攻防体系
// ============================================================

/**
 * 获取棋子的威胁位置（能攻击到的位置）
 */
export function getThreatPositions(state: GameState, piece: Piece): Position[] {
  const positions: Position[] = []
  
  switch (piece.type) {
    case 'king': {
      const kingDeltas = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      for (const [dr, dc] of kingDeltas) {
        const newRow = piece.position.row + dr
        const newCol = piece.position.col + dc
        if (newRow >= 7 && newRow <= 9 && newCol >= 3 && newCol <= 5) {
          positions.push({ row: newRow, col: newCol })
        }
      }
      break
    }
    case 'chariot': {
      const chDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      for (const [dr, dc] of chDirs) {
        let r = piece.position.row + dr
        let c = piece.position.col + dc
        while (r >= 0 && r < 10 && c >= 0 && c < 9) {
          const p = getPieceAt(state, { row: r, col: c })
          if (p) {
            positions.push({ row: r, col: c })
            break
          }
          r += dr
          c += dc
        }
      }
      break
    }
    case 'cannon': {
      const canDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]]
      for (const [dr, dc] of canDirs) {
        let r = piece.position.row + dr
        let c = piece.position.col + dc
        let jumped = false
        while (r >= 0 && r < 10 && c >= 0 && c < 9) {
          const p = getPieceAt(state, { row: r, col: c })
          if (p) {
            if (!jumped) {
              jumped = true
            } else {
              positions.push({ row: r, col: c })
              break
            }
          }
          r += dr
          c += dc
        }
      }
      break
    }
    case 'horse': {
      const horseMoves = [
        [-2, -1], [-2, 1], [2, -1], [2, 1],
        [-1, -2], [1, -2], [-1, 2], [1, 2]
      ]
      for (const [dr, dc] of horseMoves) {
        const newRow = piece.position.row + dr
        const newCol = piece.position.col + dc
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
          const blockRow = piece.position.row + (dr === -2 ? -1 : dr === 2 ? 1 : 0)
          const blockCol = piece.position.col + (dc === -2 ? -1 : dc === 2 ? 1 : 0)
          if (!getPieceAt(state, { row: blockRow, col: blockCol })) {
            positions.push({ row: newRow, col: newCol })
          }
        }
      }
      break
    }
    case 'guard': {
      const guardMoves = [[-1, -1], [-1, 1], [1, -1], [1, 1]]
      for (const [dr, dc] of guardMoves) {
        const newRow = piece.position.row + dr
        const newCol = piece.position.col + dc
        if (newRow >= 7 && newRow <= 9 && newCol >= 3 && newCol <= 5) {
          positions.push({ row: newRow, col: newCol })
        }
      }
      break
    }
    case 'elephant': {
      const elephantMoves = [[-2, -2], [-2, 2], [2, -2], [2, 2]]
      const isRed = piece.color === 'red'
      for (const [dr, dc] of elephantMoves) {
        const newRow = piece.position.row + dr
        const newCol = piece.position.col + dc
        if ((isRed && newRow >= 0 && newRow <= 4) || (!isRed && newRow >= 5 && newRow <= 9)) {
          if (newCol >= 0 && newCol < 9) {
            const blockRow = piece.position.row + dr / 2
            const blockCol = piece.position.col + dc / 2
            if (!getPieceAt(state, { row: blockRow, col: blockCol })) {
              positions.push({ row: newRow, col: newCol })
            }
          }
        }
      }
      break
    }
    case 'soldier': {
      const direction = piece.color === 'red' ? -1 : 1
      const moves = [[direction, 0], [0, -1], [0, 1]]
      for (const [dr, dc] of moves) {
        const newRow = piece.position.row + dr
        const newCol = piece.position.col + dc
        if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
          positions.push({ row: newRow, col: newCol })
        }
      }
      break
    }
  }
  
  return positions
}

/**
 * 获取某个位置的所有攻击者（敌方）
 */
function getAttackers(state: GameState, pos: Position, enemyColor: PieceColor): Piece[] {
  const attackers: Piece[] = []
  
  for (const piece of state.pieces) {
    if (piece.color !== enemyColor) continue
    if (!piece.isRevealed) continue
    
    const threats = getThreatPositions(state, piece)
    for (const threat of threats) {
      if (threat.row === pos.row && threat.col === pos.col) {
        attackers.push(piece)
        break
      }
    }
  }
  
  return attackers
}

/**
 * 获取某个位置的所有防守者（我方）
 */
function getDefenders(state: GameState, pos: Position, ourColor: PieceColor): Piece[] {
  const defenders: Piece[] = []
  
  for (const piece of state.pieces) {
    if (piece.color !== ourColor) continue
    if (!piece.isRevealed) continue
    
    const threats = getThreatPositions(state, piece)
    for (const threat of threats) {
      if (threat.row === pos.row && threat.col === pos.col) {
        defenders.push(piece)
        break
      }
    }
  }
  
  return defenders
}

/**
 * 检查某个棋子是否被敌方威胁
 */
export function isPieceThreatened(state: GameState, piece: Piece, enemyColor: PieceColor): boolean {
  return getAttackers(state, piece.position, enemyColor).length > 0
}

/**
 * 检查某个位置是否有根（有我方棋子保护）
 */
export function isPositionRooted(state: GameState, pos: Position, ourColor: PieceColor): boolean {
  return getDefenders(state, pos, ourColor).length > 0
}

// ============================================================
// 真实攻防体系算分（算根逻辑）
// ============================================================

/**
 * 计算攻防体系分数
 * - 裸奔状态惩罚
 * - 有根状态加分
 * - 对敌暗子压制加分
 */
function calculateAttackDefenseScore(state: GameState, color: PieceColor, isEndgame: boolean): number {
  let score = 0
  const enemyColor = color === 'red' ? 'black' : 'red'
  
  // 遍历棋盘上的每一个有棋子（含暗子）的格子
  for (const piece of state.pieces) {
    if (piece.color !== color) continue
    
    // 获取该棋子的价值 - 使用新的计算函数
    const pieceValue = calculatePieceValue(piece, state, isEndgame)
    
    // 收集火力网
    const attackers = getAttackers(state, piece.position, enemyColor)
    const defenders = getDefenders(state, piece.position, color)
    
    // 按子力价值排序
    attackers.sort((a, b) => calculatePieceValue(a, state, isEndgame) - calculatePieceValue(b, state, isEndgame))
    defenders.sort((a, b) => calculatePieceValue(a, state, isEndgame) - calculatePieceValue(b, state, isEndgame))
    
    // 威胁与防守结算（针对我方棋子）
    if (attackers.length > 0) {
      if (defenders.length === 0) {
        // 裸奔状态：该棋子价值的50%作为负分惩罚（极度危险）
        score -= pieceValue * 0.5
      } else {
        // 有根状态：比较最便宜的攻击者与我方受威胁子力价值
        const cheapestAttackerValue = calculatePieceValue(attackers[0], state, isEndgame)
        
        if (cheapestAttackerValue >= pieceValue) {
          // 敌方最便宜的攻击者换我方的子力是亏本或等价的
          // 完全取消被威胁惩罚，并给予微量的"诱敌阵型加分"
          score += 20
        } else {
          // 敌方是盈利的（例如：敌方用兵吃我方有根的车）
          // 依然要给予负分惩罚，迫使车逃离
          score -= pieceValue * 0.2
        }
      }
    }
  }
  
  // 对敌火力压制（针对敌方暗子）
  const enemyDarkPieces = state.pieces.filter(p => !p.isRevealed && p.color === enemyColor)
  
  for (const ourPiece of state.pieces) {
    if (ourPiece.color !== color || !ourPiece.isRevealed) continue
    
    const threats = getThreatPositions(state, ourPiece)
    for (const threat of threats) {
      for (const darkPiece of enemyDarkPieces) {
        if (threat.row === darkPiece.position.row && threat.col === darkPiece.position.col) {
          // 我方攻击范围覆盖敌方暗子，给予"暗子压制加分"
          score += 30
        }
      }
    }
  }
  
  return score
}

// ============================================================
// 阵型与信息获取权衡
// ============================================================

/**
 * 计算翻子保守与激进系数
 */
export function calculateFlipWeight(state: GameState, color: PieceColor): number {
  const advantage = calculateValueAdvantage(state, color)
  
  // 优势超过400分，全局扣除翻开己方暗子的诱惑分
  if (advantage > 400) {
    return 0.3
  }
  
  // 劣势超过400分，全局增加己方暗子周围的安全系数分
  if (advantage < -400) {
    return 2.0
  }
  
  return 1.0
}

/**
 * 计算双方价值差（正数表示我方优势）
 */
export function calculateValueAdvantage(state: GameState, color: PieceColor): number {
  const isEndgameFlag = isEndgame(state)
  let ourValue = 0
  let enemyValue = 0
  const enemyColor = color === 'red' ? 'black' : 'red'
  
  for (const piece of state.pieces) {
    if (piece.type === 'king') continue
    
    const value = calculatePieceValue(piece, state, isEndgameFlag)
    
    if (piece.color === color) {
      ourValue += value
    } else if (piece.color === enemyColor) {
      enemyValue += value
    }
  }
  
  return ourValue - enemyValue
}

/**
 * 计算机动性惩罚
 * 如果我方的车、马、炮被严重堵塞（合法移动步数 < 3），给予空间拥挤的负分惩罚
 */
function calculateMobilityPenalty(state: GameState, color: PieceColor): number {
  let penalty = 0
  
  for (const piece of state.pieces) {
    if (piece.color !== color || !piece.isRevealed) continue
    if (!['chariot', 'horse', 'cannon'].includes(piece.type)) continue
    
    const legalMoves = getLegalMoves(state, piece)
    
    if (legalMoves.length < 3) {
      // 严重堵塞，给予惩罚
      penalty -= (3 - legalMoves.length) * 20
    }
  }
  
  return penalty
}

// ============================================================
// 子力优势评估
// ============================================================

/**
 * 计算子力优势评估
 */
function calculateMaterialScore(state: GameState, color: PieceColor, isEndgame: boolean): number {
  let score = 0
  const enemyColor = color === 'red' ? 'black' : 'red'
  
  for (const piece of state.pieces) {
    if (piece.type === 'king') continue
    
    const value = calculatePieceValue(piece, state, isEndgame)
    
    if (piece.color === color) {
      score += value
    } else if (piece.color === enemyColor) {
      score -= value
    }
  }
  
  return score
}

// ============================================================
// 位置分数评估
// ============================================================

function calculatePositionScore(state: GameState, color: PieceColor): number {
  let score = 0
  
  for (const piece of state.pieces) {
    if (!piece.isRevealed || piece.type === 'king') continue
    
    const posScore = getPositionScore(piece)
    
    if (piece.color === color) {
      score += posScore
    } else {
      score -= posScore
    }
  }
  
  return score
}

// ============================================================
// 主评估函数
// ============================================================

/**
 * 揭棋静态评估函数
 * 评估分数始终以"红方得分为正，黑方得分为负"来结算
 */
export function evaluate(state: GameState): number {
  let score = 0
  
  // ========== 第一阶段：全局局势与阶段判定 ==========
  const isEndgameFlag = isEndgame(state)
  
  // ========== 第二阶段：基础子力与期望价值 ==========
  // 子力优势
  score += calculateMaterialScore(state, 'red', isEndgameFlag)
  score -= calculateMaterialScore(state, 'black', isEndgameFlag)
  
  // 位置分数
  score += calculatePositionScore(state, 'red')
  score -= calculatePositionScore(state, 'black')
  
  // ========== 第三阶段：真实攻防体系算分（算根逻辑） ==========
  score += calculateAttackDefenseScore(state, 'red', isEndgameFlag)
  score -= calculateAttackDefenseScore(state, 'black', isEndgameFlag)
  
  // ========== 第四阶段：阵型与信息获取权衡 ==========
  // 机动性惩罚
  score += calculateMobilityPenalty(state, 'red')
  score -= calculateMobilityPenalty(state, 'black')
  
  return score
}

export function evaluateForPlayer(state: GameState, player: PieceColor): number {
  const score = evaluate(state)
  return player === 'red' ? score : -score
}

// 导出位置分数表供search.ts使用
export { POSITION_SCORES }