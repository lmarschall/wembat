# Getting Started

This page shows the first steps to install the Wembat Client package and use the Wembat Actions to authenticate users and encrypt data.

## Setup Wembat Client

1. Install the Wembat Client npm package
```bash
npm install @wembat/client
```

2. Create a Wembat Client instance with you application token create in the setup section https://wembat.dev/setup
```ts{4}
import { WembatClient } from "@wembat/client";

const wembatClient = new WembatClient(APPTOKEN);
```

## Authenticate User

::: warning
The following functions must be triggered by a user interaction, a button click for example.
:::

1. Register the user in your application by calling the Register Action with a user unique identifier as string

```ts{4}
async function register() {
  const registerResponse = await wembatClient.register(userId);

  if (registerResponse.success) {
    const verified = registerResponse.result;
  }
}
```

2. Login the user in your application by calling the Login Action with the given user unique identifier as string

```ts{4}
async function login() {
  const loginResponse = await wembatClient.login(uId);

  if (loginResponse.success) {
    const loginResult = loginResponse.result;

    if (loginResult.verified) {
      const token = loginResult.jwt;
    }
  }
}
```