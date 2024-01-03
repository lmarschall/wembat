[@wembat/client](../index.md) / WembatClient

# Class: WembatClient

## Constructors

### new WembatClient(url)

> **new WembatClient**(`url`): [`WembatClient`](WembatClient.md)

#### Parameters

• **url**: `string`

#### Returns

[`WembatClient`](WembatClient.md)

#### Source

[index.ts:65](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L65)

## Properties

### apiUrl

> **apiUrl**: `string` = `""`

#### Source

[index.ts:59](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L59)

***

### encryptionKey

> **encryptionKey**: `undefined` \| `CryptoKey`

#### Source

[index.ts:62](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L62)

***

### privateKey

> **privateKey**: `undefined` \| `CryptoKey`

#### Source

[index.ts:61](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L61)

***

### publicKey

> **publicKey**: `undefined` \| `CryptoKey`

#### Source

[index.ts:60](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L60)

## Methods

### ab2str()

> **ab2str**(`buf`): `string`

#### Parameters

• **buf**: `ArrayBuffer`

#### Returns

`string`

#### Source

[index.ts:80](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L80)

***

### decrypt()

> **decrypt**(`ciphertext`): `Promise`\<`string`\>

#### Parameters

• **ciphertext**: `string`

#### Returns

`Promise`\<`string`\>

#### Source

[index.ts:451](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L451)

***

### deriveEncryptionKey()

> **deriveEncryptionKey**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[index.ts:381](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L381)

***

### encrypt()

> **encrypt**(`message`): `Promise`\<`string`\>

#### Parameters

• **message**: `string`

#### Returns

`Promise`\<`string`\>

#### Source

[index.ts:426](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L426)

***

### getCryptoPrivateKey()

> **getCryptoPrivateKey**(): `undefined` \| `CryptoKey`

#### Returns

`undefined` \| `CryptoKey`

#### Source

[index.ts:480](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L480)

***

### getCryptoPublicKey()

> **getCryptoPublicKey**(): `undefined` \| `CryptoKey`

#### Returns

`undefined` \| `CryptoKey`

#### Source

[index.ts:476](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L476)

***

### loadCryptoPublicKey()

> **loadCryptoPublicKey**(): `Promise`\<`void`\>

#### Returns

`Promise`\<`void`\>

#### Source

[index.ts:407](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L407)

***

### login()

> **login**(`challengeOptions`, `credentials`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\>

#### Parameters

• **challengeOptions**: `PublicKeyCredentialRequestOptionsJSON`

• **credentials**: `RegistrationResponseJSON`

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\>

#### Source

[index.ts:339](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L339)

***

### loginRead()

> **loginRead**(`userUId`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\>

#### Parameters

• **userUId**: `string`

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\>

#### Source

[index.ts:154](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L154)

***

### loginWrite()

> **loginWrite**(`userUId`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\>

#### Parameters

• **userUId**: `string`

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\>

#### Source

[index.ts:244](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L244)

***

### register()

> **register**(`userUId`): `Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\>

#### Parameters

• **userUId**: `string`

#### Returns

`Promise`\<[`WembatActionResponse`](../interfaces/WembatActionResponse.md)\>

#### Source

[index.ts:85](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L85)

***

### resetCryptoKeys()

> **resetCryptoKeys**(): `void`

#### Returns

`void`

#### Source

[index.ts:471](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L471)

***

### saveCryptoPublicKey()

> **saveCryptoPublicKey**(`key`): `Promise`\<`void`\>

#### Parameters

• **key**: `CryptoKey`

#### Returns

`Promise`\<`void`\>

#### Source

[index.ts:399](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L399)

***

### setCryptoPrivateKey()

> **setCryptoPrivateKey**(`key`): `void`

#### Parameters

• **key**: `CryptoKey`

#### Returns

`void`

#### Source

[index.ts:488](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L488)

***

### setCryptoPublicKey()

> **setCryptoPublicKey**(`key`): `void`

#### Parameters

• **key**: `CryptoKey`

#### Returns

`void`

#### Source

[index.ts:484](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L484)

***

### str2ab()

> **str2ab**(`str`): `ArrayBuffer`

#### Parameters

• **str**: `string`

#### Returns

`ArrayBuffer`

#### Source

[index.ts:70](https://github.com/lmarschall/wembat/blob/d3b6875/src/index.ts#L70)

***

Generated using [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) and [TypeDoc](https://typedoc.org/)
