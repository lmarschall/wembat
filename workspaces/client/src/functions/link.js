import { browserSupportsWebAuthn, startRegistration, } from "@simplewebauthn/browser";
/**
 * Links a new device to the user's account.
 *
 * @param axiosClient - The Axios instance for making HTTP requests.
 * @returns A promise that resolves to a `WembatActionResponse` containing the registration result.
 */
export async function link(axiosClient) {
    const actionResponse = {
        success: false,
        error: {},
        result: {},
    };
    try {
        if (!browserSupportsWebAuthn())
            throw Error("WebAuthn is not supported on this browser!");
        const requestLinkResponse = await axiosClient.post(`/request-link`, {});
        if (requestLinkResponse.status !== 200) {
            // i guess we need to handle errors here
            throw Error(requestLinkResponse.data);
        }
        const requestLinkResponseData = JSON.parse(requestLinkResponse.data);
        const credentials = await startRegistration({
            optionsJSON: requestLinkResponseData.options,
            useAutoRegister: false,
        }).catch((err) => {
            throw Error(err);
        });
        if (credentials.clientExtensionResults !== undefined) {
            const credentialExtensions = credentials.clientExtensionResults;
            if (credentialExtensions.prf?.enabled == false) {
                throw Error("PRF extension disabled");
            }
        }
        const linkResponse = await axiosClient.post(`/link`, {
            linkChallengeResponse: {
                credentials: credentials,
                challenge: requestLinkResponseData.options.challenge,
            },
        });
        if (linkResponse.status !== 200) {
            // i guess we need to handle errors here
            throw Error(linkResponse.data);
        }
        const linkResponseData = JSON.parse(linkResponse.data);
        const linkResult = {
            verified: linkResponseData.verified,
        };
        actionResponse.result = linkResult;
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
//# sourceMappingURL=link.js.map