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
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  position: relative;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {
  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
