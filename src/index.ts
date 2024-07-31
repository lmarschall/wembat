import axios, { AxiosError, AxiosInstance } from "axios";

// TODO, maybe
// we create a new session which holds information about a user application session for multiple devices
// we create user sessions for each device which are linked to the session
// we create keypairs for each user session and store them
// we create a session key for the session and store it encrypted in the user sessions
// we create a keypair for each session the private key of the session is encrypted with the user session key

import { WembatActionResponse, WembatMessage, WembatRegisterResult } from "./types";
import { register } from "./functions/register";
import { decrypt } from "./functions/decrypt";

/**
 * Represents a client for interacting with the Wembat API.
 */
class WembatClient {
	private readonly apiUrl: string;
	private readonly axiosClient: AxiosInstance;
	private publicKey: CryptoKey | undefined;
	private privateKey: CryptoKey | undefined;
	private jwt: string | undefined;
	public register: (userMail: string) => Promise<WembatActionResponse<WembatRegisterResult>>;
	public decrypt: (wembatMessage: WembatMessage, publicKey: CryptoKey) => Promise<WembatActionResponse<WembatMessage>>;

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
		this.register = register.bind(this);
		this.decrypt = decrypt.bind(this);
		// if(this.axiosClient == undefined) throw Error("Could not create axios client");
		// TODO add api token
		// this.axiosClient.defaults.headers.common['Authorization'] = AUTH_TOKEN;
	}

	public getCryptoPublicKey() {
		return this.publicKey;
	}
}

export { WembatClient };