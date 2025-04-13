//// typescript
// filepath: /home/lukas/Source/wembat/src/functions/token.test.ts

import { describe, it, beforeEach, vi, expect, Mock } from "vitest";
import { token } from "./token";
import {
	AxiosHeaders,
	type AxiosInstance,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";
import { jwtDecode } from "./helper";

// Mock helper functions
vi.mock("./helper", () => ({
	jwtDecode: vi.fn(),
}));

describe("token", () => {
	let mockAxiosClient: Partial<AxiosInstance>;
	const currentTime = Math.floor(Date.now() / 1000);

	beforeEach(() => {
		vi.clearAllMocks();
		mockAxiosClient = {
			post: vi.fn() as Mock,
		};
	});

	it("should return error if jwtString is undefined", async () => {
		const result = await token(mockAxiosClient as AxiosInstance, undefined);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("JWT token is undefined!");
	});

	it("should return the same token if it is not expired", async () => {
		const validJWT = "valid.jwt.token";
		// jwtDecode returns an object with exp in the future
		(jwtDecode as Mock).mockReturnValue({
			exp: currentTime + 1000,
			userMail: "test@mail.com",
			sessionId: "session123",
		});

		const result = await token(mockAxiosClient as AxiosInstance, validJWT);
		expect(result.success).toBe(true);
		expect(result.result.token).toBe(validJWT);
	});

	it("should refresh token if expired and axiosClient returns status 200", async () => {
		const expiredJWT = "expired.jwt.token";
		(jwtDecode as Mock).mockReturnValue({
			exp: currentTime - 100,
			userMail: "test@mail.com",
			sessionId: "session123",
		});

		// Mock axiosClient.post to return a refreshed token
		const refreshedToken = "new.jwt.token";
		const axiosResponse: AxiosResponse = {
			status: 200,
			data: JSON.stringify({ token: refreshedToken }),
			statusText: "OK",
			headers: {},
			config: {
				headers: new AxiosHeaders(),
			},
		};
		(mockAxiosClient.post as Mock).mockResolvedValue(axiosResponse);

		const result = await token(mockAxiosClient as AxiosInstance, expiredJWT);
		expect(mockAxiosClient.post).toHaveBeenCalledWith(
			`/refresh-token`,
			{
				userInfo: {
					userMail: "test@mail.com",
					sessionId: "session123",
				},
			},
			{ withCredentials: true }
		);
		expect(result.success).toBe(true);
		expect(result.result.token).toBe(refreshedToken);
	});

	it("should return error if refresh endpoint does not return status 200", async () => {
		const expiredJWT = "expired.jwt.token";
		(jwtDecode as Mock).mockReturnValue({
			exp: currentTime - 100,
			userMail: "test@mail.com",
			sessionId: "session123",
		});

		const axiosResponse: AxiosResponse = {
			status: 400,
			data: "Refresh failed",
			statusText: "Bad Request",
			headers: {},
			config: {
				headers: new AxiosHeaders(),
			},
		};
		(mockAxiosClient.post as Mock).mockResolvedValue(axiosResponse);

		const result = await token(mockAxiosClient as AxiosInstance, expiredJWT);
		expect(result.success).toBe(false);
		expect(result.error.error).toBe("Refresh failed");
	});
});
