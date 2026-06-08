<script setup lang="ts">
defineProps<{
  winner: 'red' | 'black' | null
}>()

const emit = defineEmits<{
  (e: 'newGame'): void
}>()
</script>

<template>
  <div class="game-over-overlay">
    <div class="game-over-content">
      <div class="game-over-title">
        <span v-if="winner === 'red'" class="text-red-500">红方胜利</span>
        <span v-else-if="winner === 'black'" class="text-gray-300">黑方胜利</span>
        <span v-else class="text-yellow-400">平局</span>
      </div>
      <div class="game-over-subtitle">
        游戏结束
      </div>
      <button 
        class="btn btn-primary"
        @click="emit('newGame')"
      >
        再来一局
      </button>
    </div>
  </div>
</template>
