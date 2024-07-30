import axios, { AxiosError, AxiosInstance } from "axios";

import {
	startRegistration,
	startAuthentication,
	browserSupportsWebAuthn,
	browserSupportsWebAuthnAutofill,
} from "@simplewebauthn/browser";

import {
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
	RegistrationResponseJSON,
	AuthenticationResponseJSON,
} from "@simplewebauthn/typescript-types";


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


/**
 * Represents a client for interacting with the Wembat API.
 */
class WembatClient {
	private readonly apiUrl: string;
	private readonly axiosClient: AxiosInstance;
	private publicKey: CryptoKey | undefined;
	private privateKey: CryptoKey | undefined;
	private sessionKey: CryptoKey | undefined;
	private jwt: string | undefined;

	/**
	 * Creates an instance of WembatClient.
	 * @param url - The URL of the Backend API.
	 */
	constructor(url: string) {
		this.apiUrl = url;
		this.axiosClient = axios.create({
			baseURL: `${this.apiUrl}/webauthn`,
			validateStatus: function (status) {
				return status == 200 || status == 400;
			},
			transformResponse: (res) => res,
			responseType: "text",
		});
		this.axiosClient.defaults.headers.common["content-type"] =
			"Application/Json";
		// if(this.axiosClient == undefined) throw Error("Could not create axios client");
		// TODO add api token
		// this.axiosClient.defaults.headers.common['Authorization'] = AUTH_TOKEN;
	}

	public getCryptoPublicKey() {
		return this.publicKey;
	}

	// helper function
	private str2ab(str: string): ArrayBuffer {
		str = atob(str);
		const buf = new ArrayBuffer(str.length);
		const bufView = new Uint8Array(buf);
		for (let i = 0, strLen = str.length; i < strLen; i++) {
			bufView[i] = str.charCodeAt(i);
		}
		return buf;
	}

	// helper function
	private ab2str(buf: ArrayBuffer): string {
		return btoa(String.fromCharCode.apply(null, [...new Uint8Array(buf)]));
	}

	/**
	 * Registers a user with the specified user ID.
	 * 
	 * @param userUId - The user ID to register.
	 * @returns A promise that resolves to a `WembatActionResponse` containing the registration result.
	 */
	public async register(
		userUId: string
	): Promise<WembatActionResponse<WembatRegisterResult>> {
		// TODO maybe check for largeblob not supported

		const actionResponse: WembatActionResponse<WembatRegisterResult> = {
			success: false,
			error: {} as WembatError,
			result: {} as WembatRegisterResult,
		};

		try {
			if (!browserSupportsWebAuthn())
				throw Error("WebAuthn is not supported on this browser!");

			if (this.axiosClient == undefined)
				throw Error("Axiso Client undefined!");

			const requestRegisterResponse = await this.axiosClient.post<string>(
				`/request-register`,
				{
					userInfo: { userName: userUId },
				}
			);

			if (requestRegisterResponse.status !== 200) {
				// i guess we need to handle errors here
				throw Error(requestRegisterResponse.data);
			}

			const requestRegisterResponseData: RequestRegisterResponse =
				JSON.parse(requestRegisterResponse.data);
			const challengeOptions: PublicKeyCredentialCreationOptionsJSON =
				requestRegisterResponseData.options;

			// const auth1Credential = await navigator.credentials.create(challengeOptions);

			const credentials: RegistrationResponseJSON = await startRegistration(
				challengeOptions
			).catch((err: string) => {
				throw Error(err);
			});

			// TODO add check for prf extension supported

			const registerResponse = await this.axiosClient.post<string>(
				`/register`,
				{
					challengeResponse: {
						credentials: credentials,
						challenge: challengeOptions.challenge
					},
				}
			);

			if (registerResponse.status !== 200) {
				// i guess we need to handle errors here
				throw Error(registerResponse.data);
			}

			const registerResponseData: RegisterResponse = JSON.parse(
				registerResponse.data
			);

			const registerResult: WembatRegisterResult = {
				verifiedStatus: registerResponseData.verified,
			};
			actionResponse.result = registerResult;
			actionResponse.success = true;
		} catch (error: any) {
			const errorMessage: WembatError = {
				error: error,
			};
			actionResponse.error = errorMessage as WembatError;
			console.error(error);
		} finally {
			return actionResponse;
		}
	}

	/**
	 * Registers a user with the specified user ID.
	 * 
	 * @param userUId - The user ID to register.
	 * @returns A promise that resolves to a `WembatActionResponse` containing the registration result.
	 */
	public async onboard(
		userUId: string
	): Promise<WembatActionResponse<WembatRegisterResult>> {

		const actionResponse: WembatActionResponse<WembatOnboardResult> = {
			success: false,
			error: {} as WembatError,
			result: {} as WembatRegisterResult,
		};

		try {
			if (!browserSupportsWebAuthn())
				throw Error("WebAuthn is not supported on this browser!");

			if (this.axiosClient == undefined)
				throw Error("Axiso Client undefined!");

			const requestOnboardResponse = await this.axiosClient.post<string>(
				`/request-onboard`,
				{
					userInfo: { userJWT: this.jwt },
				}
			);

			if (requestOnboardResponse.status !== 200) {
				// i guess we need to handle errors here
				throw Error(requestOnboardResponse.data);
			}

			const onboardRequestResponseData: RequestOnboardResponse = JSON.parse(
				requestOnboardResponse.data
			);
			const challengeOptions = onboardRequestResponseData.options as any;
			const conditionalUISupported = await browserSupportsWebAuthnAutofill();

			const firstSalt = new Uint8Array([
				0x4a, 0x18, 0xa1, 0xe7, 0x4b, 0xfb, 0x3d, 0x3f, 0x2a, 0x5d, 0x1f, 0x0c,
				0xcc, 0xe3, 0x96, 0x5e, 0x00, 0x61, 0xd1, 0x20, 0x82, 0xdc, 0x2a, 0x65,
				0x8a, 0x18, 0x10, 0xc0, 0x0f, 0x26, 0xbe, 0x1e,
			  ]).buffer;
			
			challengeOptions.extensions.prf.eval.first = firstSalt
			console.log(challengeOptions);

			const credentials: AuthenticationResponseJSON =
				await startAuthentication(challengeOptions, false).catch(
					(err: string) => {
						throw Error(err);
					}
				);

			const credentialExtensions = credentials.clientExtensionResults as any;

			const inputKeyMaterial = new Uint8Array(
				credentialExtensions?.prf.results.first,
			);
			
			const keyDerivationKey = await crypto.subtle.importKey(
				"raw",
				inputKeyMaterial,
				"HKDF",
				false,
				["deriveKey"],
			);

			// wild settings here
			const label = "encryption key";
			const info = new TextEncoder().encode(label);
			const salt = new Uint8Array();

			const encryptionKey = await crypto.subtle.deriveKey(
				{ name: "HKDF", info, salt, hash: "SHA-256" },
				keyDerivationKey,
				{ name: "AES-GCM", length: 256 },
				false,
				["encrypt", "decrypt"],
			);

			const publicKeyString = await this.saveCryptoKeyAsString(this.publicKey as CryptoKey);
			const privateKeyString = await this.saveCryptoKeyAsString(this.privateKey as CryptoKey);
			const sessionKeyString = await this.saveCryptoKeyAsString(this.sessionKey as CryptoKey);

			const nonce = window.crypto.getRandomValues(new Uint8Array(12));
			const encoder = new TextEncoder();

			const encryptedPrivateKey = await crypto.subtle.encrypt(
				{ name: "AES-GCM", iv: nonce },
				encryptionKey,
				encoder.encode(privateKeyString),
			);

			const encryptedSessionKey = await crypto.subtle.encrypt(
				{ name: "AES-GCM", iv: nonce },
				keyPair.privateKey,
				encoder.encode(sessionKeyString),
			);

			const onboardResponse = await this.axiosClient.post<string>(`/onboard`, {
				onboardRequest: {
					sessionKey: this.ab2str(encryptedSessionKey),
					privKey: this.ab2str(encryptedPrivateKey),
					pubKey: publicKeyString,
					nonce: this.ab2str(nonce),
				},
			});

			if (onboardResponse.status !== 200) {
				throw Error(onboardResponse.data);
			}

			const onboardResult: WembatOnboardResult = {
				verifiedStatus: true,
			};
			actionResponse.result = onboardResult;
			actionResponse.success = true;
		} catch (error: any) {
			const errorMessage: WembatError = {
				error: error,
			};
			actionResponse.error = errorMessage as WembatError;
			console.error(error);
		} finally {
			return actionResponse;
		}
	}

	/**
	 * Logs in a user with the provided user ID.
	 * 
	 * @param userUId - The user ID.
	 * @returns A promise that resolves to a `WembatActionResponse` containing the login result.
	 * @throws An error if WebAuthn is not supported on the browser or if the Axios client is undefined.
	 */
	public async login(
		userUId: string
	): Promise<WembatActionResponse<WembatLoginResult>> {
		const actionResponse: WembatActionResponse<WembatLoginResult> = {
			success: false,
			error: {} as WembatError,
			result: {} as WembatLoginResult,
		};

		try {
			if (!browserSupportsWebAuthn())
				throw Error("WebAuthn is not supported on this browser!");

			if (this.axiosClient == undefined)
				throw Error("Axiso Client undefined!");

			const loginRequestResponse = await this.axiosClient.post<string>(
				`/request-login`,
				{
					userInfo: { userName: userUId },
				}
			);

			if (loginRequestResponse.status !== 200) {
				// i guess we need to handle errors here
				throw Error(loginRequestResponse.data);
			}

			const loginRequestResponseData: RequestLoginResponse = JSON.parse(
				loginRequestResponse.data
			);
			const challengeOptions = loginRequestResponseData.options as any;
			const conditionalUISupported = await browserSupportsWebAuthnAutofill();

			const firstSalt = new Uint8Array([
				0x4a, 0x18, 0xa1, 0xe7, 0x4b, 0xfb, 0x3d, 0x3f, 0x2a, 0x5d, 0x1f, 0x0c,
				0xcc, 0xe3, 0x96, 0x5e, 0x00, 0x61, 0xd1, 0x20, 0x82, 0xdc, 0x2a, 0x65,
				0x8a, 0x18, 0x10, 0xc0, 0x0f, 0x26, 0xbe, 0x1e,
			  ]).buffer;
			
			challengeOptions.extensions.prf.eval.first = firstSalt
			console.log(challengeOptions);

			const credentials: AuthenticationResponseJSON =
				await startAuthentication(challengeOptions, false).catch(
					(err: string) => {
						throw Error(err);
					}
				);

			const loginReponse = await this.axiosClient.post<string>(`/login`, {
				// TODO interfaces for request bodies
				challengeResponse: {
					credentials: credentials,
					challenge: challengeOptions.challenge
				},
			});

			if (loginReponse.status !== 200) {
				throw Error(loginReponse.data);
			}
	
			const loginReponseData: LoginResponse = JSON.parse(loginReponse.data);

			if (loginReponseData.verified) {
				this.jwt = loginReponseData.jwt;
			} else {
				throw Error("Login not verified");
			}

			console.log(loginReponseData);

			const publicUserKeyString = loginReponseData.publicUserKey;
			const privateUserKeyEncryptedString = loginReponseData.privateUserKeyEncrypted;

			if (credentials.clientExtensionResults !== undefined) {

				const credentialExtensions = credentials.clientExtensionResults as any;

				const inputKeyMaterial = new Uint8Array(
					credentialExtensions?.prf.results.first,
				);
				
				const keyDerivationKey = await crypto.subtle.importKey(
					"raw",
					inputKeyMaterial,
					"HKDF",
					false,
					["deriveKey"],
				);

				// wild settings here
				const label = "encryption key";
				const info = new TextEncoder().encode(label);
				const salt = new Uint8Array();

				const encryptionKey = await crypto.subtle.deriveKey(
					{ name: "HKDF", info, salt, hash: "SHA-256" },
					keyDerivationKey,
					{ name: "AES-GCM", length: 256 },
					false,
					["encrypt", "decrypt"],
				);

				if (publicUserKeyString !== "" && privateUserKeyEncryptedString !== "") {
					console.log("Loading existing keys");
					this.publicKey = await this.loadCryptoPublicKeyFromString(publicUserKeyString);

					const nonce = loginReponseData.nonce;
					const decoder = new TextDecoder();

					const decryptedPrivateUserKey = await crypto.subtle.decrypt(
						{ name: "AES-GCM", iv: this.str2ab(nonce) },
						encryptionKey,
						this.str2ab(privateUserKeyEncryptedString),
					);

					this.privateKey = await this.loadCryptoPrivateKeyFromString(
						decoder.decode(decryptedPrivateUserKey),
					);
				} else {
					console.log("Generating new keys");
					const keyPair = await window.crypto.subtle.generateKey(
						{
							name: "ECDH",
							namedCurve: "P-384",
						},
						true,
						["deriveKey", "deriveBits"]
					);

					this.publicKey = keyPair.publicKey;
					this.privateKey = keyPair.privateKey;

					const publicKeyString = await this.saveCryptoKeyAsString(this.publicKey);
					const privateKeyString = await this.saveCryptoKeyAsString(this.privateKey);
					const sessionKeyString = await this.saveCryptoKeyAsString(this.sessionKey);

					const nonce = window.crypto.getRandomValues(new Uint8Array(12));
					const encoder = new TextEncoder();
					const encoded = encoder.encode(privateKeyString);

					const encryptedPrivateKey = await crypto.subtle.encrypt(
						{ name: "AES-GCM", iv: nonce },
						encryptionKey,
						encoded,
					);

					const encryptedSessionKey = await crypto.subtle.encrypt(
						{ name: "AES-GCM", iv: nonce },
						keyPair.privateKey,
						encoder.encode(sessionKeyString),
					);

					const saveCredentialsResponse = await this.axiosClient.post<string>(`/update-credentials`, {
						saveCredentialsRequest: {
							privKey: this.ab2str(encryptedPrivateKey),
							pubKey: publicKeyString,
							nonce: this.ab2str(nonce),
							sessionId: loginReponseData.sessionId
						},
					});
		
					if (saveCredentialsResponse.status !== 200) {
						throw Error(saveCredentialsResponse.data);
					}
				}
			} else {
				throw Error("Credentials not instance of PublicKeyCredential");
			}

			const loginResult: WembatLoginResult = {
				verified: loginReponseData.verified,
				jwt: loginReponseData.jwt,
			};
			actionResponse.result = loginResult;
			actionResponse.success = true;
		} catch (error: any) {
			const errorMessage: WembatError = {
				error: error,
			};
			actionResponse.error = errorMessage;
			console.error(error);
		} finally {
			return actionResponse;
		}
	}


	/**
	 * Encrypts a Wembat message using the provided public key.
	 *
	 * @param wembatMessage - The Wembat message to be encrypted.
	 * @param publicKey - The public key used for encryption.
	 * @returns A promise that resolves to a WembatActionResponse containing the encrypted message.
	 */
	public async encrypt(
		wembatMessage: WembatMessage,
		publicKey: CryptoKey
	): Promise<WembatActionResponse<WembatMessage>> {
		const actionResponse = {
			success: false,
			error: {} as WembatError,
			result: {} as WembatMessage,
		};

		try {
			const encryptionKey = await this.deriveEncryptionKey(publicKey);
			const iv = window.crypto.getRandomValues(new Uint8Array(12));

			const encoder = new TextEncoder();
			const encoded = encoder.encode(wembatMessage.message);
			const encrypted = await window.crypto.subtle.encrypt(
				{
					name: "AES-GCM",
					iv: iv,
				},
				encryptionKey,
				encoded
			);

			const message: WembatMessage = {
				encrypted: this.ab2str(encrypted),
				iv: this.ab2str(iv),
				message: "",
			};
			actionResponse.result = message;
			actionResponse.success = true;
		} catch (error: any) {
			const errorMessage: WembatError = {
				error: error,
			};
			actionResponse.error = errorMessage;
			console.error(error);
		} finally {
			return actionResponse;
		}
	}

	/**
	 * Decrypts a WembatMessage using the provided publicKey.
	 * 
	 * @param wembatMessage - The WembatMessage to decrypt.
	 * @param publicKey - The CryptoKey used for decryption.
	 * @returns A Promise that resolves to a WembatActionResponse containing the decrypted message.
	 */
	public async decrypt(
		wembatMessage: WembatMessage,
		publicKey: CryptoKey
	): Promise<WembatActionResponse<WembatMessage>> {
		const actionResponse = {
			success: false,
			error: {} as WembatError,
			result: {} as WembatMessage,
		};

		try {
			const encryptionKey = await this.deriveEncryptionKey(publicKey);
			const iv = wembatMessage.iv;

			const decrypted = await window.crypto.subtle.decrypt(
				{
					name: "AES-GCM",
					iv: this.str2ab(iv),
				},
				encryptionKey,
				this.str2ab(wembatMessage.encrypted)
			);

			const dec = new TextDecoder();
			const message: WembatMessage = {
				message: dec.decode(decrypted),
				encrypted: "",
				iv: iv,
			};
			actionResponse.result = message;
			actionResponse.success = true;
		} catch (error: any) {
			const errorMessage: WembatError = {
				error: error,
			};
			actionResponse.error = errorMessage;
			console.error(error);
		} finally {
			return actionResponse;
		}
	}

	private async deriveEncryptionKey(publicKey: CryptoKey): Promise<CryptoKey> {
		if (this.privateKey !== undefined && publicKey !== undefined) {
			const encryptionKey = await window.crypto.subtle.deriveKey(
				{
					name: "ECDH",
					public: this.publicKey,
				},
				this.privateKey,
				{
					name: "AES-GCM",
					length: 256,
				},
				false,
				["encrypt", "decrypt"]
			);
			return encryptionKey;
		} else {
			throw Error("Could not derive Encryption Key");
		}
	}

	private async saveCryptoKeyAsString(cryptoKey: CryptoKey): Promise<string> {
		const exported = await window.crypto.subtle.exportKey("jwk", cryptoKey);
		return JSON.stringify(exported);
	}

	private async loadCryptoPublicKeyFromString(
		pubKeyString: string
	): Promise<CryptoKey> {
		if (pubKeyString !== "") {
			return await window.crypto.subtle.importKey(
				"jwk",
				JSON.parse(pubKeyString),
				{
					name: "ECDH",
					namedCurve: "P-384",
				},
				true,
				[]
			);
		} else {
			throw Error("Public Key String empty");
		}
	}

	private async loadCryptoPrivateKeyFromString(
		privateKeyString: string
	): Promise<CryptoKey> {
		if (privateKeyString !== "") {
			return await window.crypto.subtle.importKey(
				"jwk",
				JSON.parse(privateKeyString),
				{
					name: "ECDH",
					namedCurve: "P-384",
				},
				false,
				["deriveKey", "deriveBits"]
			);
		} else {
			throw Error("Private Key String empty");
		}
	}
}

export { WembatClient };
