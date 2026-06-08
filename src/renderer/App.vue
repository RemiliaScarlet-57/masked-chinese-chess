<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGame } from './composables/useGame'
import Board from './components/Board.vue'
import ControlPanel from './components/ControlPanel.vue'
import GameOver from './components/GameOver.vue'
import GameAlert from './components/GameAlert.vue'
import ScoreChart from './components/ScoreChart.vue'

const {
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
 newGame,
 selectPiece,
 movePiece,
 setGameMode,
 setAIDepth,
 exportGameAsJSON,
 exportGameAsText,
 exportFEN,
 importFEN
} = useGame()

// 计算分数趋势数据
const scoreTrendData = computed(() => {
 return aiEvaluations.value.map(evalItem => ({
 turn: evalItem.turn,
 score: evalItem.player === 'black' ? -evalItem.score : evalItem.score,
 player: evalItem.player
 }))
})

const fenInput = ref('')
const fenResult = ref('')

function handleExportFEN() {
 fenResult.value = exportFEN()
}

function handleImportFEN() {
 if (fenInput.value.trim()) {
 const success = importFEN(fenInput.value.trim())
 if (success) {
 alert('FEN导入成功！')
 fenInput.value = ''
 } else {
 alert('FEN格式无效，请检查输入！')
 }
 }
}

function copyFEN() {
 if (fenResult.value) {
 navigator.clipboard.writeText(fenResult.value)
 alert('FEN已复制到剪贴板！')
 }
}

function getPieceSymbol(type, color) {
  const symbols = color === 'red' ? {
    king: '帅', guard: '仕', elephant: '相', horse: '马',
    chariot: '车', cannon: '炮', soldier: '兵'
  } : {
    king: '将', guard: '士', elephant: '象', horse: '马',
    chariot: '車', cannon: '砲', soldier: '卒'
  }
  return symbols[type] || '?'
}
</script>

<template>
  <div class="app-container">
    <div class="game-wrapper">
      <h1 class="game-title">
        🎲 象棋揭棋 🎲
      </h1>
      
      <div class="main-content">
        <!-- 左侧控制面板 -->
        <div class="control-panel-wrapper">
          <ControlPanel
            :game-mode="gameMode"
            :ai-depth="aiDepth"
            :is-ai-thinking="isAIThinking"
            :status-message="statusMessage"
            :current-player="currentPlayer"
            :is-in-check="isInCheck"
            @new-game="newGame"
            @set-game-mode="setGameMode"
            @set-ai-depth="setAIDepth"
            @exportGameAsJSON="exportGameAsJSON"
            @exportGameAsText="exportGameAsText"
          />
        </div>
        
        <!-- 中间棋盘区域 -->
        <div class="center-section">
          <div class="board-section">
            <!-- 红方吃掉的棋子 -->
            <div class="captured-pieces red-captured">
              <div class="captured-label">红方吃掉</div>
              <div class="captured-list">
                <span 
                  v-for="(piece, idx) in capturedPieces.red" 
                  :key="'red-' + idx"
                  :class="['captured-piece', piece.color]"
                >
                  {{ getPieceSymbol(piece.type, piece.color) }}
                </span>
                <span v-if="capturedPieces.red.length === 0" class="no-captured">无</span>
              </div>
            </div>
            
            <div class="board-wrapper">
              <Board
                :game-state="gameState"
                :selected-piece-id="selectedPieceId"
                :valid-moves="validMoves"
                :last-move-from="lastMoveFrom"
                :last-move-to="lastMoveTo"
                @select-piece="selectPiece"
                @move-piece="movePiece"
              />
            </div>
            
            <!-- 黑方吃掉的棋子 -->
            <div class="captured-pieces black-captured">
              <div class="captured-label">黑方吃掉</div>
              <div class="captured-list">
                <span 
                  v-for="(piece, idx) in capturedPieces.black" 
                  :key="'black-' + idx"
                  :class="['captured-piece', piece.color]"
                >
                  {{ getPieceSymbol(piece.type, piece.color) }}
                </span>
                <span v-if="capturedPieces.black.length === 0" class="no-captured">无</span>
              </div>
            </div>
          </div>
          
          <!-- 底部状态栏 -->
          <div class="status-bar">
            <div class="flex justify-between items-center">
              <span class="text-lg">步数: {{ gameState.history.length }}</span>
              <span class="text-lg">模式: {{ gameMode === 'human-vs-human' ? '双人对战' : gameMode === 'human-vs-ai' ? '人机对战' : 'AI对战' }}</span>
              <span v-if="gameMode !== 'human-vs-human'" class="text-lg">AI深度: {{ aiDepth }}</span>
            </div>
          </div>
        </div>
        
        <!-- 右侧面板 -->
        <div class="right-panel">
          <!-- 右上角：FEN工具 -->
          <div class="fen-panel">
            <h3>📋 FEN工具</h3>
            <div class="fen-export">
              <button @click="handleExportFEN" class="btn btn-primary btn-small">导出FEN</button>
              <button v-if="fenResult" @click="copyFEN" class="btn btn-secondary btn-small">复制</button>
            </div>
            <textarea v-if="fenResult" v-model="fenResult" readonly class="fen-textarea" rows="2"></textarea>
            <div class="fen-import">
              <input 
                v-model="fenInput" 
                type="text" 
                placeholder="粘贴FEN..." 
                class="fen-input"
              />
              <button @click="handleImportFEN" class="btn btn-primary btn-small">导入FEN</button>
            </div>
          </div>
          
          <!-- 右下角：AI评估历史 -->
          <div class="ai-evaluation-panel">
            <h3>📊 局势评估</h3>
            
            <!-- 分数趋势图 -->
            <ScoreChart :data="scoreTrendData" />
            
            <!-- 最新评分 -->
            <div class="latest-score" v-if="aiEvaluations.length > 0">
              <div class="score-label">当前评估</div>
              <div 
                class="score-value" 
                :class="aiEvaluations[aiEvaluations.length - 1].score >= 0 ? 'positive' : 'negative'"
              >
                {{ aiEvaluations[aiEvaluations.length - 1].score >= 0 ? '+' : '' }}{{ aiEvaluations[aiEvaluations.length - 1].score.toFixed(0) }}
                <span class="score-desc">
                  {{ aiEvaluations[aiEvaluations.length - 1].score > 500 ? '红大优' : 
                     aiEvaluations[aiEvaluations.length - 1].score > 200 ? '红优' :
                     aiEvaluations[aiEvaluations.length - 1].score > 50 ? '红略优' :
                     aiEvaluations[aiEvaluations.length - 1].score < -500 ? '黑大优' :
                     aiEvaluations[aiEvaluations.length - 1].score < -200 ? '黑优' :
                     aiEvaluations[aiEvaluations.length - 1].score < -50 ? '黑略优' : '均势' }}
                </span>
              </div>
            </div>
            
            <!-- 评估历史列表（简化版） -->
            <div class="eval-history" v-if="aiEvaluations.length > 1">
              <div class="history-label">近期走势</div>
              <div class="history-list">
                <div 
                  v-for="(evalItem, index) in [...aiEvaluations].reverse().slice(0, 5)" 
                  :key="index" 
                  class="history-item"
                >
                  <span class="history-turn">T{{ evalItem.turn }}</span>
                  <span :class="['history-player', evalItem.player]">
                    {{ evalItem.player === 'red' ? '红' : '黑' }}
                  </span>
                  <span 
                    class="history-score"
                    :class="evalItem.score >= 0 ? 'positive' : 'negative'"
                  >
                    {{ evalItem.score >= 0 ? '+' : '' }}{{ evalItem.score.toFixed(0) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div v-if="aiEvaluations.length === 0" class="empty-eval">
              等待AI评估...
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <GameOver
      v-if="isGameEnded"
      :winner="winner"
      @new-game="newGame"
    />
    
    <GameAlert
      :show="showAlert"
      :type="alertType"
      :player="alertPlayer"
    />
  </div>
</template>
