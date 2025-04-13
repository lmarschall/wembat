import {
	browserSupportsWebAuthn,
	startRegistration,
} from "@simplewebauthn/browser";
import {
	RegisterResponse,
	RequestLinkResponse,
	RequestRegisterResponse,
	WembatActionResponse,
	WembatError,
	WembatLinkResult,
	WembatRegisterResult,
} from "../types";
import {
	PublicKeyCredentialCreationOptionsJSON,
	RegistrationResponseJSON,
} from "@simplewebauthn/types";
import { AxiosInstance } from "axios";

/**
 * Links a new device to the user's account.
 *
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @returns A promise that resolves to a `WembatActionResponse` containing the registration result.
 */
export async function link(
	axiosClient: AxiosInstance
): Promise<WembatActionResponse<WembatRegisterResult>> {
	const actionResponse: WembatActionResponse<WembatRegisterResult> = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatRegisterResult,
	};

	try {
		if (!browserSupportsWebAuthn())
			throw Error("WebAuthn is not supported on this browser!");

		const requestLinkResponse = await axiosClient.post<string>(
			`/request-link`,
			{}
		);

		if (requestLinkResponse.status !== 200) {
			// i guess we need to handle errors here
			throw Error(requestLinkResponse.data);
		}

		const requestLinkResponseData: RequestLinkResponse = JSON.parse(
			requestLinkResponse.data
		);

		const credentials: RegistrationResponseJSON = await startRegistration({
			optionsJSON: requestLinkResponseData.options,
			useAutoRegister: false,
		}).catch((err: string) => {
			throw Error(err);
		});

		if (credentials.clientExtensionResults !== undefined) {
			const credentialExtensions = credentials.clientExtensionResults as any;

			if (credentialExtensions.prf?.enabled == false) {
				throw Error("PRF extension disabled");
			}
		}

		const linkResponse = await axiosClient.post<string>(`/link`, {
			linkChallengeResponse: {
				credentials: credentials,
				challenge: requestLinkResponseData.options.challenge,
			},
		});

		if (linkResponse.status !== 200) {
			// i guess we need to handle errors here
			throw Error(linkResponse.data);
		}

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
				error: error.message,
			};
			console.error(error);
			return actionResponse;
		} else {
			throw Error("Unknown Error:");
		}
	}
}
