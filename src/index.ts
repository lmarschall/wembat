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
	private readonly apiUrl: string;
	protected readonly axiosClient: AxiosInstance;
	protected publicKey: CryptoKey | undefined;
	protected privateKey: CryptoKey | undefined;
	protected jwt: string | undefined;
	public register: (userMail: string) => Promise<WembatActionResponse<WembatRegisterResult>>;
	public login: (userUId: string) => Promise<WembatActionResponse<WembatLoginResult>>;
	public encrypt: (wembatMessage: WembatMessage, publicKey: CryptoKey) => Promise<WembatActionResponse<WembatMessage>>;
	public decrypt: (wembatMessage: WembatMessage, publicKey: CryptoKey) => Promise<WembatActionResponse<WembatMessage>>;

	/**
	 * Creates an instance of WembatClient.
	 * @param url - The URL of the Backend API.
	 */
	constructor(url: string) {
		this.apiUrl = url;
		this.axiosClient = axios.create({
			baseURL: `${this.apiUrl}/webauthn`,
			// headers: {
			// 	"content-type": "application/json",
			// 	"authorization": `Bearer ${this.jwt}`,
			// 	"wembat-app-token": "Bearer",
			// },
			validateStatus: function (status) {
				return status == 200 || status == 400;
			},
			transformResponse: (res) => res,
			responseType: "text",
		});

		this.axiosClient.defaults.headers.common["Content-Type"] =
			"application/json";
		this.axiosClient.defaults.headers.common["Authorization"] =
			`Bearer ${this.jwt}`;
		this.axiosClient.defaults.headers.common["Wembat-App-Token"] =
			`Bearer ${this.jwt}`;

		this.register = register.bind(this);
		this.login = login.bind(this);
		this.encrypt = encrypt.bind(this);
		this.decrypt = decrypt.bind(this);
	}

	public getCryptoPublicKey() {
		return this.publicKey;
	}
}

export { WembatClient };