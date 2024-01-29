<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup

import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
</script>

<!-- eslint-disable vue/no-multiple-template-root -->
<template>
  <div>
    <Navbar></Navbar>
    <router-view />
    <Footer></Footer>
  </div>
</template>

<style>
#app {
  font-family: 'Chinese Quotes', 'Inter var', 'Inter', ui-sans-serif,
    system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
    'Helvetica Neue', Helvetica, Arial, 'Noto Sans', sans-serif,
    'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji';
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;

  h1 {
    font-weight: 700;
    font-size: 56px;
  }

  p {
    font-weight: 500;
    font-size: 24px;
  }

  .btn.btn-primary {
    border-radius: 20px;
    padding: 0px 20px;
    line-height: 38px;
    font-size: 14px;
    border: none;
  }

  a.navbar-brand {
    font-size: 16px;
    font-weight: 600;
  }

  input.form-control {
    line-height: 24px;
    font-size: 16px;
    font-weight: 600;
  }
}

[data-bs-theme=dark] #app {
  color: #dfe6ee;

  h1.upper {
    color: #a8b1ff;
  }

  h1.lower {
    color: rgba(255, 255, 245, 0.86)
  }

  p {
    color: rgba(235, 235, 245, 0.6)
  }

  .btn.btn-primary {
    background-color: #3e63dd;
  }

  a.navbar-brand {
    color: rgba(255, 255, 245, 0.86)
  }

  input.form-control {
    color: rgba(255, 255, 245, 0.86)
  }
}

[data-bs-theme=light] #app {
  color: rgba(60, 60, 67);

  h1.upper {
    color: #3451b2
  }

  h1.lower {
    color: rgba(60, 60, 67)
  }

  p {
    color: rgba(60, 60, 67, 0.78)
  }

  .btn.btn-primary {
    background-color: #5672cd;
  }

  a.navbar-brand {
    color: rgba(60, 60, 67)
  }

  input.form-control {
    color: rgba(60, 60, 67)
  }
}
</style>
