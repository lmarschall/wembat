<script setup lang="ts">
defineProps<{
  msg: string,
  userModel: {
    name: string,
    description: string,
    status: string,
    date: string,
  },
}>()
</script>

<template>
  <div class="">
    {{ msg }}
    {{ userModel.name }}
    {{ userModel.description }}
    {{ userModel.status }}
    {{ userModel.date }}
  </div>
</template>

<style scoped>
</style>
