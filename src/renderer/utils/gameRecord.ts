import type { GameState, Move, PieceColor } from '../types'

/**
 * 记录一步棋的详细信息
 */
export interface RecordedMove {
  moveNumber: number
  player: PieceColor
  move: Move
  notation: string
  timestamp: number
}

/**
 * 完整的棋谱记录
 */
export interface GameRecord {
  metadata: {
    gameMode: string
    date: string
    result: 'red_win' | 'black_win' | 'draw' | 'in_progress'
  }
  moves: RecordedMove[]
}

/**
 * 从游戏历史生成棋谱
 */
export function createGameRecord(
  gameState: GameState,
  gameMode: string
): GameRecord {
  const moves: RecordedMove[] = []
  
  for (let i = 0; i < gameState.history.length; i++) {
    const move = gameState.history[i]
    const moveNumber = i + 1
    const player = moveNumber % 2 === 1 ? 'red' : 'black'
    
    moves.push({
      moveNumber,
      player,
      move,
      notation: `${player === 'red' ? '红方' : '黑方'}(${move.from.row},${move.from.col})→(${move.to.row},${move.to.col})`,
      timestamp: Date.now()
    })
  }

  return {
    metadata: {
      gameMode,
      date: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
      result: gameState.status
    },
    moves
  }
}

/**
 * 将棋谱导出为JSON格式
 */
export function exportToJSON(record: GameRecord): string {
  return JSON.stringify(record, null, 2)
}

/**
 * 将棋谱导出为纯文本格式（用于可读性）
 */
export function exportToText(record: GameRecord): string {
  let text = `中国象棋揭棋 - 棋谱\n`
  text += `日期：${record.metadata.date}\n`
  text += `游戏模式：${record.metadata.gameMode}\n`
  text += `结果：${record.metadata.result === 'red_win' ? '红方胜' : 
           record.metadata.result === 'black_win' ? '黑方胜' : 
           record.metadata.result === 'draw' ? '和局' : '进行中'}\n`
  text += `\n----------------------------------------\n`
  text += `回合\t方\t\t棋步\n`
  text += `----------------------------------------\n`
  
  for (const recordedMove of record.moves) {
    text += `${recordedMove.moveNumber}\t${recordedMove.player === 'red' ? '红方' : '黑方'}\t${recordedMove.notation}\n`
  }
  
  text += `----------------------------------------\n`
  text += `\n总计：${record.moves.length}步\n`
  
  return text
}

/**
 * 下载棋谱文件
 */
export function downloadGameRecord(
  content: string,
  filename: string,
  type: 'json' | 'txt'
) {
  const blob = new Blob([content], { type: type === 'json' ? 'application/json' : 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.${type}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
