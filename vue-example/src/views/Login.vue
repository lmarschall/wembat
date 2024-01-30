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
                We are using WebAuthn to login our users. <br />
                Please provide a valid email address as your username and login
                via your device credentials.
              </p>
            </div>

            <div class="form-floating mb-3">
              <input
                type="email"
                class="form-control"
                id="floatingInput"
                autocomplete="username webauthn"
                placeholder="example@mail.com"
                v-model="email"
              />
              <label for="floatingInput">Email address</label>
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
import { WembatClient, LoginResult, ErrorResult, RegisterResult } from "@wembat/client";

import TokenService from "../services/token";

const loading = ref(false);
const router = useRouter();
const email = ref("" as string);
const token = ref("" as string);
const wembatClient: WembatClient = inject('wembatClient') as WembatClient

async function register() {
  loading.value = true;

  const registerResponse = await wembatClient.register(email.value);
  if(registerResponse.success) {
    const verified = registerResponse.result;
  } else  {
    const errorResult = registerResponse.result as ErrorResult;
    alert(errorResult.error);
  }

  loading.value = false;
}

async function login() {
  loading.value = true;

  const loginResponse = await wembatClient.login(email.value);

  if(loginResponse.success) {
    const loginResult: LoginResult = loginResponse.result as LoginResult;

    if (loginResult.verified) {
      console.log("login verified, save token");
      TokenService.setToken(loginResult.jwt);
      router.push("/");
    }
  } else {
    const errorResult = loginResponse.result as ErrorResult;
    alert(errorResult.error);
  }

  loading.value = false;
}
</script>
