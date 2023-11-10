<template>
  <div>
    <div class="container">
      <div class="d-flex justify-content-center align-items-center" style="height: 80vh;">
        <div class="card text-center border-0">
          <div class="card-body">
            <div class="col-12">
              <h3>
                <img
                  src="./../assets/key.svg"
                  class="img-fluid"
                  height="48"
                  width="48"
                  alt="..."
                />
                WebAuthn Encryption
              </h3>
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
import WebCryptoService from "../services/crypto";
import MessageService from "../services/message";
import TokenService from "../services/token";

import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
const message = ref("" as string);
const loading = ref(false);
const router = useRouter();

onMounted(async () => {
  if(TokenService.getToken()) {
    await decryptMessage();
  } else {
    router.push("/login");
  }
})

async function encryptMessage() {
  const encryptedString = await WebCryptoService.encrypt(message.value);
  MessageService.setEncryptedMessage(encryptedString);
  console.log(encryptedString);
  router.push("/login");
}

async function decryptMessage() {
  await WebCryptoService.loadCryptoPublicKey();
  await WebCryptoService.deriveEncryptionKey();
  console.log(WebCryptoService.getCryptoPrivateKey());
  console.log(WebCryptoService.getCryptoPublicKey());
  const encryptedMessage = MessageService.getEncryptedMessage() as string;
  if (encryptedMessage != "")
    message.value = await WebCryptoService.decrypt(encryptedMessage);
}
</script>
