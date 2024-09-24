import { AxiosInstance } from "axios";
import { ab2str, deriveEncryptionKey, jwtDecode } from "../helper";
import { TokenResponse, WembatActionResponse, WembatError, WembatMessage, WembatToken } from "../types";


export async function token (
	axiosClient: AxiosInstance,
    jwtString: string | undefined
): Promise<WembatActionResponse<WembatToken>> {
	const actionResponse = {
		success: false,
		error: {} as WembatError,
		result: {} as WembatToken,
	};

	try {

        if (!jwtString) throw Error("JWT token is undefined!");

        let tokenString = '';

        const decodedJWT = jwtDecode(jwtString);

        const currentTime = Math.floor(Date.now() / 1000);

        // if token is expired refresh it
        if (decodedJWT.exp && decodedJWT.exp < currentTime) {

            console.log('Token is expired, refreshing...');
            const requestTokenResponse: any = await axiosClient.post<string>(
                `/refresh-token`,
                {
                    userInfo: { userMail: decodedJWT.userMail, sessionId: decodedJWT.sessionId },
                },
                { withCredentials: true }
            );

            if (requestTokenResponse.status !== 200) {
                throw Error(requestTokenResponse.data);
            }

            const tokenResponseData: TokenResponse = JSON.parse(requestTokenResponse.data);

            tokenString = tokenResponseData.token;
        } else {
            tokenString = jwtString;
        }

        const token: WembatToken = {
            token: tokenString
        }
		actionResponse.result = token;
		actionResponse.success = true;
	} catch (error: any) {
		const errorMessage: WembatError = {
			error: error,
		};
		actionResponse.error = errorMessage;
		console.error(error);
	} finally {
		return actionResponse;
	}
}