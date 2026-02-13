import {
	RegisterResponse,
	RequestLinkResponse,
	WembatActionResponse,
	WembatError,
	WembatLinkResult,
	WembatRegisterResult,
} from "../types";
import {
	RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { AxiosInstance } from "axios";
import { Bridge, BridgeMessageType, StartRegistrationContent } from "../bridge";

/**
 * Links a new device to the user's account.
 *
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @returns A promise that resolves to a `WembatActionResponse` containing the registration result.
 */
export async function link(
	axiosClient: AxiosInstance,
	bridge: Bridge
): Promise<WembatActionResponse<WembatRegisterResult>> {
	const actionResponse: WembatActionResponse<WembatRegisterResult> = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatRegisterResult,
	};

	try {
		const requestLinkResponse = await axiosClient.post<string>(
			`/request-link`,
			{}
		);

		if (requestLinkResponse.status !== 200) throw new Error(requestLinkResponse.data);

		const requestLinkResponseData: RequestLinkResponse = JSON.parse(
			requestLinkResponse.data
		);

		const content: StartRegistrationContent = { challengeOptions: requestLinkResponseData, autoRegister: false };
		const credentials: RegistrationResponseJSON = await bridge.invoke(BridgeMessageType.StartRegistration, content);

		if (credentials.clientExtensionResults !== undefined) {
			const credentialExtensions = credentials.clientExtensionResults as any;

			if (!credentialExtensions.prf?.enabled) throw new Error("PRF extension disabled");
		}

		const linkResponse = await axiosClient.post<string>(`/link`, {
			linkChallengeResponse: {
				credentials: credentials,
				challenge: requestLinkResponseData.options.challenge,
			},
		});

		if (linkResponse.status !== 200) throw new Error(linkResponse.data);

		const linkResponseData: RegisterResponse = JSON.parse(linkResponse.data);

		const linkResult: WembatLinkResult = {
			verified: linkResponseData.verified,
		};
		actionResponse.result = linkResult;
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
