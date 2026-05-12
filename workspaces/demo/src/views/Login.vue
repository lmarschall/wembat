<template>
  <div>
    <div class="container">
      <div class="d-flex justify-content-center align-items-center" style="height: 80vh;">
        <div class="card border-0">
          <div class="card-body">
            <div class="col-12 text-start">
              <h1 class="lower">
                WebAuthn Login
              </h1>
              <p class="lead">
                We are using WebAuthn to authenticate our users.
              </p>
              <div class="card">
                <div class="card-body body-info">
                  <p class="card-text">
                    Please provide a valid username and login
                    via your device credentials.
                </p>
                </div>
              </div>
            </div>

            <div class="form-floating mb-3 mt-3">
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
            <div class="col-12 d-flex flex-column flex-md-row justify-content-evenly">
              <button
                class="btn btn-primary mx-auto"
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
                class="btn btn-secondary mx-auto"
                type="submit"
                @click="register()"
                :disabled="loading"
              >
                Register
              </button>
              <button
                class="btn btn-secondary mx-auto"
                type="submit"
                @click="handleSSOClick()"
                :disabled="loading"
              >
                SSO
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

import { ref, inject } from "vue";
import { useRouter } from "vue-router";
import { WembatClient } from "@wembat/client";

import KeyService from "../services/key";

const loading = ref(false);
const router = useRouter();
const username = ref("" as string);
const wembatClient: WembatClient = inject('wembatClient') as WembatClient
const authEndpoint = 'https://localhost:8080/api/openid/login';
const targetOrigin = 'https://localhost:8080';

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

  const registerResponse = await wembatClient.register(username.value, false);

  if(registerResponse.success) {
    const registerResult = registerResponse.result;
    KeyService.setKey(registerResult.publicKey);
    router.push("/");
  } else  {
    const errorResult = registerResponse.error;
    appendAlert(errorResult.message, "danger");
  }

  loading.value = false;
}

async function login() {
  loading.value = true;

  const loginResponse = await wembatClient.login(username.value);

  if(loginResponse.success) {
    const loginResult = loginResponse.result;

    console.log(loginResult);

    if (loginResult.verified) {
      appendAlert("Login successful", "success");
      KeyService.setKey(loginResult.publicKey);
      router.push("/");
    }
  } else {
    const errorResult = loginResponse.error;
    appendAlert(errorResult.message, "danger");
  }

  loading.value = false;
}

async function handleSSOClick()
{
  try {
    // Das Popup öffnet sich hier
    const currentUser: any = await loginWithSso();

    console.log(currentUser);

    username.value = currentUser.email;

    // const registerResponse = await wembatClient.register(currentUser.email, false);

    // console.log(registerResponse);
    const loginResponse = await wembatClient.login(username.value);
    console.log(loginResponse);

    if(loginResponse.success) {
      const loginResult = loginResponse.result;

      console.log(loginResult);

      if (loginResult.verified) {
        appendAlert("Login successful", "success");
        KeyService.setKey(loginResult.publicKey);
        router.push("/");
      }
    } else {
      const errorResult = loginResponse.error;
      appendAlert(errorResult.message, "danger");
    }

    
    // Wenn wir hier sind, war der Login erfolgreich!
    // statusMsg.textContent = `Hallo ${currentUser.name}! Identität bestätigt.`;
    // statusMsg.style.color = 'green';

    // UI Wechseln: Login weg, Upgrade her
    // btnLogin.style.display = 'none';
    // btnUpgrade.style.display = 'block';
    
    // Optional: Kleiner visueller Hinweis
    // alert("Identität bestätigt! Bitte erstellen Sie jetzt Ihren Schlüssel.");

  } catch (err) {
      // statusMsg.textContent = 'Fehler: ' + err.message;
      // statusMsg.style.color = 'red';
  }
}

/**
 * Startet den Login-Prozess in einem Popup.
 * Gibt ein Promise zurück, das resolved, wenn der User erfolgreich eingeloggt ist.
 */
// Helper to generate a random ID for the session
function generateRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function loginWithSso() {
  // 1. Generate a unique ID for this login attempt
  const requestId = generateRequestId();

  // 2. Prepare the URL (Append the requestId)
  // Assuming authEndpoint is something like "http://localhost:3000/auth/github"
  const urlWithId = new URL(authEndpoint);
  urlWithId.searchParams.set('requestId', requestId);

  return new Promise((resolve, reject) => {
    // 3. Calculate centered popup
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    // 4. Open the window
    const popup = window.open(
      urlWithId.toString(),
      'WembatSSO',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
    );

    if (!popup) {
      return reject(new Error('Popup was blocked. Please allow popups for this site.'));
    }

    // 5. Cleanup Helper
    const cleanup = () => {
      clearInterval(pollTimer);
      clearTimeout(timeoutTimer);
      if (popup && !popup.closed) popup.close();
    };

    // 6. Polling Timer (Checks status every 1 second)
    const pollTimer = setInterval(async () => {
      try {
        console.log(popup);
        // A. Check if user closed the window manually
        // if (popup.closed) {
        //   console.log("Popup closed");
        //   cleanup();
        //   reject(new Error('Login cancelled by user (Window closed).'));
        //   return;
        // }

        // B. Poll the backend
        // We assume your backend has a route: GET /auth/poll?requestId=...
        // Note: You might need to adjust the base URL depending on where your API lives
        const pollUrl = `${new URL(authEndpoint).origin}/api/openid/poll?requestId=${requestId}`;

        console.log(pollUrl);
        
        const response = await fetch(pollUrl);

        console.log(response);
        
        // If 404, it means the ID isn't registered yet or expired
        if (!response.ok) return; 

        const data = await response.json();

        console.log(data);

        // C. Check Status
        if (data.status === 'success') {
          cleanup();
          resolve(data.user); // SUCCESS! We have the user data (and token)
        } 
        else if (data.status === 'error') {
          cleanup();
          reject(new Error(data.message || 'Login failed'));
        }
        // If status is 'pending', we do nothing and wait for the next loop

      } catch (err) {
        // Network errors are ignored (we just try again next second)
        // unless you want to fail fast.
        console.warn("Polling error:", err);
      }
    }, 1000);

    // 7. Safety Timeout (Stop after 2 minutes)
    const timeoutTimer = setTimeout(() => {
      cleanup();
      reject(new Error('Login timed out.'));
    }, 120000);
  });
}
</script>
