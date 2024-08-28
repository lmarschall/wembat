import axios from "axios";
import { login } from "./login";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("login", () => {
	let axiosClient: any;
	let userMail: string;

	beforeEach(() => {
		axiosClient = axios.create();
		userMail = "test@example.com";
	});

	afterEach(() => {
		axiosClient = null;
		userMail = "";
	});

	it("should throw an error if WebAuthn is not supported on the browser", async () => {
		// Mock browserSupportsWebAuthn to return false
		// jest.spyOn(window, 'browserSupportsWebAuthn').mockReturnValue(false);

		await expect(login(axiosClient, userMail)).rejects.toThrowError(
			"WebAuthn is not supported on this browser!"
		);
	});

	it("should make a request to /request-login and throw an error if the response status is not 200", async () => {
		// Mock axiosClient.post to return a non-200 response
		// jest.spyOn(axiosClient, 'post').mockResolvedValueOnce({
		//   status: 500,
		//   data: 'Internal Server Error',
		// });

		await expect(login(axiosClient, userMail)).rejects.toThrowError(
			"Internal Server Error"
		);
	});

	it("should make a request to /login and throw an error if the response status is not 200", async () => {
		// Mock axiosClient.post to return a non-200 response
		// jest.spyOn(axiosClient, 'post').mockResolvedValueOnce({
		//   status: 500,
		//   data: 'Internal Server Error',
		// });

		await expect(login(axiosClient, userMail)).rejects.toThrowError(
			"Internal Server Error"
		);
	});

	it("should return an array containing the action response, private key, public key, and JWT", async () => {
		// Mock axiosClient.post to return a successful response
		// jest.spyOn(axiosClient, 'post').mockResolvedValueOnce({
		//   status: 200,
		//   data: JSON.stringify({
		//     verified: true,
		//     jwt: 'fake-jwt',
		//     publicUserKey: 'fake-public-key',
		//     privateUserKeyEncrypted: 'fake-encrypted-private-key',
		//     nonce: 'fake-nonce',
		//     sessionId: 'fake-session-id',
		//   }),
		// });

		const [actionResponse, privateKey, publicKey, jwt] = await login(
			axiosClient,
			userMail
		);

		expect(actionResponse.success).toBe(true);
		expect(actionResponse.error).toEqual({});
		expect(actionResponse.result).toEqual({
			verified: true,
			jwt: "fake-jwt",
		});
		expect(privateKey).toBeDefined();
		expect(publicKey).toBeDefined();
		expect(jwt).toBe("fake-jwt");
	});
});
