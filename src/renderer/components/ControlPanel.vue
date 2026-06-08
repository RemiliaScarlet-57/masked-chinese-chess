<script setup lang="ts">
defineProps<{
 gameMode: 'human-vs-human' | 'human-vs-ai' | 'ai-vs-ai'
 aiDepth: number
 isAIThinking: boolean
 statusMessage: string
 currentPlayer: 'red' | 'black'
 isInCheck: boolean
}>()

const emit = defineEmits<{
 (e: 'newGame'): void
 (e: 'setGameMode', mode: 'human-vs-human' | 'human-vs-ai' | 'ai-vs-ai'): void
 (e: 'setAIDepth', depth: number): void
 (e: 'exportGameAsJSON'): void
 (e: 'exportGameAsText'): void
}>()
</script>

<template>
  <div class="control-panel">
    <h2 class="panel-title">控制面板</h2>
    
    <div class="panel-section">
      <button 
        class="btn btn-primary w-full btn-glow"
        @click="emit('newGame')"
      >
        🎮 新游戏
      </button>
    </div>
    
    <div class="panel-section">
      <h3 class="section-title">导出棋谱</h3>
      <div class="export-buttons">
        <button 
          class="btn w-full btn-secondary"
          @click="emit('exportGameAsJSON')"
        >
          📄 JSON格式
        </button>
        <button 
          class="btn w-full btn-secondary"
          @click="emit('exportGameAsText')"
        >
          📝 文本格式
        </button>
      </div>
    </div>
    
    <div class="panel-section">
      <h3 class="section-title">游戏模式</h3>
      <div class="mode-buttons">
        <button 
          class="btn w-full mode-btn"
          :class="gameMode === 'human-vs-human' ? 'btn-primary' : 'btn-secondary'"
          @click="emit('setGameMode', 'human-vs-human')"
        >
          👥 双人对战
        </button>
        <button 
          class="btn w-full mode-btn"
          :class="gameMode === 'human-vs-ai' ? 'btn-primary' : 'btn-secondary'"
          @click="emit('setGameMode', 'human-vs-ai')"
        >
          🤖 人机对战
        </button>
        <button 
          class="btn w-full mode-btn"
          :class="gameMode === 'ai-vs-ai' ? 'btn-primary' : 'btn-secondary'"
          @click="emit('setGameMode', 'ai-vs-ai')"
        >
          🎯 AI对战
        </button>
      </div>
    </div>
    
    <div class="panel-section" v-if="gameMode !== 'human-vs-human'">
      <h3 class="section-title">AI难度</h3>
      <input 
        type="range" 
        min="2" 
        max="8" 
        :value="aiDepth"
        @input="emit('setAIDepth', Number(($event.target as HTMLInputElement).value))"
        class="slider"
      />
      <div class="slider-labels">
        <span>简单 (2)</span>
        <span class="slider-value">{{ aiDepth }}</span>
        <span>困难 (8)</span>
      </div>
    </div>
    
    <div class="panel-section">
      <h3 class="section-title">当前状态</h3>
      <div class="status-card">
        <div class="player-indicator">
          <div 
            class="player-dot"
            :class="currentPlayer === 'red' ? 'player-red' : 'player-black'"
          ></div>
          <span class="player-text" :class="{'check-warning': isInCheck}">
            {{ currentPlayer === 'red' ? '红方' : '黑方' }}回合
          </span>
        </div>
        <div v-if="isInCheck" class="check-alert">
          ⚠️ 被将军！
        </div>
        <div v-if="isAIThinking" class="ai-thinking">
          <div class="spinner"></div>
          <span>AI思考中...</span>
        </div>
      </div>
    </div>
    
    <div v-if="statusMessage" class="panel-section">
      <h3 class="section-title">最近操作</h3>
      <div class="message-card">
        {{ statusMessage }}
      </div>
    </div>
    
    <div class="panel-section help-section">
      <h3 class="section-title">游戏说明</h3>
      <ul class="help-list">
        <li>🎯 点击己方棋子选中</li>
        <li>✨ 点击绿色圆点移动</li>
        <li>❓ 暗子：按初始位置规则走</li>
        <li>♟️ 明子：按兵种规则走</li>
        <li>🔓 暗子走完后翻开</li>
        <li>🛡️ 被将军必须应对</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.control-panel {
  background: #4a4a4a;
  border-radius: 8px;
  padding: 24px;
  color: #fff;
  border: 2px solid #636e72;
  width: 280px;
}

.panel-title {
  font-size: 20px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
  color: #ffeaa7;
}

.panel-section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 10px;
  color: #b2bec3;
  letter-spacing: 0.5px;
}

.mode-buttons, .export-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #636e72;
  outline: none;
  -webkit-appearance: none;
  cursor: pointer;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #00b894;
  cursor: pointer;
  border: 2px solid #00cec9;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  margin-top: 6px;
  color: #b2bec3;
}

.slider-value {
  font-weight: bold;
  color: #00b894;
}

.status-card, .message-card {
  background: #636e72;
  border-radius: 6px;
  padding: 14px;
}

.player-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.player-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
}

.player-dot.player-red {
  background: #d63031;
  border: 2px solid #b33939;
}

.player-dot.player-black {
  background: #2d3436;
  border: 2px solid #1e272e;
}

.player-text {
  font-weight: 500;
}

.player-text.check-warning {
  color: #e17055;
  font-weight: bold;
}

.check-alert {
  margin-top: 8px;
  color: #e17055;
  font-weight: bold;
}

.ai-thinking {
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #00b894;
  font-weight: 500;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 3px solid #00cec9;
  border-top-color: #00b894;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.message-card {
  font-size: 14px;
  line-height: 1.5;
}

.help-section {
  padding-top: 16px;
  border-top: 2px solid #636e72;
  margin-bottom: 0;
}

.help-list {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 12px;
  color: #b2bec3;
}
</style>
