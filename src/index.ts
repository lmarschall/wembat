import axios, { AxiosInstance } from "axios";

// TODO, maybe
// we create a new session which holds information about a user application session for multiple devices
// we create user sessions for each device which are linked to the session
// we create keypairs for each user session and store them
// we create a session key for the session and store it encrypted in the user sessions
// we create a keypair for each session the private key of the session is encrypted with the user session key

import { WembatActionResponse, WembatLoginResult, WembatMessage, WembatRegisterResult } from "./types";
import { register } from "./functions/register";
import { decrypt } from "./functions/decrypt";
import { login } from "./functions/login";
import { encrypt } from "./functions/encrypt";
import { onboard } from "./functions/onboard";

/**
 * Represents a client for interacting with the Wembat API.
 */
class WembatClient {
	readonly #apiUrl: string;
	readonly #axiosClient: AxiosInstance;
	#jwt: string | undefined;
	#publicKey: CryptoKey | undefined;
	#privateKey: CryptoKey | undefined;

	/**
	 * Creates an instance of WembatClient.
	 * @param url - The URL of the Backend API.
	 */
	constructor(url: string) {
		this.#apiUrl = url;
		this.#axiosClient = axios.create({
			baseURL: `${this.#apiUrl}/webauthn`,
			validateStatus: function (status) {
				return status == 200 || status == 400;
			},
			transformResponse: (res) => res,
			responseType: "text",
		});

		this.#axiosClient.defaults.headers.common["Content-Type"] =
			"application/json";
		this.#axiosClient.defaults.headers.common["Authorization"] =
			`Bearer ${this.#jwt}`;
		this.#axiosClient.defaults.headers.common["Wembat-App-Token"] =
			`Bearer eyJhbGciOiJFUzI1NiIsImp3ayI6eyJrdHkiOiJFQyIsIngiOiJNd3hHTXpWbEJXcGFwZDZ2cWVUVkw5Qml2WlpKY2ZVUXJFMWRVdHlKSENFIiwieSI6IndPX2NXWHZ5bXk4cTdnVXNsM1hxa0JRSEVKRHB5cG82d1pYQWQyWmtkeXMiLCJjcnYiOiJQLTI1NiJ9fQ.eyJhcHBVSWQiOiJjbHpic29jcHcwMDEzdDR0bnNvY2lqZWhzIiwiaWF0IjoxNzIyODA5NDU3LCJpc3MiOiJsb2NhbGhvc3Q6ODA4MCIsImF1ZCI6ImxvY2FsaG9zdDozMDAwIn0.TjzamKgeHUcZjM_77O7ZiSKm4fjbprOdCfVajwNmQv8SKu67DX3yX4errWCT5E93NAnfQD2xMr4hRj_OW76Vqg`;
	}

	/**
	 * Encrypts a Wembat message using the provided public key.
	 * 
	 * @param wembatMessage - The Wembat message to encrypt.
	 * @param publicKey - The public key to use for encryption.
	 * @returns A promise that resolves to a WembatActionResponse containing the encrypted Wembat message.
	 */
	public async encrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		return await encrypt(this.#privateKey, wembatMessage, publicKey);
	}

	/**
	 * Decrypts a Wembat message using the provided public key.
	 * 
	 * @param wembatMessage - The Wembat message to decrypt.
	 * @param publicKey - The public key used for decryption.
	 * @returns A promise that resolves to a WembatActionResponse containing the decrypted Wembat message.
	 */
	public async decrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		return await decrypt(this.#privateKey, wembatMessage, publicKey);
	}

	/**
	 * Registers a user with the provided email address.
	 * 
	 * @param userMail - The email address of the user to register.
	 * @returns A Promise that resolves to a WembatActionResponse containing the registration result.
	 */
	public async register (userMail: string): Promise<WembatActionResponse<WembatRegisterResult>> {
		return await register(this.#axiosClient, userMail);
	}

	/**
	 * Logs in the user with the specified email address.
	 * @param userMail The email address of the user.
	 * @returns A promise that resolves to a WembatActionResponse containing the login result.
	 */
	public async login (userMail: string): Promise<WembatActionResponse<WembatLoginResult>> {
		const [loginResult, privateKey, publicKey, jwt] = await login(this.#axiosClient, userMail);
		this.#privateKey = privateKey;
		this.#publicKey = publicKey;
		this.#jwt = jwt;
		this.#axiosClient.defaults.headers.common["Authorization"] =
			`Bearer ${this.#jwt}`;
		return loginResult;
	}

	public async onboard (userUId: string): Promise<WembatActionResponse<WembatRegisterResult>> {
		return await onboard(this.#axiosClient, this.#publicKey, this.#privateKey);
	}

	/**
	 * Retrieves the crypto public key.
	 * @returns The crypto public key.
	 */
	public getCryptoPublicKey() {
		return this.#publicKey;
	}
}

export { WembatClient };