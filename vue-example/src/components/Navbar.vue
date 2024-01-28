<template>
  <nav id="navbar-top" class="navbar px-3 sticky-top">
    <div class="container">
      <a class="navbar-brand" href="/">
        <img
          src="./../assets/logo.png"
          alt=""
          width="24"
          height="24"
          class="d-inline-block align-text-top"
        />
        Wembat Encryption Demo
      </a>
    </div>
  </nav>
</template>

<script setup lang="ts"></script>

<style scoped>
a.nav-link {
  color: var(--color-white-blue);
  border-radius: 0;
}
a.nav-link.active {
  color: var(--color-white-blue);
  border-bottom: 2px solid var(--color-light-blue);
  background-color: var(--color-dark-blue);
}
a.navbar-brand {
  color: var(--color-light-blue);
}
nav#navbar-top {
  background-color: var(--color-dark-blue);
  color: var(--color-white-blue);
}
</style>
