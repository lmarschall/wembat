import axios, { AxiosError, AxiosInstance } from "axios";

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
			`Bearer ${this.#jwt}`;
	}

	public async encrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		return await encrypt(this.#privateKey, wembatMessage, publicKey);
	}

	public async decrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		return await decrypt(this.#privateKey, wembatMessage, publicKey);
	}

	public async register (userMail: string): Promise<WembatActionResponse<WembatRegisterResult>> {
		return await register(this.#axiosClient, userMail);
	}

	public async login (userMail: string): Promise<WembatActionResponse<WembatLoginResult>> {
		const [loginResult, privateKey, publicKey, jwt] = await login(this.#axiosClient, this.#privateKey, this.#publicKey, this.#jwt, userMail);
		this.#privateKey = privateKey;
		this.#publicKey = publicKey;
		this.#jwt = jwt;
		return loginResult;
	}

	public getCryptoPublicKey() {
		console.log(this.#publicKey);
		console.log(this.#privateKey);
		console.log(this.#jwt);
		return this.#publicKey;
	}
}

export { WembatClient };