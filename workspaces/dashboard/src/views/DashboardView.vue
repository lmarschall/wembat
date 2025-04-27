<script setup lang="ts">
import { onMounted, ref } from 'vue'

import ApplicationsItem from '@/components/ApplicationsItem.vue'

import { useTokenStore } from '@/stores/token';
import { Toast } from "bootstrap";

import { emitter } from '@/services/wembat';

const toastBody = ref("");
const isError = ref(false);

emitter.on('applicationSuccess', OnWembatApplicationSuccess);
emitter.on('applicationError', OnWembatApplicationError);

const tokenStore = useTokenStore();

const props = defineProps({
  token: String
})

function OnWembatApplicationSuccess(event: string) {
  console.log("event: ", event);
  toastBody.value = event;
  isError.value = false;
  const toastLiveExample = document.getElementById('liveToast')
  const toastBootstrap = Toast.getOrCreateInstance(toastLiveExample);
  toastBootstrap.show();
}

function OnWembatApplicationError(event: string) {
  console.log("event: ", event);
  toastBody.value = event;
  isError.value = true;
  const toastLiveExample = document.getElementById('liveToast')
  const toastBootstrap = Toast.getOrCreateInstance(toastLiveExample);
  toastBootstrap.show();
}

function saveToken() {
  if (props.token !== undefined)
  {
    tokenStore.token = props.token;
    tokenStore.setApiUrl();
  }
}

saveToken();

onMounted(async () => {
  console.log("dashboard view mounted");
});
</script>

<template>
  <div class="d-flex flex-column flex-lg-row h-100 w-100">
    <div class="flex-shrink-1 sidebar">
      <nav class="navbar navbar-expand-lg bg-body-tertiary h-100 d-flex flex-row flex-lg-column">
        <button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#navbarOffcanvasLg" aria-controls="navbarOffcanvasLg" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <a class="navbar-brand w-lg-100 d-flex flex-row" href="#">
          <img src="./../assets/wembat.png" alt="Logo" width="42" height="42" class="d-inline-block align-text-top">
          wembat
        </a>
        <div></div>
        <div class="offcanvas offcanvas-start h-100" tabindex="-1" id="navbarOffcanvasLg" aria-labelledby="navbarOffcanvasLgLabel">
          <ul class="nav nav-pills d-flex flex-column h-100">
            <li class="nav-item" role="presentation">
              <button class="nav-link button-pills d-flex flex-row flex-nowrap active" id="pills-application-tab" data-bs-toggle="pill" data-bs-target="#pills-applications" type="button" role="tab" aria-controls="pills-applications" aria-selected="true">
                <i class="bi bi-laptop-fill"></i>
                Applications
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button class="nav-link button-pills d-flex flex-row flex-nowrap" id="pills-users-tab" data-bs-toggle="pill" data-bs-target="#pills-users" type="button" role="tab" aria-controls="pills-users" aria-selected="true">
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
    <div class="flex-grow-1 content">
      <div>
      </div>
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
  <div class="toast-container position-fixed top-0 end-0 p-3">
    <!-- <div id="liveToast" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="toast-header">
        <img src="..." class="rounded me-2" alt="...">
        <strong class="me-auto">Bootstrap</strong>
        <small>11 mins ago</small>
        <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
      <div class="toast-body">
        {{toastBody}}
      </div>
    </div> -->
    <div id="liveToast" :class="{ 'text-bg-success': isError == false, 'text-bg-danger': isError == true }" class="toast align-items-center border-0" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          {{toastBody}}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  </div>
</template>

<style scoped>

.content {
  overflow-x: scroll;
}

a.navbar-brand {
  justify-content: flex-start;
  align-items: center;
  padding: 10px 0px 10px 20px;
  margin: 10px 0px 10px 0px;
}

img.d-inline-block.align-text-top {
  margin: 0px 10px;
}

.d-flex.flex-column.flex-lg-row.h-100 {
  margin: 0 auto;
}

button.navbar-toggler {
  margin: 0px 0px 0px 20px;
}

ul.nav.nav-pills.d-flex.flex-column.h-100 {
  margin: 10px 0px 0px 0px;
}

.nav-link.active {
  background-color: #3e63dd;
}

i.bi {
  margin: 0px 10px;
}

button.button-pills {
  min-width: 200px;
}

div#navbarOffcanvasLg {
  width: fit-content;
}

li.nav-item {
  margin: 0px 10px;
}

@media (min-width: 992px) {  /* Large screens (lg) and above */
  .w-lg-100 {
    width: 100%;
  }
}

</style>