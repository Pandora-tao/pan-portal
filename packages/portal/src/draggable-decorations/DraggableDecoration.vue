<script setup lang="ts">
import type { DraggableDecorationDefinition } from './types'

defineProps<{
  decoration: DraggableDecorationDefinition
}>()
</script>

<template>
  <img :src="decoration.image" alt="" draggable="false" />
</template>
