import { browserSupportsWebAuthn, startRegistration, } from "@simplewebauthn/browser";
/**
 * Registers a user with the specified user ID.
 *
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @param userMail - The email address of the user to register.
 * @returns A promise that resolves to a `WembatActionResponse` containing the registration result.
 */
export async function register(axiosClient, userMail, autoRegister = false) {
    const actionResponse = {
        success: false,
        error: {},
        result: {},
    };
    try {
        if (!browserSupportsWebAuthn())
            throw Error("WebAuthn is not supported on this browser!");
        const requestRegisterResponse = await axiosClient.post(`/request-register`, {
            userInfo: { userMail: userMail },
        });
        if (requestRegisterResponse.status !== 200) {
            // i guess we need to handle errors here
            throw Error(requestRegisterResponse.data);
        }
        const requestRegisterResponseData = JSON.parse(requestRegisterResponse.data);
        const credentials = await startRegistration({
            optionsJSON: requestRegisterResponseData.options,
            useAutoRegister: autoRegister,
        }).catch((err) => {
            throw Error(err);
        });
        if (credentials.clientExtensionResults !== undefined) {
            const credentialExtensions = credentials.clientExtensionResults;
            if (credentialExtensions.prf?.enabled == false) {
                throw Error("PRF extension disabled");
            }
        }
        const registerResponse = await axiosClient.post(`/register`, {
            registerChallengeResponse: {
                credentials: credentials,
                challenge: requestRegisterResponseData.options.challenge,
            },
        });
        if (registerResponse.status !== 200) {
            // i guess we need to handle errors here
            throw Error(registerResponse.data);
        }
        const registerResponseData = JSON.parse(registerResponse.data);
        const registerResult = {
            verified: registerResponseData.verified,
        };
        actionResponse.result = registerResult;
        actionResponse.success = true;
        return actionResponse;
    }
    catch (error) {
        if (error instanceof Error) {
            actionResponse.error = {
                error: error.message,
            };
            console.error(error);
            return actionResponse;
        }
        else {
            throw Error("Unknown Error:");
        }
    }
}
//# sourceMappingURL=register.js.map