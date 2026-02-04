<template>
  <div>
    <div class="container">
      <div class="d-flex justify-content-center align-items-center" style="height: 80vh;">
        <div class="card border-0">
          <div class="card-body">
            <div class="col-12 text-start">
              <h1 class="lower">
                WebAuthn Encryption
              </h1>
              <p class="lead">
                We are using the PRF extension of WebAuthn to encrypt your private data.
              </p>
              <div class="card">
                <div class="card-body body-info">
                  <p class="card-text">
                  Enter your message and encrypt it with one device, link a new device, onboard this device
                  and logout. Login with the onboarded device and decrypt the same message.
                </p>
                </div>
              </div>
            </div>
            <div class="form-floating mb-3 mt-3">
              <input
                type="text"
                class="form-control"
                id="messageInput"
                placeholder="example@mail.com"
                v-model="message"
              />
              <label for="messageInput">Encrypted Message</label>
            </div>
            <div class="col-12 d-flex flex-column flex-md-row justify-content-evenly">
              <button
                class="btn btn-primary mx-auto"
                type="submit"
                @click="encryptMessage()"
                :disabled="loading"
              >
                Encrypt Message
              </button>

              <button
                class="btn btn-secondary mx-auto"
                type="submit"
                @click="link()"
                :disabled="loading"
              >
                Link Device
              </button>

              <button
                class="btn btn-secondary mx-auto"
                type="submit"
                @click="onboard()"
                :disabled="loading"
              >
                Onboard Device
              </button>

              <button
                class="btn btn-secondary mx-auto"
                type="submit"
                @click="token()"
                :disabled="loading"
              >
                Get Token
              </button>

              <button
                class="btn btn-warning mx-auto"
                type="submit"
                @click="logout()"
                :disabled="loading"
              >
                Logout
              </button>
            </div>
            <div class="col-12 mt-5">
              <div id="liveAlertPlaceholder"></div>
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

import { useRouter } from "vue-router";
import { ref, onMounted, inject } from "vue";
import { WembatClient, WembatMessage, WembatRegisterResult } from "@wembat/client";

import KeyService from "../services/key";
import MessageService from "../services/message";

const loading = ref(false);
const router = useRouter();
const message = ref("" as string);
const wembatClient: WembatClient = inject('wembatClient') as WembatClient

onMounted(async () => {
  if(KeyService.hasKey()) {
    await decryptMessage();
  } else {
    router.push("/login");
  }
})

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

async function logout() {
  KeyService.resetKey();
  router.push("/login");
}

async function onboard() {
  const onboardResponse = await wembatClient.onboard();
  if(onboardResponse.success) {
    appendAlert("Onboarding successful", "success");
  } else {
    const errorResult = onboardResponse.error;
    appendAlert(errorResult.error, "danger");
  }
}

async function link() {
  const linkResponse = await wembatClient.link();
  if(linkResponse.success) {
    appendAlert("Linking successful", "success");
  } else {
    const errorResult = linkResponse.error;
    appendAlert(errorResult.error, "danger");
  }
}

async function token() {
  const tokenResponse = await wembatClient.token();
  console.log("tokenResponse", tokenResponse);
  if(tokenResponse.success) {
    appendAlert("Token received", "success");
  } else {
    const errorResult = tokenResponse.error;
    appendAlert(errorResult.error, "danger");
  }
}

async function encryptMessage() {
  const encryptMessage : WembatMessage = {
    iv: "",
    message: message.value,
    encrypted: ""
  } 

  const publicKey = KeyService.getKey();
  const encryptionResult = await wembatClient.encrypt(encryptMessage, publicKey);
  if(encryptionResult.success) {
    MessageService.setEncryptedMessage(JSON.stringify(encryptionResult.result));
    appendAlert("Message encrypted", "success");
  } else {
    const errorResult = encryptionResult.error;
    appendAlert(errorResult.error, "danger");
  }
}

async function decryptMessage() {
  const publicKey = KeyService.getKey();
  const encryptedMessage = MessageService.getEncryptedMessage();
  if (encryptedMessage != "") {
    const decryptionResult = await wembatClient.decrypt(JSON.parse(encryptedMessage), publicKey);
    if(decryptionResult.success) {
      message.value = decryptionResult.result.message;
      appendAlert("Message decrypted", "success");
    } else {
      const errorResult = decryptionResult.error;
      appendAlert(errorResult.error, "danger");
    }
  }
}
</script>
