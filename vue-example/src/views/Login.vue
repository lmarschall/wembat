<template>
  <div>
    <div
      class="modal fade"
      id="registerModal"
      style="height: 100vh"
      tabindex="-1"
      aria-labelledby="registerModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="registerModalLabel">
              Register new device
            </h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            This email is already registered with a device.<br />
            In order to register this new device please enter the token we have
            sent to your email.<br />
            <div class="form-floating mb-3">
              <input
                type="text"
                class="form-control"
                id="floatingToken"
                placeholder="example@mail.com"
                v-model="token"
              />
              <label for="floatingToken">Token</label>
            </div>
          </div>
          <div class="modal-footer">
            <button
              @click="register()"
              type="button"
              class="btn btn-primary"
              data-bs-dismiss="modal"
            >
              Register
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      class="modal fade"
      id="initModal"
      style="height: 100vh"
      tabindex="-1"
      aria-labelledby="initModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="initModalLabel">
              Init new Credentials
            </h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            We need to create new credentials for this device.<br />
          </div>
          <div class="modal-footer">
            <button
              @click="createBlob()"
              type="button"
              class="btn btn-primary"
              data-bs-dismiss="modal"
            >
              Create
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="container">
      <div class="d-flex justify-content-center align-items-center" style="height: 80vh;">
        <div class="card text-center border-0">
          <div class="card-body">
            <div class="col-12">
              <h3>
                <img
                  src="./../assets/fingerprint.svg"
                  class="img-fluid"
                  height="48"
                  width="48"
                  alt="..."
                />
                WebAuthn Login
              </h3>
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
                v-if="registered"
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
              <button
                v-else
                class="btn btn-primary"
                type="submit"
                @click="register()"
                :disabled="loading"
              >
                <span
                  v-if="loading"
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
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

import { Modal } from "bootstrap";
import { ref, inject } from "vue";
import { useRouter } from "vue-router";
import { WembatClient } from "@wembat/client";

import TokenService from "../services/token";

const loading = ref(false);
const router = useRouter();
const email = ref("" as string);
const token = ref("" as string);
const wembatClient: WembatClient = inject('wembatClient') as WembatClient
const registered = ref(
  localStorage.getItem("deviceRegistered") === "true" ? true : false
);

async function register() {
  loading.value = true;

  const registerResponse = await wembatClient.register(email.value);
  if(registerResponse.success) {
    const verified = registerResponse.result;
    localStorage.setItem("deviceRegistered", "true");
    registered.value = true;
    loading.value = false;
  } else {
      // console.log(err.message);

  //       // check if error came from api or was local
  //       if (err.response) console.log(err.response);

  //       if (
  //         err.message ==
  //         "InvalidStateError: The authenticator was previously registered"
  //       ) {
  //         alert("The device is already registered, proceed to login!");
  //         registered.value = true;
  //       }

  //       if (err.message == "Request failed with status code 500") {
  //         token.value = "";
  //         const registerModal = new Modal(
  //           document.getElementById("registerModal") as HTMLElement,
  //           {
  //             keyboard: false,
  //           }
  //         );
  //         if (registerModal) registerModal.show();
  //       }

  //       loading.value = false;
    }
}

async function login() {
  loading.value = true;

  const loginReadResponse = await wembatClient.loginRead(email.value);

  if(loginReadResponse.success) {

    const loginReadResult: any = loginReadResponse.result;
    const credentials = loginReadResult.credentials;
    const privKey = loginReadResult.privateKey;
    const challengeOptions = loginReadResult.challengeOptions;

    if (wembatClient.getCryptoPrivateKey() === undefined) {
      const initModal = new Modal(
        document.getElementById("initModal") as HTMLElement,
        {
          keyboard: false,
        }
      );
      if (initModal) initModal.show();
      return;
    }

    const loginResponse = await wembatClient.login(challengeOptions, credentials);

    if(loginResponse.success) {
      const loginResult: any = loginResponse.result;

      if (loginResult.verified) {
        console.log("login verified, save token");
        TokenService.setToken(loginResult.jwt);
        router.push("/");
      }
    }

  } else {
    const initModal = new Modal(
      document.getElementById("initModal") as HTMLElement,
      {
        keyboard: false,
      }
    );
    if (initModal) initModal.show();
    return;
  }
}

async function createBlob() {

  const loginWriteResponse = await wembatClient.loginWrite(email.value);
  if(loginWriteResponse.success) {
    const loginWriteResult: any = loginWriteResponse.result;

    const credentials = loginWriteResult.credentials;
    const pubKey = loginWriteResult.publicKey;
  }
}
</script>
