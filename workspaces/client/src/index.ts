import axios, { AxiosInstance } from "axios";

import { PendingRequest, WembatActionResponse, WembatClientToken, WembatLoginResult, WembatMessage, WembatRegisterResult, WembatToken, WorkerResponseType } from "./types";
import { register } from "./functions/register";
import { decrypt } from "./functions/decrypt";
import { login } from "./functions/login";
import { encrypt } from "./functions/encrypt";
import { onboard } from "./functions/onboard";
import { jwtDecode } from "./functions/helper";
import { token } from "./functions/token";
import { link } from "./functions/link";

export * from "./types";

/**
 * Represents a client for interacting with the Wembat API.
 */
class WembatClient {
	readonly #apiUrl: string;
	readonly #axiosClient: AxiosInstance;
	private readonly worker: Worker;
	private pendingRequests = new Map<string, PendingRequest>();

	/**
	 * Creates an instance of WembatClient.
	 * @param url - The URL of the Backend API.
	 */
	constructor(applicationToken: string) {
		// parse jwt token and get application information
		const tokenPayload: WembatClientToken = jwtDecode(applicationToken);

		if (tokenPayload == null) {
			throw new Error("Invalid application token");
		}

		this.#apiUrl = tokenPayload.iss;
		this.#axiosClient = axios.create({
			baseURL: `${this.#apiUrl}/api/webauthn`,
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
			`Bearer ${applicationToken}`;

		this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
      		type: 'module',
    	});

    	this.worker.onmessage = (event: MessageEvent<WorkerResponseType>) => {
      		this.handleWorkerResponse(event.data);
    	};
	}

	private handleWorkerResponse(res: WorkerResponseType) {
		// if (res.type === 'ERROR') {
		// console.error('Worker Error:', res.message);
		// } else if (res.type === 'INIT_SUCCESS') {
		// console.log('Enclave ist bereit und gesichert.');
		// } else if (res.type === 'SIGNATURE_RESULT') {
		// console.log('Signatur empfangen:', res.signature);
		// // Hier weiterverarbeiten (z.B. an API senden)
		// }
	}

	private sendRequest(
		msg: Omit<WorkerRequest, 'id'>, 
		timeoutMs: number
		): Promise<any> {

		return new Promise((resolve, reject) => {
			// 1. Erzeuge Unique ID (UUID oder einfach random string)
			const id = crypto.randomUUID();

			// 2. Setze Timeout-Timer
			const timer = setTimeout(() => {
			if (this.pendingRequests.has(id)) {
				this.pendingRequests.delete(id);
				reject(new Error(`Worker request timed out after ${timeoutMs}ms`));
			}
			}, timeoutMs);

			// 3. Speichere resolve/reject in der Map
			this.pendingRequests.set(id, { resolve, reject, timer });

			// 4. Sende an Worker (mit ID!)
			const request: WorkerRequest = { ...msg, id };
			this.worker.postMessage(request);
		});
	}

	private handleMessage(response: WorkerResponse) {
		const { id, type } = response;

		// Haben wir einen offenen Request für diese ID?
		const pending = this.pendingRequests.get(id);
		
		if (!pending) {
			console.warn(`Received response for unknown or timed-out ID: ${id}`);
			return;
		}

		// Timer stoppen, da Antwort da ist
		clearTimeout(pending.timer);

		// Map bereinigen
		this.pendingRequests.delete(id);

		// Promise auflösen oder ablehnen
		if (type === 'SUCCESS') {
			pending.resolve(response.result);
		} else {
			pending.reject(new Error(response.error));
		}
	}

	/**
	 * Encrypts a Wembat message using the provided public key.
	 * 
	 * @param wembatMessage - The Wembat message to encrypt.
	 * @param publicKey - The public key to use for encryption.
	 * @returns A promise that resolves to a WembatActionResponse containing the encrypted Wembat message.
	 */
	public async encrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		const message: WorkerAction = { type: WorkerActionType.Initialize, loginResponse: loginReponseData };
		return this.sendRequest({type: WembatActionType.Encrypt})
	}

	/**
	 * Decrypts a Wembat message using the provided public key.
	 * 
	 * @param wembatMessage - The Wembat message to decrypt.
	 * @param publicKey - The public key used for decryption.
	 * @returns A promise that resolves to a WembatActionResponse containing the decrypted Wembat message.
	 */
	public async decrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		return await decrypt(this.worker, wembatMessage, publicKey);
	}

	/**
	 * Registers a user device with the provided email address.
	 * 
	 * @param userMail - The email address of the user to register.
	 * @returns A Promise that resolves to a WembatActionResponse containing the registration result.
	 */
	public async register (userMail: string, autoRegister: boolean = false): Promise<WembatActionResponse<WembatRegisterResult>> {
		return await register(this.#axiosClient, userMail, autoRegister);
	}

	/**
	 * Logs in the user with the specified email address.
	 * @param userMail The email address of the user.
	 * @returns A promise that resolves to a WembatActionResponse containing the login result.
	 */
	public async login (userMail: string, autoLogin: boolean = false): Promise<WembatActionResponse<WembatLoginResult>> {
		const loginResult = await login(this.#axiosClient, this.worker, userMail, autoLogin);
		this.#axiosClient.defaults.headers.common["Authorization"] =
			`Bearer ${this.#jwt}`;
		return loginResult;
	}

	/**
	 * Onboards the new user device linked to the active wembat session.
	 * @returns A promise that resolves to a WembatActionResponse containing the onboard result.
	 */
	public async onboard (): Promise<WembatActionResponse<WembatRegisterResult>> {
		return await onboard(this.#axiosClient, this.#publicKey, this.#privateKey);
	}

	/**
	 * Links the new user device to the active wembat session.
	 * @returns A promise that resolves to a WembatActionResponse containing the link result.
	 */
	public async link (): Promise<WembatActionResponse<WembatRegisterResult>> {
		return await link(this.#axiosClient);
	}

	/**
	 * Retrieves the token for the current session.
	 * @returns A promise that resolves to a WembatActionResponse containing the token.
	 */
	public async token (): Promise<WembatActionResponse<WembatToken>> {
		return await token(this.#axiosClient, this.#jwt);
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