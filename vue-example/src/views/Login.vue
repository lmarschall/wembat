<template>
  <div>
    <div class="container">
      <div class="d-flex justify-content-center align-items-center" style="height: 80vh;">
        <div class="card border-0">
          <div class="card-body">
            <div class="col-12 text-start">
              <h1 class="upper">
                Wembat
              </h1>
              <h1 class="lower">
                WebAuthn Login
              </h1>
              <p>
                We are using WebAuthn to authenticate our users. <br />
                Please provide a valid username and login
                via your device credentials.
              </p>
            </div>

            <div class="form-floating mb-3">
              <input
                type="text"
                id="floatingInput"
                v-model="username"
                class="form-control"
                autocomplete="username webauthn"
                placeholder="placeholder_username"
              />
              <label for="floatingInput">Username</label>
            </div>
            <div class="col-12">
              <div id="liveAlertPlaceholder"></div>
            </div>
            <div class="col-12">
              <button
                class="btn btn-primary"
                type="submit"
                @click="login()"
                :disabled="loading"
              >
                <span
                  v-if="loading"
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                Login
              </button>
            </div>
            <div class="col-12">
              <button
                class="btn btn-link"
                type="submit"
                @click="register()"
                :disabled="loading"
              >
                Register Device
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>

<script setup lang="ts">

import { ref, inject } from "vue";
import { useRouter } from "vue-router";
import { WembatClient } from "@wembat/client";

import TokenService from "../services/token";

const loading = ref(false);
const router = useRouter();
const username = ref("" as string);
const wembatClient: WembatClient = inject('wembatClient') as WembatClient

function appendAlert(message: string, type: string) {
  const alertPlaceholder = document.getElementById('liveAlertPlaceholder')
  const wrapper = document.createElement('div')
  wrapper.innerHTML = [
    `<div class="alert alert-${type} alert-dismissible" role="alert">`,
    `   <div>${message}</div>`,
    '   <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>',
    '</div>'
  ].join('')

  alertPlaceholder.append(wrapper)
}

async function register() {
  loading.value = true;

  const registerResponse = await wembatClient.register(username.value);

  if(registerResponse.success) {
    const verified = registerResponse.result;
    appendAlert("Registration successful", "success");
  } else  {
    const errorResult = registerResponse.error;
    appendAlert(errorResult.error, "danger");
  }

  loading.value = false;
}

async function login() {
  loading.value = true;

  const loginResponse = await wembatClient.login(username.value);

  if(loginResponse.success) {
    const loginResult = loginResponse.result;

    if (loginResult.verified) {
      appendAlert("Login successful", "success");
      TokenService.setToken(loginResult.token);
      router.push("/");
    }
  } else {
    const errorResult = loginResponse.error;
    appendAlert(errorResult.error, "danger");
  }

  loading.value = false;
}
</script>
