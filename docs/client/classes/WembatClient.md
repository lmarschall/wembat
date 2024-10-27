[@wembat/client](../exports.md) / WembatClient

# Class: WembatClient

Represents a client for interacting with the Wembat API.

## Constructors

### new WembatClient(applicationToken)

> **new WembatClient**(`applicationToken`): [`WembatClient`](WembatClient.md)

Creates an instance of WembatClient.

#### Parameters

• **applicationToken**: `string`

#### Returns

[`WembatClient`](WembatClient.md)

#### Source

[index.ts:26](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L26)

## Properties

### #apiUrl

> **`private`** **`readonly`** **#apiUrl**: `string`

#### Source

[index.ts:16](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L16)

***

### #axiosClient

> **`private`** **`readonly`** **#axiosClient**: `AxiosInstance`

#### Source

[index.ts:17](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L17)

***

### #jwt

> **`private`** **#jwt**: `undefined` \| `string`

#### Source

[index.ts:18](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L18)

***

### #privateKey

> **`private`** **#privateKey**: `undefined` \| `CryptoKey`

#### Source

[index.ts:20](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L20)

***

### #publicKey

> **`private`** **#publicKey**: `undefined` \| `CryptoKey`

#### Source

[index.ts:19](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L19)

## Methods

### decrypt()

> **decrypt**(`wembatMessage`, `publicKey`): `Promise`\<`WembatActionResponse`\<`WembatMessage`\>\>

Decrypts a Wembat message using the provided public key.

#### Parameters

• **wembatMessage**: `WembatMessage`

The Wembat message to decrypt.

• **publicKey**: `CryptoKey`

The public key used for decryption.

#### Returns

`Promise`\<`WembatActionResponse`\<`WembatMessage`\>\>

A promise that resolves to a WembatActionResponse containing the decrypted Wembat message.

#### Source

[index.ts:67](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L67)

***

### encrypt()

> **encrypt**(`wembatMessage`, `publicKey`): `Promise`\<`WembatActionResponse`\<`WembatMessage`\>\>

Encrypts a Wembat message using the provided public key.

#### Parameters

• **wembatMessage**: `WembatMessage`

The Wembat message to encrypt.

• **publicKey**: `CryptoKey`

The public key to use for encryption.

#### Returns

`Promise`\<`WembatActionResponse`\<`WembatMessage`\>\>

A promise that resolves to a WembatActionResponse containing the encrypted Wembat message.

#### Source

[index.ts:56](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L56)

***

### getCryptoPublicKey()

> **getCryptoPublicKey**(): `undefined` \| `CryptoKey`

Retrieves the crypto public key.

#### Returns

`undefined` \| `CryptoKey`

The crypto public key.

#### Source

[index.ts:108](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L108)

***

### login()

> **login**(`userMail`): `Promise`\<`WembatActionResponse`\<`WembatLoginResult`\>\>

Logs in the user with the specified email address.

#### Parameters

• **userMail**: `string`

The email address of the user.

#### Returns

`Promise`\<`WembatActionResponse`\<`WembatLoginResult`\>\>

A promise that resolves to a WembatActionResponse containing the login result.

#### Source

[index.ts:86](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L86)

***

### onboard()

> **onboard**(): `Promise`\<`WembatActionResponse`\<`WembatRegisterResult`\>\>

#### Returns

`Promise`\<`WembatActionResponse`\<`WembatRegisterResult`\>\>

#### Source

[index.ts:96](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L96)

***

### register()

> **register**(`userMail`): `Promise`\<`WembatActionResponse`\<`WembatRegisterResult`\>\>

Registers a user with the provided email address.

#### Parameters

• **userMail**: `string`

The email address of the user to register.

#### Returns

`Promise`\<`WembatActionResponse`\<`WembatRegisterResult`\>\>

A Promise that resolves to a WembatActionResponse containing the registration result.

#### Source

[index.ts:77](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L77)

***

### token()

> **token**(): `Promise`\<`WembatActionResponse`\<`WembatToken`\>\>

#### Returns

`Promise`\<`WembatActionResponse`\<`WembatToken`\>\>

#### Source

[index.ts:100](https://github.com/lmarschall/wembat/blob/aa738ce/src/index.ts#L100)

***

Generated using [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) and [TypeDoc](https://typedoc.org/)
