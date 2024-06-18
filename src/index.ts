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

interface RequestRegisterResponse {
	options: PublicKeyCredentialCreationOptionsJSON;
}

interface RegisterResponse {
	verified: boolean;
}

interface RequestLoginResponse {
	options: PublicKeyCredentialRequestOptionsJSON;
	publicUserKey: string;
}

interface LoginResponse {
	verified: boolean;
	jwt: string;
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

	private getCryptoPrivateKey() {
		return this.privateKey;
	}

	private setCryptoPublicKey(key: CryptoKey) {
		this.publicKey = key;
	}

	private setCryptoPrivateKey(key: CryptoKey) {
		this.privateKey = key;
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
			// const challengeOptions: PublicKeyCredentialCreationOptionsJSON =
			// 	requestRegisterResponseData.options;

			const firstSalt = new Uint8Array(new Array(32).fill(1)).buffer;

			const challengeOptions = {
				publicKey: {
					challenge: new Uint8Array([1, 2, 3, 4]), // Example value
					rp: {
						name: "SimpleWebAuthn Example",
						// id: "localhost:3000",
					},
					user: {
						id: new Uint8Array([5, 6, 7, 8]),  // Example value
						name: "user@dev.dontneeda.pw",
						displayName: "user@dev.dontneeda.pw",
					},
					pubKeyCredParams: [
						{ alg: -8, type: "public-key" },   // Ed25519
						{ alg: -7, type: "public-key" },   // ES256
						{ alg: -257, type: "public-key" }, // RS256
					],
					authenticatorSelection: {
					  	userVerification: "required",
					},
					extensions: {prf: {}},
					// extensions: {
					// 	prf: {
					// 		eval: {
					// 			first: firstSalt,
					// 		},
					// 	},
					// },
				},
			} as any

			console.log(challengeOptions);

			const auth1Credential = await navigator.credentials.create(challengeOptions);

			// const credentials: RegistrationResponseJSON = await startRegistration(
			// 	challengeOptions
			// ).catch((err: string) => {
			// 	throw Error(err);
			// });

			console.log(auth1Credential);

			// TODO add check for largeBlob supported

			const registerResponse = await this.axiosClient.post<string>(
				`/register`,
				{
					challengeResponse: {
						// credentials: credentials,
						redentials: auth1Credential,
						challenge: challengeOptions.challenge,
						deviceToken: "",
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

			console.log("BLOB");

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
			const challengeOptions = loginRequestResponseData.options;
			const pubicUserKey = loginRequestResponseData.publicUserKey;

			let privateKey: CryptoKey | undefined;
			let publicKey: CryptoKey | undefined;

			// const inputOptions: ChallengeInputOptions | undefined =
			// 	challengeOptions.extensions as ChallengeInputOptions;

			const firstSalt = new Uint8Array(new Array(32).fill(1)).buffer;

			const inputOptions = {
				publicKey: {
					challenge: new Uint8Array([9, 0, 1, 2]), // Example value
					allowCredentials: [
						// {
						// 	id: regCredential.rawId,
						// 	transports: regCredential.response.getTransports(),
						// 	type: "public-key",
						// },
					],
					rpId: "dev.dontneeda.pw",
					// This must always be either "discouraged" or "required".
					// Pick one and stick with it.
					userVerification: "required",
					extensions: {
						prf: {
							eval: {
							first: firstSalt,
							},
						},
					},
				},
			} as any

			console.log(inputOptions);

			// check if we want to read or write
			// if (inputOptions?.largeBlob.read) {
			// 	publicKey = await this.loadCryptoPublicKeyFromString(pubicUserKey);
			// } else if (inputOptions.largeBlob.write) {
			// 	// generate key material to be saved
			// 	const keyPair = await window.crypto.subtle.generateKey(
			// 		{
			// 			name: "ECDH",
			// 			namedCurve: "P-384",
			// 		},
			// 		true,
			// 		["deriveKey", "deriveBits"]
			// 	);

			// 	publicKey = keyPair.publicKey;
			// 	privateKey = keyPair.privateKey;

			// 	// export to jwk format buffer to save private key in large blob
			// 	const blob = await this.saveCryptoKeyAsString(privateKey);
			// 	inputOptions.largeBlob.write = Uint8Array.from(
			// 		blob.split("").map((c: string) => c.codePointAt(0)) as number[]
			// 	);
			// } else {
			// 	// not reading or writing is not intended
			// 	throw Error("not reading or writing");
			// }

			const conditionalUISupported = await browserSupportsWebAuthnAutofill();

			const credentials: AuthenticationResponseJSON =
				await startAuthentication(challengeOptions, false).catch(
					(err: string) => {
						throw Error(err);
					}
				);

			const outputOptions: any | undefined =
				credentials.clientExtensionResults as any;

			const inputKeyMaterial = new Uint8Array(
				outputOptions?.prf.results.first,
			);
			
			const keyDerivationKey = await crypto.subtle.importKey(
				"raw",
				inputKeyMaterial,
				"HKDF",
				false,
				["deriveKey"],
			);

			console.log(keyDerivationKey);

			// check if read or write was successful
			// if (outputOptions.largeBlob.written) {
			// 	console.log("WRITE SUCCESSFUL");
			// } else if (Object.keys(outputOptions.largeBlob).length) {
			// 	console.log("READ SUCCESSFUL");
			// 	const keyBuffer = String.fromCodePoint(
			// 		...new Uint8Array(outputOptions.largeBlob.blob)
			// 	);

			// 	privateKey = await this.loadCryptoPrivateKeyFromString(keyBuffer);
			// }

			// TODO private key public key verification
			// server generates secret from private server key and public user key if present
			// server sends public server key
			// user generates secret from private user key and public server key
			// sends secret to server
			// server checks if secret already present or generates secret and compares for vaildation

			// TODO maybe just save after login challegne successfully completed

			// generate shared secret for key validation
			// const sharedSecret = await window.crypto.subtle.deriveBits(
			//   {
			//     name: "ECDH",
			//     // @ts-ignore
			//     namedCurve: "P-384",
			//     public: publicServerKey,
			//   },
			//   privateKey,
			//   128,
			// );

			// if (privateKey !== undefined && publicKey !== undefined) {
			// 	this.setCryptoPrivateKey(privateKey);
			// 	this.setCryptoPublicKey(publicKey);
			// } else {
			// 	// TODO throw error
			// 	console.error("private key or public key undefined!");
			// 	throw Error("private key or public key undefined!");
			// }

			// send public key to server if we just created one
			const pubKeyString =
				publicKey !== undefined
					? await this.saveCryptoKeyAsString(publicKey)
					: "";

			const loginReponse = await this.axiosClient.post<string>(`/login`, {
				// TODO interfaces for request bodies
				challengeResponse: {
					credentials: credentials,
					challenge: challengeOptions.challenge,
					pubKey: pubKeyString,
					// secret: this.ab2str(sharedSecret)
				},
			});

			if (loginReponse.status !== 200) {
				throw Error(loginReponse.data);
			}

			const loginReponseData: LoginResponse = JSON.parse(loginReponse.data);

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
