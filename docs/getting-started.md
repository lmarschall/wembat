# Getting Started

This page shows the first steps to install the Wembat Client package and use the Wembat Actions to authenticate users and encrypt data.

## Setup Wembat Client

1. Install the Wembat Client npm package
```bash
npm install @wembat/client
```

2. Optionally - Install the npm package with CDN
```html
<script src="https://cdn.jsdelivr.net/npm/@wembat/client/dist/wembat-client.umd.min.js"></script>
```

3. Create a Wembat Client instance with your application token created in the setup section https://wembat.dev/setup
```ts{3}
import { WembatClient } from "@wembat/client";

const wembatClient = new WembatClient(APPLICATION_TOKEN);
```

## Authenticate User

::: warning
The following functions must be triggered by a user interaction, a button click for example.
:::

1. Register the user in your application by calling the Register Action with a user unique identifier as string

```ts{2}
async function register() {
  const registerResponse = await wembatClient.register(userId);

  if (registerResponse.success) {
    const verified = registerResponse.result;
  }
}
```

2. Login the user in your application by calling the Login Action with the given user unique identifier as string

```ts{2}
async function login() {
  const loginResponse = await wembatClient.login(uId);

  if (loginResponse.success) {
    const loginResult = loginResponse.result;

    if (loginResult.verified) {
      const token = loginResult.token;
    }
  }
}
```

## Encrypt Data

```ts{2-6,10,14}
async function encryptMessage() {
  const encryptMessage : WembatMessage = {
    iv: "",
    message: "This message will be encrypted",
    encrypted: ""
  }

  // sender side
  const publicKey = wembatClient.getCryptoPublicKey();
  const encryptionResult = await wembatClient.encrypt(encryptMessage, publicKey);

  // receiver side
  const publicKey = wembatClient.getCryptoPublicKey();
  const decryptionResult = await wembatClient.decrypt(encryptedMessage, publicKey);
}
```

## Onboard Device

::: info
Onboarding a new device enables you to authenticate and encrypt data with multiple devices. The onboard process can only be started in an active authenticated session. The device to onboard your credentials to must be registered at first hand.
:::

```ts{2}
async function onboard() {
  const onboardResponse = await wembatClient.onboard();
  if(onboardResponse.success) {
    appendAlert("Onboarding successful", "success");
  } else {
    const errorResult = onboardResponse.error;
    appendAlert(errorResult.error, "danger");
  }
}
```