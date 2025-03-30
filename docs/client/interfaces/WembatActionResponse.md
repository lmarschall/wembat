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

[types.ts:52](https://github.com/lmarschall/wembat/blob/6919e5d/src/types.ts#L52)

***

### result

> **result**: `WR`

The result of the action.

#### Source

[types.ts:57](https://github.com/lmarschall/wembat/blob/6919e5d/src/types.ts#L57)

***

### success

> **success**: `boolean`

Indicates whether the action was successful.

#### Source

[types.ts:47](https://github.com/lmarschall/wembat/blob/6919e5d/src/types.ts#L47)

***

Generated using [typedoc-plugin-markdown](https://www.npmjs.com/package/typedoc-plugin-markdown) and [TypeDoc](https://typedoc.org/)
