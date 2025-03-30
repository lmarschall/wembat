[@wembat/client](../exports.md) / LoginResponse

# Interface: LoginResponse

Represents the response object returned after a successful login.

## Properties

### nonce

> **nonce**: `string`

A unique nonce value associated with the login request.

#### Source

[types.ts:206](https://github.com/lmarschall/wembat/blob/fa7ae5e/src/types.ts#L206)

***

### privateUserKeyEncrypted

> **privateUserKeyEncrypted**: `string`

The encrypted private key of the user.

#### Source

[types.ts:201](https://github.com/lmarschall/wembat/blob/fa7ae5e/src/types.ts#L201)

***

### publicUserKey

> **publicUserKey**: `string`

The public key of the user.

#### Source

[types.ts:196](https://github.com/lmarschall/wembat/blob/fa7ae5e/src/types.ts#L196)

***

### sessionId

> **sessionId**: `string`

The session ID associated with the user's session.

#### Source

[types.ts:191](https://github.com/lmarschall/wembat/blob/fa7ae5e/src/types.ts#L191)

***

### token

> **token**: `string`

The JSON Web Token (JWT) associated with the user's session.

#### Source

[types.ts:186](https://github.com/lmarschall/wembat/blob/fa7ae5e/src/types.ts#L186)

***

### verified

> **verified**: `boolean`

Indicates whether the user has been verified.

#### Source

[types.ts:181](https://github.com/lmarschall/wembat/blob/fa7ae5e/src/types.ts#L181)

***

Generated using [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) and [TypeDoc](https://typedoc.org/)
