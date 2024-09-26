<script setup lang="ts">
import TheWelcome from '../components/TheWelcome.vue'

defineProps({
  token: String
})
</script>

<template>
  <div>
    Token {{ token }}
  </div>
  <div class="d-flex flex-column flex-lg-row h-100">
    <div class="flex-shrink-1">
      <nav class="navbar navbar-expand-lg bg-body-tertiary h-100 d-flex flex-row flex-lg-column">
        <button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#navbarOffcanvasLg" aria-controls="navbarOffcanvasLg" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <a class="navbar-brand" href="#">Offcanvas navbar</a>
        <div></div>
        <div class="offcanvas offcanvas-start h-100" tabindex="-1" id="navbarOffcanvasLg" aria-labelledby="navbarOffcanvasLgLabel">
          <ul class="nav d-flex flex-column h-100">
            <li class="nav-item">
              <a class="nav-link active" aria-current="page" href="#">Active</a>
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#">Link</a>
            </li>
            <li class="flex-grow-1">
            </li>
            <li class="nav-item">
              <a class="nav-link" href="#">Link</a>
            </li>
            <li class="nav-item">
              <a class="nav-link disabled" aria-disabled="true">Disabled</a>
            </li>
          </ul>
        </div>
      </nav>
    </div>
    <div class="flex-grow-1">
      BLOB
    </div>
  </div>
</template>