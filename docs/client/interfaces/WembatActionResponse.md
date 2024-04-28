[@wembat/client](../exports.md) / WembatActionResponse

# Interface: WembatActionResponse\<WR\>

Represents the response of a Wembat action.

## Type parameters

• **WR** extends [`WembatResult`](../type-aliases/WembatResult.md)

The type of the Wembat result.

## Properties

### error

> **error**: [`WembatError`](WembatError.md)

The error that occurred during the action, if any.

#### Source

[index.ts:37](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L37)

***

### result

> **result**: `WR`

The result of the action.

#### Source

[index.ts:42](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L42)

***

### success

> **success**: `boolean`

Indicates whether the action was successful.

#### Source

[index.ts:32](https://github.com/lmarschall/wembat/blob/3814d8f/src/index.ts#L32)

***

Generated using [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) and [TypeDoc](https://typedoc.org/)
