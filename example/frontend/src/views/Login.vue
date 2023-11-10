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
import WebAuthnService from "../services/webauthn";
import WebCryptoService from "../services/crypto";
import TokenService from "../services/token";

import { Modal } from "bootstrap";

import { ref } from "vue";
import { useRouter } from "vue-router";

const email = ref("" as string);
const router = useRouter();
const token = ref("" as string);
const registered = ref(
  localStorage.getItem("deviceRegistered") === "true" ? true : false
);
const loading = ref(false);

function register() {
  loading.value = true;

  WebAuthnService.requestRegister(email.value).then((response: any) => {
    WebAuthnService.register(response.data, token.value)
      .then((response: any) => {
        console.log(response.data);
        localStorage.setItem("deviceRegistered", "true");
        registered.value = true;
        loading.value = false;
      })
      .catch((err: any) => {
        console.log(err.message);

        // check if error came from api or was local
        if (err.response) console.log(err.response);

        if (
          err.message ==
          "InvalidStateError: The authenticator was previously registered"
        ) {
          alert("The device is already registered, proceed to login!");
          registered.value = true;
        }

        if (err.message == "Request failed with status code 500") {
          token.value = "";
          const registerModal = new Modal(
            document.getElementById("registerModal") as HTMLElement,
            {
              keyboard: false,
            }
          );
          if (registerModal) registerModal.show();
        }

        loading.value = false;
      });
  });
}

function login() {
  loading.value = true;
  WebAuthnService.requestLoginRead(email.value).then((response: any) => {
    WebAuthnService.loginRead(response.data).then(async (response: any) => {
      const credentials = response[0];
      const privKey = response[1];
      const challengeOptions = response[2];

      console.log(credentials.clientExtensionResults.largeBlob);

      if (Object.keys(credentials.clientExtensionResults.largeBlob).length) {
        try {
          WebCryptoService.setCryptoPrivateKey(privKey);
          // WebCryptoService.loadCryptoPublicKey();
          // WebCryptoService.setCryptoPublicKey(keyPair.publicKey);
          // await decryptMessage();
        } catch (error) {
          console.log(error);
        } finally {
          loading.value = false;
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

      WebAuthnService.login(challengeOptions, credentials).then((response: any) => {
        if (response.data.verified) {
          console.log("login verified, save token");
          TokenService.setToken(response.data.jwt);
          router.push("/");
        }
      });
    });
  });
}

function createBlob() {
  WebAuthnService.requestLoginWrite(email.value).then((response: any) => {
    WebAuthnService.loginWrite(response.data).then(async (response: any) => {
      const credentials = response[0];
      const pubKey = response[1];

      console.log(credentials.clientExtensionResults.largeBlob);

      if (credentials.clientExtensionResults.largeBlob.written) {
        console.log("WRITE SUCCESSFUL");
        await WebCryptoService.saveCryptoPublicKey(pubKey);

        // TODO send public key to backend
      }
    });
  });
}
</script>
