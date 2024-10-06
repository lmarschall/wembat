<script setup lang="ts">
import { onMounted, ref } from 'vue'

import ApplicationsItem from '../components/ApplicationsItem.vue'
import UsersItem from '../components/UsersItem.vue'

import { useTokenStore } from '@/stores/token';

const tokenStore = useTokenStore();

const props = defineProps({
  token: String
})

function saveToken() {
  if (props.token !== undefined)
  {
    tokenStore.token = props.token;
  }
}

saveToken();

onMounted(async () => {
  console.log("dashboard view mounted");
});
</script>

<template>
  <div class="d-flex flex-column flex-lg-row h-100">
    <div class="flex-shrink-1">
      <nav class="navbar navbar-expand-lg bg-body-tertiary h-100 d-flex flex-row flex-lg-column">
        <button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#navbarOffcanvasLg" aria-controls="navbarOffcanvasLg" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <a class="navbar-brand" href="#">Offcanvas navbar</a>
        <div></div>
        <div class="offcanvas offcanvas-start h-100" tabindex="-1" id="navbarOffcanvasLg" aria-labelledby="navbarOffcanvasLgLabel">
          <ul class="nav nav-pills d-flex flex-column h-100">
            <li class="nav-item" role="presentation">
              <button class="nav-link active" id="pills-application-tab" data-bs-toggle="pill" data-bs-target="#pills-applications" type="button" role="tab" aria-controls="pills-applications" aria-selected="true">
                <i class="bi bi-laptop-fill"></i>
                Applications
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link" id="pills-users-tab" data-bs-toggle="pill" data-bs-target="#pills-users" type="button" role="tab" aria-controls="pills-users" aria-selected="true">
                <i class="bi bi-people-fill"></i>
                Users
              </button>
            </li>
            <li class="flex-grow-1">
            </li>
            <!-- <li class="nav-item">
              <a class="nav-link" href="#">Link</a>
            </li>
            <li class="nav-item">
              <a class="nav-link disabled" aria-disabled="true">Disabled</a>
            </li> -->
          </ul>
        </div>
      </nav>
    </div>
    <div class="flex-grow-1">
      <div class="tab-content" id="pills-tabContent">
        <div class="tab-pane fade show active" id="pills-applications" role="tabpanel" aria-labelledby="pills-application-tab" tabindex="0">
          <ApplicationsItem />
        </div>
        <!-- <div class="tab-pane fade" id="pills-users" role="tabpanel" aria-labelledby="pills-users-tab" tabindex="1">
          <UsersItem :userModel="userModel" :msg="msg" />
        </div> -->
      </div>
    </div>
  </div>
</template>