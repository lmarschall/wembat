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

[index.ts:29](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L29)

## Properties

### #apiUrl

> **`private`** **`readonly`** **#apiUrl**: `string`

#### Source

[index.ts:19](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L19)

***

### #axiosClient

> **`private`** **`readonly`** **#axiosClient**: `AxiosInstance`

#### Source

[index.ts:20](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L20)

***

### #jwt

> **`private`** **#jwt**: `undefined` \| `string`

#### Source

[index.ts:21](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L21)

***

### #privateKey

> **`private`** **#privateKey**: `undefined` \| `CryptoKey`

#### Source

[index.ts:23](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L23)

***

### #publicKey

> **`private`** **#publicKey**: `undefined` \| `CryptoKey`

#### Source

[index.ts:22](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L22)

## Methods

### decrypt()

> **decrypt**(`wembatMessage`, `publicKey`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatMessage`](../interfaces/WembatMessage.md)\>\>

Decrypts a Wembat message using the provided public key.

#### Parameters

• **wembatMessage**: [`WembatMessage`](../interfaces/WembatMessage.md)

The Wembat message to decrypt.

• **publicKey**: `CryptoKey`

The public key used for decryption.

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatMessage`](../interfaces/WembatMessage.md)\>\>

A promise that resolves to a WembatActionResponse containing the decrypted Wembat message.

#### Source

[index.ts:73](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L73)

***

### encrypt()

> **encrypt**(`wembatMessage`, `publicKey`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatMessage`](../interfaces/WembatMessage.md)\>\>

Encrypts a Wembat message using the provided public key.

#### Parameters

• **wembatMessage**: [`WembatMessage`](../interfaces/WembatMessage.md)

The Wembat message to encrypt.

• **publicKey**: `CryptoKey`

The public key to use for encryption.

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatMessage`](../interfaces/WembatMessage.md)\>\>

A promise that resolves to a WembatActionResponse containing the encrypted Wembat message.

#### Source

[index.ts:62](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L62)

***

### getCryptoPublicKey()

> **getCryptoPublicKey**(): `undefined` \| `CryptoKey`

Retrieves the crypto public key.

#### Returns

`undefined` \| `CryptoKey`

The crypto public key.

#### Source

[index.ts:130](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L130)

***

### link()

> **link**(): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatRegisterResult`](../interfaces/WembatRegisterResult.md)\>\>

Links the new user device to the active wembat session.

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatRegisterResult`](../interfaces/WembatRegisterResult.md)\>\>

A promise that resolves to a WembatActionResponse containing the link result.

#### Source

[index.ts:114](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L114)

***

### login()

> **login**(`userMail`, `autoLogin`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatLoginResult`](../interfaces/WembatLoginResult.md)\>\>

Logs in the user with the specified email address.

#### Parameters

• **userMail**: `string`

The email address of the user.

• **autoLogin**: `boolean`= `false`

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatLoginResult`](../interfaces/WembatLoginResult.md)\>\>

A promise that resolves to a WembatActionResponse containing the login result.

#### Source

[index.ts:92](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L92)

***

### onboard()

> **onboard**(): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatRegisterResult`](../interfaces/WembatRegisterResult.md)\>\>

Onboards the new user device linked to the active wembat session.

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatRegisterResult`](../interfaces/WembatRegisterResult.md)\>\>

A promise that resolves to a WembatActionResponse containing the onboard result.

#### Source

[index.ts:106](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L106)

***

### register()

> **register**(`userMail`, `autoRegister`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatRegisterResult`](../interfaces/WembatRegisterResult.md)\>\>

Registers a user device with the provided email address.

#### Parameters

• **userMail**: `string`

The email address of the user to register.

• **autoRegister**: `boolean`= `false`

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatRegisterResult`](../interfaces/WembatRegisterResult.md)\>\>

A Promise that resolves to a WembatActionResponse containing the registration result.

#### Source

[index.ts:83](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L83)

***

### token()

> **token**(): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatToken`](../interfaces/WembatToken.md)\>\>

Retrieves the token for the current session.

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatToken`](../interfaces/WembatToken.md)\>\>

A promise that resolves to a WembatActionResponse containing the token.

#### Source

[index.ts:122](https://github.com/lmarschall/wembat/blob/65a69c8/src/index.ts#L122)

***

Generated using [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) and [TypeDoc](https://typedoc.org/)
