import { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/typescript-types";

/**
 * Represents the types of results that can be returned by a Wembat action.
 */
export type WembatResult = WembatMessage | WembatRegisterResult | WembatLoginResult;

/**
 * Represents the response of a Wembat action.
 *
 * @template WR - The type of the Wembat result.
 */
export interface WembatActionResponse<WR extends WembatResult> {
	/**
	 * Indicates whether the action was successful.
	 */
	success: boolean;

	/**
	 * The error that occurred during the action, if any.
	 */
	error: WembatError;

	/**
	 * The result of the action.
	 */
	result: WR;
}

/**
 * Represents an error that occurred during a Wembat action.
 */
export interface WembatError {
	/**
	 * The error message.
	 */
	error: string;
}


/**
 * Represents a Wembat message.
 */
export interface WembatMessage {
	/**
	 * The initialization vector used for encryption.
	 */
	iv: string;

	/**
	 * The original message before encryption.
	 */
	message: string;

	/**
	 * The encrypted message.
	 */
	encrypted: string;
}

/**
 * Represents the result of a Wembat registration.
 */
export interface WembatRegisterResult {
	/**
	 * Indicates whether the registration was successful.
	 */
	verifiedStatus: boolean;
}

/**
 * Represents the result of a Wembat login.
 */
export interface WembatLoginResult {
	/**
	 * Indicates whether the login was successful.
	 */
	verified: boolean;

	/**
	 * The JWT token generated during login.
	 */
	jwt: string;
}

export interface WembatOnboardResult {
	/**
	 * Indicates whether the onboarding was successful.
	 */
	verifiedStatus: boolean;
}

interface RequestRegisterResponse {
	options: PublicKeyCredentialCreationOptionsJSON;
}

interface RegisterResponse {
	verified: boolean;
}

interface RequestLoginResponse {
	options: PublicKeyCredentialRequestOptionsJSON;
}

interface RequestOnboardResponse {
	options: PublicKeyCredentialRequestOptionsJSON;
}

interface LoginResponse {
	verified: boolean;
	jwt: string;
	sessionId: string;
	publicUserKey: string;
	privateUserKeyEncrypted: string;
	nonce: string;
}

interface ChallengeInputOptions extends AuthenticationExtensionsClientInputs {
	largeBlob: any;
}

interface ChallengeOutputptions extends AuthenticationExtensionsClientOutputs {
	largeBlob: any;
}