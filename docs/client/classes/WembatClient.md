[@wembat/client](../exports.md) / WembatClient

# Class: WembatClient

Represents a client for interacting with the Wembat API.

## Constructors

### new WembatClient(url)

> **new WembatClient**(`url`): [`WembatClient`](WembatClient.md)

Creates an instance of WembatClient.

#### Parameters

• **url**: `string`

The URL of the Backend API.

#### Returns

[`WembatClient`](WembatClient.md)

#### Source

[index.ts:141](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L141)

## Properties

### apiUrl

> **`private`** **`readonly`** **apiUrl**: `string`

#### Source

[index.ts:132](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L132)

***

### axiosClient

> **`private`** **`readonly`** **axiosClient**: `AxiosInstance`

#### Source

[index.ts:133](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L133)

***

### privateKey

> **`private`** **privateKey**: `undefined` \| `CryptoKey`

#### Source

[index.ts:135](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L135)

***

### publicKey

> **`private`** **publicKey**: `undefined` \| `CryptoKey`

#### Source

[index.ts:134](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L134)

## Methods

### ab2str()

> **`private`** **ab2str**(`buf`): `string`

#### Parameters

• **buf**: `ArrayBuffer`

#### Returns

`string`

#### Source

[index.ts:186](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L186)

***

### decrypt()

> **decrypt**(`wembatMessage`, `publicKey`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatMessage`](../interfaces/WembatMessage.md)\>\>

Decrypts a WembatMessage using the provided publicKey.

#### Parameters

• **wembatMessage**: [`WembatMessage`](../interfaces/WembatMessage.md)

The WembatMessage to decrypt.

• **publicKey**: `CryptoKey`

The CryptoKey used for decryption.

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatMessage`](../interfaces/WembatMessage.md)\>\>

A Promise that resolves to a WembatActionResponse containing the decrypted message.

#### Source

[index.ts:502](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L502)

***

### deriveEncryptionKey()

> **`private`** **deriveEncryptionKey**(`publicKey`): `Promise`\<`CryptoKey`\>

#### Parameters

• **publicKey**: `CryptoKey`

#### Returns

`Promise`\<`CryptoKey`\>

#### Source

[index.ts:544](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L544)

***

### encrypt()

> **encrypt**(`wembatMessage`, `publicKey`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatMessage`](../interfaces/WembatMessage.md)\>\>

Encrypts a Wembat message using the provided public key.

#### Parameters

• **wembatMessage**: [`WembatMessage`](../interfaces/WembatMessage.md)

The Wembat message to be encrypted.

• **publicKey**: `CryptoKey`

The public key used for encryption.

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatMessage`](../interfaces/WembatMessage.md)\>\>

A promise that resolves to a WembatActionResponse containing the encrypted message.

#### Source

[index.ts:452](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L452)

***

### getCryptoPrivateKey()

> **`private`** **getCryptoPrivateKey**(): `undefined` \| `CryptoKey`

#### Returns

`undefined` \| `CryptoKey`

#### Source

[index.ts:162](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L162)

***

### getCryptoPublicKey()

> **getCryptoPublicKey**(): `undefined` \| `CryptoKey`

#### Returns

`undefined` \| `CryptoKey`

#### Source

[index.ts:158](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L158)

***

### loadCryptoPrivateKeyFromString()

> **`private`** **loadCryptoPrivateKeyFromString**(`privateKeyString`): `Promise`\<`CryptoKey`\>

#### Parameters

• **privateKeyString**: `string`

#### Returns

`Promise`\<`CryptoKey`\>

#### Source

[index.ts:589](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L589)

***

### loadCryptoPublicKeyFromString()

> **`private`** **loadCryptoPublicKeyFromString**(`pubKeyString`): `Promise`\<`CryptoKey`\>

#### Parameters

• **pubKeyString**: `string`

#### Returns

`Promise`\<`CryptoKey`\>

#### Source

[index.ts:570](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L570)

***

### login()

> **login**(`userUId`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatLoginResult`](../interfaces/WembatLoginResult.md)\>\>

Logs in a user with the provided user ID.

#### Parameters

• **userUId**: `string`

The user ID.

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatLoginResult`](../interfaces/WembatLoginResult.md)\>\>

A promise that resolves to a `WembatActionResponse` containing the login result.

#### Throws

An error if WebAuthn is not supported on the browser or if the Axios client is undefined.

#### Source

[index.ts:282](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L282)

***

### register()

> **register**(`userUId`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatRegisterResult`](../interfaces/WembatRegisterResult.md)\>\>

Registers a user with the specified user ID.

#### Parameters

• **userUId**: `string`

The user ID to register.

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\<[`WembatRegisterResult`](../interfaces/WembatRegisterResult.md)\>\>

A promise that resolves to a `WembatActionResponse` containing the registration result.

#### Source

[index.ts:196](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L196)

***

### saveCryptoKeyAsString()

> **`private`** **saveCryptoKeyAsString**(`cryptoKey`): `Promise`\<`string`\>

#### Parameters

• **cryptoKey**: `CryptoKey`

#### Returns

`Promise`\<`string`\>

#### Source

[index.ts:565](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L565)

***

### setCryptoPrivateKey()

> **`private`** **setCryptoPrivateKey**(`key`): `void`

#### Parameters

• **key**: `CryptoKey`

#### Returns

`void`

#### Source

[index.ts:170](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L170)

***

### setCryptoPublicKey()

> **`private`** **setCryptoPublicKey**(`key`): `void`

#### Parameters

• **key**: `CryptoKey`

#### Returns

`void`

#### Source

[index.ts:166](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L166)

***

### str2ab()

> **`private`** **str2ab**(`str`): `ArrayBuffer`

#### Parameters

• **str**: `string`

#### Returns

`ArrayBuffer`

#### Source

[index.ts:175](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L175)

***

Generated using [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) and [TypeDoc](https://typedoc.org/)
