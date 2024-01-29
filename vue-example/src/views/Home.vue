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
              <button
                class="btn btn-primary"
                type="submit"
                @click="encryptMessage()"
                :disabled="loading"
              >
                Encrypt Message
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
import { WembatClient, WembatMessage } from "@wembat/client";

import TokenService from "../services/token";
import MessageService from "../services/message";

const loading = ref(false);
const router = useRouter();
const message = ref("" as string);
const wembatClient: WembatClient = inject('wembatClient') as WembatClient

onMounted(async () => {
  if(TokenService.getToken()) {
    await decryptMessage();
  } else {
    router.push("/login");
  }
})

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
    router.push("/login");
  }
}

async function decryptMessage() {
  // TODO make functions only private accessable
  const publicKey = wembatClient.getCryptoPublicKey();
  const encryptedMessage = MessageService.getEncryptedMessage() as string;
  if (encryptedMessage != "") {
    const decryptionResult = await wembatClient.decrypt(JSON.parse(encryptedMessage), publicKey);
    if(decryptionResult.success) message.value = (decryptionResult.result as WembatMessage).message;
  }
}
</script>
