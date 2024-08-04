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

/**
 * Represents the result of the Wembat onboarding process.
 */
export interface WembatOnboardResult {
	/**
	 * Indicates whether the onboarding process was successfully verified.
	 */
	verifiedStatus: boolean;
}

/**
 * Represents the response object for registering a request.
 */
export interface RequestRegisterResponse {
	options: PublicKeyCredentialCreationOptionsJSON;
}

/**
 * Represents the response object returned by the register API.
 */
export interface RegisterResponse {
	/**
	 * Indicates whether the registration is verified or not.
	 */
	verified: boolean;
}

/**
 * Represents the response object for a login request.
 */
export interface RequestLoginResponse {
	options: PublicKeyCredentialRequestOptionsJSON;
}

/**
 * Represents the response object for a request to onboard.
 */
export interface RequestOnboardResponse {
	options: PublicKeyCredentialRequestOptionsJSON;
}

/**
 * Represents the response object returned after a successful login.
 */
export interface LoginResponse {
	/**
	 * Indicates whether the user has been verified.
	 */
	verified: boolean;

	/**
	 * The JSON Web Token (JWT) associated with the user's session.
	 */
	jwt: string;

	/**
	 * The session ID associated with the user's session.
	 */
	sessionId: string;

	/**
	 * The public key of the user.
	 */
	publicUserKey: string;

	/**
	 * The encrypted private key of the user.
	 */
	privateUserKeyEncrypted: string;

	/**
	 * A unique nonce value associated with the login request.
	 */
	nonce: string;
}