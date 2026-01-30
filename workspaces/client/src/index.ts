import axios, { AxiosInstance } from "axios";

import { ActionContent, PendingRequest, UUIdString, WembatActionResponse, WembatClientToken, WembatLoginResult, WembatMessage, WembatRegisterResult, WembatResult, WembatToken, WorkerAction, WorkerActionType, WorkerRequest, WorkerResponse, WorkerResponseType } from "./types";
import { register } from "./functions/register";
import { decrypt } from "./functions/decrypt";
import { login } from "./functions/login";
import { encrypt } from "./functions/encrypt";
import { onboard } from "./functions/onboard";
import { jwtDecode } from "./functions/helper";
import { token } from "./functions/token";
import { link } from "./functions/link";
import { Bridge } from "./bridge";

export * from "./types";

/**
 * Represents a client for interacting with the Wembat API.
 */
class WembatClient {
	private readonly worker: Worker;
	private readonly pendingRequests = new Map<string, PendingRequest>();
	private bridge: Bridge;

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

		this.worker = new Worker(new URL('./worker.ts', import.meta.url), {
      		type: 'module',
    	});

		this.bridge = new Bridge(this.worker);
	}

	/**
	 * Encrypts a Wembat message using the provided public key.
	 * 
	 * @param wembatMessage - The Wembat message to encrypt.
	 * @param publicKey - The public key to use for encryption.
	 * @returns A promise that resolves to a WembatActionResponse containing the encrypted Wembat message.
	 */
	public async encrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		const content: ActionContent = { message: wembatMessage, key: publicKey };
		const action: WorkerAction = { type: WorkerActionType.Encrypt, content: content };
		await this.bridge.invoke('process-image', hugeData, [hugeData.buffer]);
		return this.sendRequest(action);
	}

	/**
	 * Decrypts a Wembat message using the provided public key.
	 * 
	 * @param wembatMessage - The Wembat message to decrypt.
	 * @param publicKey - The public key used for decryption.
	 * @returns A promise that resolves to a WembatActionResponse containing the decrypted Wembat message.
	 */
	public async decrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		const content: ActionContent = { message: wembatMessage, key: publicKey };
		const action: WorkerAction = { type: WorkerActionType.Decrypt, content: content };
		return this.sendRequest(action);
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
		let loginResult = await login(this.#axiosClient, userMail, autoLogin);
		const content: ActionContent = { loginResponse: loginResult.result.loginResponse, keyMaterial: loginResult.result.keyMaterial };
		const action: WorkerAction = { type: WorkerActionType.Login, content: content };
		loginResult = await this.sendRequest(action);
		return loginResult;
	}

	/**
	 * Onboards the new user device linked to the active wembat session.
	 * @returns A promise that resolves to a WembatActionResponse containing the onboard result.
	 */
	public async onboard (): Promise<WembatActionResponse<WembatRegisterResult>> {
		// const content: ActionContent = { message: wembatMessage, key: publicKey };
		// const action: WorkerAction = { type: WorkerActionType.Decrypt, content: content };
		// return this.sendRequest(action);
		let blob: any;
		return blob;
	}

	/**
	 * Links the new user device to the active wembat session.
	 * @returns A promise that resolves to a WembatActionResponse containing the link result.
	 */
	public async link (): Promise<WembatActionResponse<WembatRegisterResult>> {
		// const content: ActionContent = { message: wembatMessage, key: publicKey };
		// const action: WorkerAction = { type: WorkerActionType.Decrypt, content: content };
		// return this.sendRequest(action);
		let blob: any;
		return blob;
	}

	/**
	 * Retrieves the token for the current session.
	 * @returns A promise that resolves to a WembatActionResponse containing the token.
	 */
	public async token (): Promise<WembatActionResponse<WembatToken>> {
		// const content: ActionContent = { message: wembatMessage, key: publicKey };
		// const action: WorkerAction = { type: WorkerActionType.Decrypt, content: content };
		// return this.sendRequest(action);
		let blob: any;
		return blob;
	}

	/**
	 * Retrieves the crypto public key.
	 * @returns The crypto public key.
	 */
	public getCryptoPublicKey() {
		// return this.#publicKey;
		let blob: any;
		return blob;
	}
}

export { WembatClient };