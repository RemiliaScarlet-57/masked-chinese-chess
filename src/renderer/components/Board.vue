<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import type { GameState, Piece } from '../types'

const props = defineProps<{
  gameState: GameState
  selectedPieceId: string | null
  validMoves: { row: number; col: number }[]
  lastMoveFrom: { row: number; col: number } | null
  lastMoveTo: { row: number; col: number } | null
}>()

const emit = defineEmits<{
  (e: 'selectPiece', pieceId: string): void
  (e: 'movePiece', row: number, col: number): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const GAP = 64
const PADDING = 55
const LINE_COUNT_H = 10
const LINE_COUNT_V = 9
const BOARD_WIDTH = (LINE_COUNT_V - 1) * GAP
const BOARD_HEIGHT = (LINE_COUNT_H - 1) * GAP
const CANVAS_WIDTH = BOARD_WIDTH + PADDING * 2
const CANVAS_HEIGHT = BOARD_HEIGHT + PADDING * 2

const pieceSymbols = {
  red: {
    king: '帅',
    guard: '仕',
    elephant: '相',
    horse: '马',
    chariot: '车',
    cannon: '炮',
    soldier: '兵'
  },
  black: {
    king: '将',
    guard: '士',
    elephant: '象',
    horse: '马',
    chariot: '車',
    cannon: '砲',
    soldier: '卒'
  }
}

function getPieceAt(row: number, col: number): Piece | undefined {
  return props.gameState.pieces.find(
    p => p.position.row === row && p.position.col === col
  )
}

function isValidMoveAt(row: number, col: number): boolean {
  return props.validMoves.some(m => m.row === row && m.col === col)
}

function isSelectedPieceAt(row: number, col: number): boolean {
  const piece = getPieceAt(row, col)
  return piece?.id === props.selectedPieceId
}

function getPieceSymbol(piece: Piece): string {
  if (!piece.isRevealed) return ''
  return pieceSymbols[piece.color][piece.type]
}

function drawBoard(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = '#ebdbb2'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  
  ctx.fillStyle = '#f5deb3'
  ctx.fillRect(PADDING, PADDING, BOARD_WIDTH, BOARD_HEIGHT)
  
  ctx.strokeStyle = '#5c4033'
  ctx.lineWidth = 2.5
  ctx.strokeRect(PADDING, PADDING, BOARD_WIDTH, BOARD_HEIGHT)
  
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#4a3728'
  for (let i = 0; i < LINE_COUNT_H; i++) {
    const y = PADDING + i * GAP
    ctx.beginPath()
    ctx.moveTo(PADDING, y)
    ctx.lineTo(PADDING + BOARD_WIDTH, y)
    ctx.stroke()
  }
  
  for (let i = 0; i < LINE_COUNT_V; i++) {
    const x = PADDING + i * GAP
    
    ctx.beginPath()
    ctx.moveTo(x, PADDING)
    ctx.lineTo(x, PADDING + 4 * GAP)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(x, PADDING + 5 * GAP)
    ctx.lineTo(x, PADDING + BOARD_HEIGHT)
    ctx.stroke()
  }
  
  ctx.lineWidth = 2
  ctx.strokeStyle = '#3d2914'
  
  ctx.beginPath()
  ctx.moveTo(PADDING, PADDING + 4 * GAP)
  ctx.lineTo(PADDING + 3 * GAP, PADDING + 4 * GAP)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(PADDING + 6 * GAP, PADDING + 4 * GAP)
  ctx.lineTo(PADDING + BOARD_WIDTH, PADDING + 4 * GAP)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(PADDING, PADDING + 5 * GAP)
  ctx.lineTo(PADDING + 3 * GAP, PADDING + 5 * GAP)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(PADDING + 6 * GAP, PADDING + 5 * GAP)
  ctx.lineTo(PADDING + BOARD_WIDTH, PADDING + 5 * GAP)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(PADDING, PADDING + 4 * GAP)
  ctx.lineTo(PADDING, PADDING + 5 * GAP)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(PADDING + GAP, PADDING + 4 * GAP)
  ctx.lineTo(PADDING + GAP, PADDING + 5 * GAP)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(PADDING + 2 * GAP, PADDING + 4 * GAP)
  ctx.lineTo(PADDING + 2 * GAP, PADDING + 5 * GAP)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(PADDING + 3 * GAP, PADDING + 4 * GAP)
  ctx.lineTo(PADDING + 3 * GAP, PADDING + 5 * GAP)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(PADDING + 6 * GAP, PADDING + 4 * GAP)
  ctx.lineTo(PADDING + 6 * GAP, PADDING + 5 * GAP)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(PADDING + 7 * GAP, PADDING + 4 * GAP)
  ctx.lineTo(PADDING + 7 * GAP, PADDING + 5 * GAP)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(PADDING + 8 * GAP, PADDING + 4 * GAP)
  ctx.lineTo(PADDING + 8 * GAP, PADDING + 5 * GAP)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(PADDING + BOARD_WIDTH, PADDING + 4 * GAP)
  ctx.lineTo(PADDING + BOARD_WIDTH, PADDING + 5 * GAP)
  ctx.stroke()
  
  ctx.font = 'bold 28px KaiTi, STKaiti, SimKai, Microsoft YaHei'
  ctx.fillStyle = '#3d2914'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  ctx.save()
  ctx.rotate(-Math.PI / 2)
  ctx.fillText('楚河', -PADDING - BOARD_HEIGHT / 2, PADDING + BOARD_WIDTH * 0.3)
  ctx.fillText('漢界', -PADDING - BOARD_HEIGHT / 2, PADDING + BOARD_WIDTH * 0.7)
  ctx.restore()
  
  ctx.lineWidth = 2
  ctx.strokeStyle = '#3d2914'
  
  drawPalace(ctx, 0)
  drawPalace(ctx, 7)
  
  ctx.fillStyle = '#4a3728'
  for (let i = 1; i < LINE_COUNT_V - 1; i++) {
    for (let j = 3; j <= 6; j += 3) {
      if (j !== 3 || (i !== 0 && i !== 9)) {
        const x = PADDING + i * GAP
        const y = PADDING + j * GAP
        drawPositionMarker(ctx, x, y, i < 4)
      }
    }
  }
  
  ctx.beginPath()
  ctx.arc(PADDING + GAP, PADDING + 3 * GAP, 5, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.beginPath()
  ctx.arc(PADDING + 8 * GAP, PADDING + 3 * GAP, 5, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.beginPath()
  ctx.arc(PADDING + GAP, PADDING + 6 * GAP, 5, 0, Math.PI * 2)
  ctx.fill()
  
  ctx.beginPath()
  ctx.arc(PADDING + 8 * GAP, PADDING + 6 * GAP, 5, 0, Math.PI * 2)
  ctx.fill()
}

function drawPositionMarker(ctx: CanvasRenderingContext2D, x: number, y: number, isTop: boolean) {
  const r = 6
  const offset = 8
  
  ctx.lineWidth = 1.5
  ctx.strokeStyle = '#4a3728'
  
  if (isTop) {
    ctx.beginPath()
    ctx.moveTo(x - r, y - offset)
    ctx.lineTo(x - r, y - r)
    ctx.lineTo(x - offset, y - r)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(x + r, y - offset)
    ctx.lineTo(x + r, y - r)
    ctx.lineTo(x + offset, y - r)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(x - r, y + offset)
    ctx.lineTo(x - r, y + r)
    ctx.lineTo(x - offset, y + r)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(x + r, y + offset)
    ctx.lineTo(x + r, y + r)
    ctx.lineTo(x + offset, y + r)
    ctx.stroke()
  } else {
    ctx.beginPath()
    ctx.moveTo(x - r, y - offset)
    ctx.lineTo(x - r, y - r)
    ctx.lineTo(x - offset, y - r)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(x + r, y - offset)
    ctx.lineTo(x + r, y - r)
    ctx.lineTo(x + offset, y - r)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(x - r, y + offset)
    ctx.lineTo(x - r, y + r)
    ctx.lineTo(x - offset, y + r)
    ctx.stroke()
    
    ctx.beginPath()
    ctx.moveTo(x + r, y + offset)
    ctx.lineTo(x + r, y + r)
    ctx.lineTo(x + offset, y + r)
    ctx.stroke()
  }
}

function drawPalace(ctx: CanvasRenderingContext2D, startRow: number) {
  const leftCol = 3
  const rightCol = 5
  const topRow = startRow
  const bottomRow = startRow + 2
  
  const x1 = PADDING + leftCol * GAP
  const y1 = PADDING + topRow * GAP
  const x2 = PADDING + rightCol * GAP
  const y2 = PADDING + bottomRow * GAP
  
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y1)
  ctx.lineTo(x2, y2)
  ctx.lineTo(x1, y2)
  ctx.closePath()
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  
  ctx.beginPath()
  ctx.moveTo(x2, y1)
  ctx.lineTo(x1, y2)
  ctx.stroke()
}

function drawPieces(ctx: CanvasRenderingContext2D) {
  // 先绘制最后一步的起始位置亮点标记
  if (props.lastMoveFrom) {
    const fromRow = props.lastMoveFrom.row
    const fromCol = props.lastMoveFrom.col
    const x = PADDING + fromCol * GAP
    const y = PADDING + fromRow * GAP
    
    // 创建渐变效果
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, GAP / 2)
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)')
    gradient.addColorStop(0.5, 'rgba(255, 180, 0, 0.5)')
    gradient.addColorStop(1, 'rgba(255, 150, 0, 0)')
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(x, y, GAP / 2 + 8, 0, Math.PI * 2)
    ctx.fill()
    
    // 添加更亮的中心圆点
    ctx.fillStyle = '#ffd700'
    ctx.beginPath()
    ctx.arc(x, y, 8, 0, Math.PI * 2)
    ctx.fill()
  }
  
  for (let row = 0; row < LINE_COUNT_H; row++) {
    for (let col = 0; col < LINE_COUNT_V; col++) {
      const piece = getPieceAt(row, col)
      const x = PADDING + col * GAP
      const y = PADDING + row * GAP
      
      if (isValidMoveAt(row, col)) {
        const targetPiece = getPieceAt(row, col)
        if (targetPiece) {
          ctx.strokeStyle = '#e17055'
          ctx.lineWidth = 3
          const radius = GAP / 2 - 2
          ctx.beginPath()
          ctx.arc(x, y, radius + 4, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.fillStyle = '#00b894'
          ctx.beginPath()
          ctx.arc(x, y, 12, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      
      if (piece) {
        const radius = GAP / 2 - 3
        const isSelected = isSelectedPieceAt(row, col)
        const isLastMoved = props.lastMoveTo 
          && props.lastMoveTo.row === row 
          && props.lastMoveTo.col === col
        
        if (isSelected) {
          ctx.strokeStyle = '#00b894'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.arc(x, y, radius + 8, 0, Math.PI * 2)
          ctx.stroke()
        }
        
        // 移动后的棋子高亮：绘制发光边框
        if (isLastMoved) {
          // 外发光效果
          const glowGradient = ctx.createRadialGradient(x, y, radius, x, y, radius + 10)
          glowGradient.addColorStop(0, 'rgba(0, 255, 136, 0.8)')
          glowGradient.addColorStop(0.5, 'rgba(0, 255, 136, 0.3)')
          glowGradient.addColorStop(1, 'rgba(0, 255, 136, 0)')
          
          ctx.fillStyle = glowGradient
          ctx.beginPath()
          ctx.arc(x, y, radius + 10, 0, Math.PI * 2)
          ctx.fill()
        }
        
        if (piece.isRevealed) {
          if (piece.color === 'red') {
            ctx.fillStyle = '#d63031'
          } else {
            ctx.fillStyle = '#2d3436'
          }
        } else {
          ctx.fillStyle = '#636e72'
        }
        
        ctx.beginPath()
        ctx.arc(x, y, radius, 0, Math.PI * 2)
        ctx.fill()
        
        // 移动后的棋子高亮：绘制特殊边框
        if (isLastMoved) {
          ctx.strokeStyle = '#00ff88'
          ctx.lineWidth = 5
          ctx.beginPath()
          ctx.arc(x, y, radius + 2, 0, Math.PI * 2)
          ctx.stroke()
        } else {
          ctx.strokeStyle = piece.color === 'red' ? '#b33939' : '#1e272e'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.stroke()
        }
        
        if (isSelected) {
          ctx.strokeStyle = '#00b894'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, Math.PI * 2)
          ctx.stroke()
        }
        
        ctx.font = `bold ${radius * 0.85}px KaiTi, STKaiti, SimKai, Microsoft YaHei`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        
        if (piece.isRevealed) {
          ctx.fillStyle = piece.color === 'red' ? '#ffeaa7' : '#fff'
          ctx.fillText(getPieceSymbol(piece), x, y)
        } else {
          ctx.fillStyle = '#b2bec3'
          ctx.font = `bold ${radius * 0.6}px KaiTi, STKaiti, SimKai, Microsoft YaHei`
          ctx.fillText('?', x, y)
        }
      }
    }
  }
}

function drawLabels(ctx: CanvasRenderingContext2D) {
  // 红方（下方视角从右到左是 一、二、三、四、五、六、七、八、九
  // 但在屏幕上是从左到右显示，所以顺序要反过来
  const redLabels = ['九', '八', '七', '六', '五', '四', '三', '二', '一']
  // 黑方（从红方视角从左到右是 1、2、3、4、5、6、7、8、9
  const blackLabels = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
  
  ctx.font = 'bold 15px KaiTi, STKaiti, SimKai, Microsoft YaHei'
  ctx.fillStyle = '#3d2914'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  // 红方坐标（下方，用中文数字，从己方视角右边是一）
  for (let i = 0; i < LINE_COUNT_V; i++) {
    const x = PADDING + i * GAP
    ctx.fillText(redLabels[i], x, CANVAS_HEIGHT - 12)
  }
  
  // 黑方坐标（上方，用阿拉伯数字，从红方视角从左到右是 1、2、3、4、5、6、7、8、9）
  for (let i = 0; i < LINE_COUNT_V; i++) {
    const x = PADDING + i * GAP
    ctx.fillText(blackLabels[i], x, 12)
  }
}

function render() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  drawBoard(ctx)
  drawPieces(ctx)
  drawLabels(ctx)
}

function handleCanvasClick(event: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const rect = canvas.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  const col = Math.round((x - PADDING) / GAP)
  const row = Math.round((y - PADDING) / GAP)
  
  if (col >= 0 && col < LINE_COUNT_V && row >= 0 && row < LINE_COUNT_H) {
    const piece = getPieceAt(row, col)
    
    if (piece && piece.color === props.gameState.currentPlayer) {
      emit('selectPiece', piece.id)
    } else if (props.selectedPieceId) {
      emit('movePiece', row, col)
    }
  }
}

onMounted(() => {
  render()
})

watch(() => [props.gameState, props.selectedPieceId, props.validMoves, props.lastMoveTo], () => {
  render()
}, { deep: true })
</script>

<template>
  <div class="chess-board-wrapper">
    <canvas 
      ref="canvasRef" 
      :width="CANVAS_WIDTH" 
      :height="CANVAS_HEIGHT"
      class="chess-board-canvas"
      @click="handleCanvasClick"
    />
  </div>
</template>

<style scoped>
.chess-board-wrapper {
  display: inline-block;
  padding: 12px;
  background: #dfe6e9;
  border-radius: 8px;
  border: 4px solid #636e72;
}

.chess-board-canvas {
  border-radius: 4px;
  cursor: pointer;
}
</style>
