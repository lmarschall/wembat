import {
	browserSupportsWebAuthn,
	startRegistration,
} from "@simplewebauthn/browser";
import {
	RegisterResponse,
	RequestRegisterResponse,
	WembatActionResponse,
	WembatError,
	WembatRegisterResult,
} from "../types";
import {
	PublicKeyCredentialCreationOptionsJSON,
	RegistrationResponseJSON,
} from "@simplewebauthn/typescript-types";
import { AxiosInstance } from "axios";

/**
 * Registers a user with the specified user ID.
 *
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @param userMail - The email address of the user to register.
 * @returns A promise that resolves to a `WembatActionResponse` containing the registration result.
 */
export async function register(
	axiosClient: AxiosInstance,
	userMail: string
): Promise<WembatActionResponse<WembatRegisterResult>> {
	const actionResponse: WembatActionResponse<WembatRegisterResult> = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatRegisterResult,
	};

	try {
		if (!browserSupportsWebAuthn())
			throw Error("WebAuthn is not supported on this browser!");

		const requestRegisterResponse = await axiosClient.post<string>(
			`/request-register`,
			{
				userInfo: { userMail: userMail },
			}
		);

		if (requestRegisterResponse.status !== 200) {
			// i guess we need to handle errors here
			throw Error(requestRegisterResponse.data);
		}

		const requestRegisterResponseData: RequestRegisterResponse = JSON.parse(
			requestRegisterResponse.data
		);
		const challengeOptions: PublicKeyCredentialCreationOptionsJSON =
			requestRegisterResponseData.options;

		// const auth1Credential = await navigator.credentials.create(challengeOptions);

		const credentials: RegistrationResponseJSON = await startRegistration(
			challengeOptions
		).catch((err: string) => {
			throw Error(err);
		});

		if (credentials.clientExtensionResults !== undefined) {
			const credentialExtensions = credentials.clientExtensionResults as any;

			if (credentialExtensions.prf?.enabled == false) {
				throw Error("PRF extension disabled");
			}
		}

		const registerResponse = await axiosClient.post<string>(`/register`, {
			registerChallengeResponse: {
				credentials: credentials,
				challenge: challengeOptions.challenge,
			},
		});

		if (registerResponse.status !== 200) {
			// i guess we need to handle errors here
			throw Error(registerResponse.data);
		}

		const registerResponseData: RegisterResponse = JSON.parse(
			registerResponse.data
		);

		const registerResult: WembatRegisterResult = {
			verified: registerResponseData.verified,
		};
		actionResponse.result = registerResult;
		actionResponse.success = true;
		return actionResponse;
	} catch (error: Error | unknown) {
		if (error instanceof Error) {
			actionResponse.error = {
				error: error.message,
			};
			console.error(error);
			return actionResponse;
		} else {
			throw Error("Unknown Error:");
		}
	}
}
