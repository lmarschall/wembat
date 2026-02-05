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
} from "@simplewebauthn/types";
import { AxiosInstance } from "axios";
import { Bridge, BridgeMessageType, StartRegistrationContent } from "../bridge";

/**
 * Registers a user with the specified user ID.
 *
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @param userMail - The email address of the user to register.
 * @returns A promise that resolves to a `WembatActionResponse` containing the registration result.
 */
export async function register(
	axiosClient: AxiosInstance,
	bridge: Bridge,
	userMail: string,
	autoRegister = false
): Promise<WembatActionResponse<WembatRegisterResult>> {
	const actionResponse: WembatActionResponse<WembatRegisterResult> = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatRegisterResult,
	};

	try {
		const requestRegisterResponse = await axiosClient.post<string>(
			`/request-register`,
			{
				userInfo: { userMail: userMail },
			}
		);

		if (requestRegisterResponse.status !== 200) throw new Error(requestRegisterResponse.data);

		const requestRegisterResponseData: RequestRegisterResponse = JSON.parse(
			requestRegisterResponse.data
		);

		const content: StartRegistrationContent = { challengeOptions: requestRegisterResponseData };
		const credentials: RegistrationResponseJSON = await bridge.invoke(BridgeMessageType.StartRegistration, content);

		if (credentials.clientExtensionResults !== undefined) {
			const credentialExtensions = credentials.clientExtensionResults as any;

			if (!credentialExtensions.prf?.enabled) throw new Error("PRF extension disabled");
		}

		const registerResponse = await axiosClient.post<string>(`/register`, {
			registerChallengeResponse: {
				credentials: credentials,
				challenge: requestRegisterResponseData.options.challenge,
			},
		});

		if (registerResponse.status !== 200) 
			throw new Error(registerResponse.data);

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
				message: error.message,
			};
			console.error(error);
			return actionResponse;
		} else {
			throw new Error("Unknown Error:");
		}
	}
}
