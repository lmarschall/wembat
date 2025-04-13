<template>
  <nav id="navbar-top" class="navbar px-3">
    <div class="container">
      <a class="navbar-brand" href="/">
        Wembat Encryption Demo
      </a>
      <div class="form-check form-switch">
        <input class="form-check-input" type="checkbox" role="switch" @click="toggleTheme()" id="colorSchemeSwitch">
        <label class="form-check-label" for="flexSwitchCheckDefault"> {{ activeTheme }}</label>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">

import { onMounted, ref } from "vue";

const activeTheme = ref("");

onMounted(() => {
  setTheme("auto");

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    const newColorScheme = event.matches ? "dark" : "light";
    setTheme(newColorScheme);
  });
});

const toggleTheme = () => {
  if(activeTheme.value === "dark") {
    setTheme("light")
  } else {
    setTheme("dark");
  }
}

const setTheme = (theme: string) => {
  if (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-bs-theme', 'dark')
    theme = 'dark';
  } else {
    document.documentElement.setAttribute('data-bs-theme', theme)
  }
  activeTheme.value = theme;
}


</script>

<style scoped>
</style>
