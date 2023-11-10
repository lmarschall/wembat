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
        WebAuthn LargeBlob Encryption Example
      </a>
      <!-- <ul class="nav nav-pills">
        <li class="nav-item">
          Login
          <router-link
            v-bind:to="{ name: 'Login' }"
            class="nav-link"
            aria-label="Login"
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-person-circle" viewBox="0 0 16 16">
              <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
              <path fill-rule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
            </svg></router-link
          >
        </li>
      </ul> -->
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
