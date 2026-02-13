import { WembatActionResponse, WembatClientToken, WembatLoginResult, WembatMessage, WembatRegisterResult, WembatLinkResult, WembatToken } from "./types";
import { jwtDecode } from "./functions/helper";
import { Bridge, BridgeMessageType, LinkContent, LoginContent, DecryptContent, EncryptContent, InitContent, StartRegistrationContent, StartAuthenticationContent, RegisterContent } from "./bridge";
import { browserSupportsWebAuthn, startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { AuthenticationResponseJSON, RegistrationResponseJSON } from "@simplewebauthn/types";
import WorkerClass from './worker.ts?worker&inline';

export * from "./types";

/**
 * Represents a client for interacting with the Wembat API.
 */
class WembatClient {
	private readonly worker: Worker;
	private readonly bridge: Bridge;

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

		if (!browserSupportsWebAuthn())
			throw new Error("WebAuthn is not supported on this browser!");

		// const conditionalUISupported = await browserSupportsWebAuthnAutofill();

		const content: InitContent = {token: applicationToken, tokenPayload: tokenPayload};

		this.worker = new WorkerClass();
		this.bridge = new Bridge(this.worker);
		this.bridge.invoke(BridgeMessageType.Init, content);

		this.bridge.on(BridgeMessageType.StartAuthentication, async (content: StartAuthenticationContent) => {
			console.log("start login");
			console.log(content);
			const credentials: AuthenticationResponseJSON = await startAuthentication(
				{
					optionsJSON: content.challengeOptions,
				}
			).catch((err: string) => {
				throw new Error(err);
			});
			return credentials;
		});

		this.bridge.on(BridgeMessageType.StartRegistration, async (content: StartRegistrationContent) => {
			console.log("start registration");
			console.log(content);
			const credentials: RegistrationResponseJSON = await startRegistration({
				optionsJSON: content.challengeOptions.options,
				useAutoRegister: content.autoRegister,
			}).catch((err: string) => {
				console.error(err);
				throw new Error(err);
			});
			console.log("finished registration");
			return credentials;
		});
	}

	/**
	 * Encrypts a Wembat message using the provided public key.
	 * 
	 * @param wembatMessage - The Wembat message to encrypt.
	 * @param publicKey - The public key to use for encryption.
	 * @returns A promise that resolves to a WembatActionResponse containing the encrypted Wembat message.
	 */
	public async encrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		const content: EncryptContent = { message: wembatMessage, key: publicKey };
		return this.bridge.invoke<WembatActionResponse<WembatMessage>>(BridgeMessageType.Encrypt, content);
	}

	/**
	 * Decrypts a Wembat message using the provided public key.
	 * 
	 * @param wembatMessage - The Wembat message to decrypt.
	 * @param publicKey - The public key used for decryption.
	 * @returns A promise that resolves to a WembatActionResponse containing the decrypted Wembat message.
	 */
	public async decrypt (wembatMessage: WembatMessage, publicKey: CryptoKey): Promise<WembatActionResponse<WembatMessage>> {
		const content: DecryptContent = { message: wembatMessage, key: publicKey };
		return this.bridge.invoke<WembatActionResponse<WembatMessage>>(BridgeMessageType.Decrypt, content);
	}

	/**
	 * Registers a user device with the provided email address.
	 * 
	 * @param userMail - The email address of the user to register.
	 * @returns A Promise that resolves to a WembatActionResponse containing the registration result.
	 */
	public async register (userMail: string, autoRegister: boolean = false): Promise<WembatActionResponse<WembatRegisterResult>> {
		const content: RegisterContent = { userMail, autoRegister };
		return this.bridge.invoke<WembatActionResponse<WembatRegisterResult>>(BridgeMessageType.Register, content);
	}

	/**
	 * Logs in the user with the specified email address.
	 * @param userMail The email address of the user.
	 * @returns A promise that resolves to a WembatActionResponse containing the login result.
	 */
	public async login (userMail: string, autoLogin: boolean = false): Promise<WembatActionResponse<WembatLoginResult>> {
		const content: LoginContent = { userMail, autoLogin };
		return this.bridge.invoke<WembatActionResponse<WembatLoginResult>>(BridgeMessageType.Login, content);
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
		const content: LinkContent = {};
		return this.bridge.invoke<WembatActionResponse<WembatLinkResult>>(BridgeMessageType.Link, content);
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