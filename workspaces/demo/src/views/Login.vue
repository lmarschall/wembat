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
                @click="loginWithSso()"
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
const authEndpoint = 'http://localhost:8080/auth/github/login';
const targetOrigin = 'http://localhost:8080';

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
    const currentUser = await loginWithSso();

    console.log(currentUser);
    
    // Wenn wir hier sind, war der Login erfolgreich!
    // statusMsg.textContent = `Hallo ${currentUser.name}! Identität bestätigt.`;
    // statusMsg.style.color = 'green';

    // UI Wechseln: Login weg, Upgrade her
    // btnLogin.style.display = 'none';
    // btnUpgrade.style.display = 'block';
    
    // Optional: Kleiner visueller Hinweis
    alert("Identität bestätigt! Bitte erstellen Sie jetzt Ihren Schlüssel.");

  } catch (err) {
      // statusMsg.textContent = 'Fehler: ' + err.message;
      // statusMsg.style.color = 'red';
  }
}

/**
 * Startet den Login-Prozess in einem Popup.
 * Gibt ein Promise zurück, das resolved, wenn der User erfolgreich eingeloggt ist.
 */
async function loginWithSso() {
  return new Promise((resolve, reject) => {
    // 1. Popup zentriert auf dem Bildschirm berechnen
    const width = 500;
    const height = 600;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;

    // 2. Fenster öffnen (zeigt direkt den Google Login)
    const popup = window.open(
      authEndpoint,
      'WembatSSO',
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
    );

    if (!popup) {
      return reject(new Error('Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.'));
    }

    // 3. Event Listener für die Nachricht vom Popup
    const handleMessage = (event) => {
      // SICHERHEITS-CHECK: Kommt die Nachricht von unserem Backend?
      if (event.origin !== targetOrigin) {
        console.warn('Ignoriere Nachricht von fremder Quelle:', event.origin);
        return;
      }

      // Prüfen, ob es unsere Nachricht ist
      if (event.data?.type === 'WEMBAT_LOGIN_SUCCESS') {
        // Aufräumen
        cleanup();
        
        // Erfolg! User-Daten zurückgeben
        resolve(event.data.user);
      }
    };

    // 4. Timer, um zu prüfen, ob der User das Fenster manuell geschlossen hat
    const timer = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error('Login vom Nutzer abgebrochen (Fenster geschlossen).'));
      }
    }, 1000);

    // Hilfsfunktion zum Aufräumen von Listenern und Timern
    const cleanup = () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(timer);
      if (popup && !popup.closed) popup.close(); // Zur Sicherheit
    };

    // Listener registrieren
    window.addEventListener('message', handleMessage);
  });
}
</script>
