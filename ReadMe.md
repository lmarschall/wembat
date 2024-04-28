# Wembat

Based on the awesome work of [SimpleWebAuthn](https://github.com/MasterKale/SimpleWebAuthn)

### This client library can be used to authenticate users and encrypt data locally via the largeBlob extension of webauthn.

<!-- ## Syntax Highlighting

VitePress provides Syntax Highlighting powered by [Shikiji](https://github.com/antfu/shikiji), with additional features like line-highlighting: -->


## Start Wembat Backend
```bash
git clone https://github.com/lmarschall/wembat.git

cd ./backend

# create .env from .env.template

docker compose up -d --build && docker compose logs -f
```

## Install Wembat Client
```bash
npm install @wembat/client
```


## Create Wembat Client

```ts{4}
import { WembatClient } from "@wembat/client";

const wembatClient = new WembatClient("http://localhost:8080");
```

## Register User

> The following function must be triggered by a user interaction, like a button click for example.

```ts{4}
async function register() {
  const registerResponse = await wembatClient.register(uId);

  if (registerResponse.success) {
    const verified = registerResponse.result;
  }
}
```

## Login User

> The following function must be triggered by a user interaction, like a button click for example.

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

<!-- ## Custom Containers

**Input**

```md
::: info
This is an info box.
:::

::: tip
This is a tip.
:::

::: warning
This is a warning.
:::

::: danger
This is a dangerous warning.
:::

::: details
This is a details block.
:::
```

**Output**

::: info
This is an info box.
:::

::: tip
This is a tip.
:::

::: warning
This is a warning.
:::

::: danger
This is a dangerous warning.
:::

::: details
This is a details block.
:::

## More

Check out the documentation for the [full list of markdown extensions](https://vitepress.dev/guide/markdown). -->
