<script setup lang="ts">
import { ref, watch, onMounted, nextTick } from 'vue'

interface ScoreData {
  turn: number
  score: number
  player: 'red' | 'black'
}

const props = defineProps<{
  data: ScoreData[]
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)

function drawChart() {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const width = canvas.width
  const height = canvas.height
  const padding = 40
  
  // 清空画布
  ctx.clearRect(0, 0, width, height)
  
  if (props.data.length < 2) {
    // 数据不够时显示提示
    ctx.fillStyle = '#666'
    ctx.font = '16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('分数趋势图', width / 2, height / 2)
    return
  }
  
  // 计算分数范围
  const scores = props.data.map(d => d.score)
  const maxScore = Math.max(...scores, 100)
  const minScore = Math.min(...scores, -100)
  const range = maxScore - minScore || 200
  const chartHeight = height - padding * 2
  const chartWidth = width - padding * 2
  
  // 绘制网格线
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1.5
  ctx.setLineDash([5, 5])
  
  // 中线（0分）
  const zeroY = padding + chartHeight * (maxScore / range)
  ctx.beginPath()
  ctx.moveTo(padding, zeroY)
  ctx.lineTo(width - padding, zeroY)
  ctx.stroke()
  ctx.setLineDash([])
  
  // 绘制X轴标签
  ctx.fillStyle = '#888'
  ctx.font = '13px sans-serif'
  ctx.textAlign = 'center'
  const step = Math.ceil(props.data.length / 6)
  for (let i = 0; i < props.data.length; i += step) {
    const x = padding + (i / (props.data.length - 1)) * chartWidth
    ctx.fillText(`T${props.data[i].turn}`, x, height - 15)
  }
  
  // 绘制Y轴标签
  ctx.textAlign = 'right'
  ctx.font = '13px sans-serif'
  ctx.fillText(`+${maxScore}`, padding - 8, padding + 8)
  ctx.fillText(`0`, padding - 8, zeroY + 4)
  ctx.fillText(`${minScore}`, padding - 8, height - padding + 4)
  
  // 绘制分数曲线
  ctx.beginPath()
  ctx.lineWidth = 3
  
  for (let i = 0; i < props.data.length; i++) {
    const x = padding + (i / (props.data.length - 1)) * chartWidth
    const y = padding + chartHeight * ((maxScore - props.data[i].score) / range)
    
    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  
  ctx.stroke()
  
  // 绘制数据点和标签
  for (let i = 0; i < props.data.length; i++) {
    const x = padding + (i / (props.data.length - 1)) * chartWidth
    const y = padding + chartHeight * ((maxScore - props.data[i].score) / range)
    
    // 数据点
    ctx.beginPath()
    ctx.arc(x, y, 6, 0, Math.PI * 2)
    ctx.fillStyle = props.data[i].score >= 0 ? '#00b894' : '#fd79a8'
    ctx.fill()
    
    // 分数标签（每隔一个显示）
    if (i % 2 === 0 || i === props.data.length - 1) {
      ctx.fillStyle = '#fff'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      const label = props.data[i].score >= 0 
        ? `+${props.data[i].score.toFixed(0)}` 
        : props.data[i].score.toFixed(0)
      ctx.fillText(label, x, y - 12)
    }
  }
}

watch(() => props.data.length, () => {
  nextTick(drawChart)
})

onMounted(() => {
  drawChart()
})
</script>

<template>
  <div class="score-chart">
    <canvas ref="canvasRef" width="340" height="180"></canvas>
  </div>
</template>

<style scoped>
.score-chart {
  background: #2d3436;
  border-radius: 8px;
  padding: 12px;
}

canvas {
  display: block;
  width: 100%;
  height: auto;
}
</style>
