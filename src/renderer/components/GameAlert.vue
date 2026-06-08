<script setup lang="ts">
import { watch, ref } from 'vue'

const props = defineProps<{
  show: boolean
  type: 'check' | 'checkmate' | 'stalemate' | 'chase_lose'
  player: 'red' | 'black'
}>()

const isVisible = ref(false)

watch(() => [props.show, props.type], ([newShow]) => {
  if (newShow) {
    isVisible.value = true
    const duration = props.type === 'check' ? 2000 : 3000
    setTimeout(() => {
      isVisible.value = false
    }, duration)
  }
}, { immediate: false })

function getText() {
  switch (props.type) {
    case 'check': return '将軍！'
    case 'checkmate': return '将死！'
    case 'stalemate': return '困毙！'
    case 'chase_lose': return '长捉判负！'
  }
}

function getIcon() {
  switch (props.type) {
    case 'check': return '⚔️'
    case 'checkmate': return '🏆'
    case 'stalemate': return '👑'
    case 'chase_lose': return '🚫'
  }
}

function getColorClass() {
  switch (props.type) {
    case 'check': return 'check'
    case 'checkmate': return 'checkmate'
    case 'stalemate': return 'stalemate'
    case 'chase_lose': return 'chase_lose'
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="alert-fade">
      <div v-if="isVisible" class="alert-wrapper">
        <div class="alert-container" :class="getColorClass()">
          <div class="alert-icon">{{ getIcon() }}</div>
          <div class="alert-content">
            <div class="alert-text">{{ getText() }}</div>
            <div class="alert-player">{{ player === 'red' ? '红方' : '黑方' }}</div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.alert-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 30px;
  pointer-events: none;
  z-index: 1000;
}

.alert-container {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 28px;
  border-radius: 8px;
  font-weight: bold;
  user-select: none;
}

.alert-container.check {
  background: #fdcb6e;
  color: #2d3436;
  border: 2px solid #f39c12;
}

.alert-container.checkmate {
  background: #e17055;
  color: #fff;
  border: 2px solid #d63031;
}

.alert-container.stalemate {
  background: #74b9ff;
  color: #2d3436;
  border: 2px solid #0984e3;
}

.alert-container.chase_lose {
  background: #a29bfe;
  color: #fff;
  border: 2px solid #6c5ce7;
}

.alert-icon {
  font-size: 28px;
}

.alert-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.alert-text {
  font-family: 'KaiTi', 'STKaiti', 'SimKai', 'Microsoft YaHei', serif;
  font-size: 24px;
  letter-spacing: 4px;
}

.alert-player {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 2px;
}

.alert-fade-enter-active {
  animation: alertIn 0.3s ease-out;
}

.alert-fade-leave-active {
  animation: alertOut 0.3s ease-out forwards;
}

@keyframes alertIn {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes alertOut {
  0% {
    opacity: 1;
    transform: translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateY(-15px);
  }
}
</style>
