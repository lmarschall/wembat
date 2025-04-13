import { jwtDecode } from "./helper";
export async function token(axiosClient, jwtString) {
    const actionResponse = {
        success: false,
        error: {},
        result: {},
    };
    try {
        if (!jwtString)
            throw Error("JWT token is undefined!");
        let tokenString = "";
        const decodedJWT = jwtDecode(jwtString);
        const currentTime = Math.floor(Date.now() / 1000);
        // if token is expired refresh it
        if (decodedJWT.exp && decodedJWT.exp < currentTime) {
            console.log("Token is expired, refreshing...");
            const requestTokenResponse = await axiosClient.post(`/refresh-token`, {
                userInfo: {
                    userMail: decodedJWT.userMail,
                    sessionId: decodedJWT.sessionId,
                },
            }, { withCredentials: true });
            if (requestTokenResponse.status !== 200) {
                throw Error(requestTokenResponse.data);
            }
            const tokenResponseData = JSON.parse(requestTokenResponse.data);
            tokenString = tokenResponseData.token;
        }
        else {
            tokenString = jwtString;
        }
        const token = {
            token: tokenString,
        };
        actionResponse.result = token;
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
//# sourceMappingURL=token.js.map