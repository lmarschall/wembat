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
                WebAuthn Encryption
              </h1>
              <p>
                We are using the largeBlob extenstion of WebAuthn to encrypt your message. <br />
                Enter your message and with the saved private key in the authenticator <br />
                and the publicly stored public key we derive an encryption key.
              </p>
            </div>
            <div class="form-floating mb-3">
              <input
                type="text"
                class="form-control"
                id="messageInput"
                placeholder="example@mail.com"
                v-model="message"
              />
              <label for="messageInput">Encrypted Message</label>
            </div>
            <div class="col-12">
              <div id="liveAlertPlaceholder"></div>
            </div>
            <div class="col-12">
              <button
                class="btn btn-primary"
                type="submit"
                @click="encryptMessage()"
                :disabled="loading"
              >
                Encrypt Message
              </button>
            </div>
            <div class="col-12">
              <button
                class="btn btn-link"
                type="submit"
                @click="logout()"
                :disabled="loading"
              >
                Logout
              </button>
            </div>
            <div class="col-12">
              <button
                class="btn btn-link"
                type="submit"
                @click="link()"
                :disabled="loading"
              >
                Link Device
              </button>
            </div>
            <div class="col-12">
              <button
                class="btn btn-link"
                type="submit"
                @click="onboard()"
                :disabled="loading"
              >
                Onboard Device
              </button>
            </div>
            <div class="col-12">
              <button
                class="btn btn-link"
                type="submit"
                @click="token()"
                :disabled="loading"
              >
                Get Token
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

import { useRouter } from "vue-router";
import { ref, onMounted, inject } from "vue";
import { WembatClient, WembatMessage, WembatRegisterResult } from "@wembat/client";

import TokenService from "../services/token";
import MessageService from "../services/message";
import axios from "axios";

const loading = ref(false);
const router = useRouter();
const message = ref("" as string);
const wembatClient: WembatClient = inject('wembatClient') as WembatClient

onMounted(async () => {
  if(TokenService.hasToken() && wembatClient.getCryptoPublicKey() !== undefined) {
    await decryptMessage();
  } else {
    router.push("/login");
  }
  await devices();
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
  TokenService.resetToken();
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

  const publicKey = wembatClient.getCryptoPublicKey();
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
  // TODO make functions only private accessable
  const publicKey = wembatClient.getCryptoPublicKey();
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

function getApiUrl() {
  const appToken = import.meta.env.VITE_APP_TOKEN || "";
  const parts = appToken.split('.');
  
  if (parts.length !== 3) {
    throw new Error('Invalid JWT token format');
  }

  // Decode the payload (second part of the token)
  const payloadBase64 = parts[1];
  const payloadJson = atob(payloadBase64); // Decode from Base64 to JSON string
  const payload = JSON.parse(payloadJson); // Parse JSON string to an object
  
  console.log('Decoded token:', payload);

  const apiUrl = payload.iss || "";
  return apiUrl;
}

async function devices() {
  try {
    const apiUrl = getApiUrl();
    const token = TokenService.getToken();
    // Sende GET-Request an /api/devices mit Authorization-Header
    const response = await axios.get(apiUrl + "/api/device/list", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log("Devices:", response.data);
    appendAlert(response.data.length + " User Devices loaded", "success");
  } catch (error: any) {
    console.error(error);
    appendAlert("Error loading devices", "danger");
  }
}
</script>
