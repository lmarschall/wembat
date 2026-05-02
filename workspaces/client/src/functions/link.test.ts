// import { describe, it, expect, beforeEach, vi, Mock } from "vitest";
// import { link } from "./link";
// import { Bridge, BridgeMessageType } from "../bridge";
// import type { AxiosInstance } from "axios";

// describe("link", () => {
//     let mockAxiosClient: Partial<AxiosInstance>;
//     let mockBridge: Partial<Bridge>;

//     const mockRequestLinkResponseData = {
//         options: { challenge: "testChallenge" },
//     };
//     const validRegistrationResponse = {
//         clientExtensionResults: { prf: { enabled: true } },
//     };

//     beforeEach(() => {
//         vi.clearAllMocks();
        
//         mockAxiosClient = {
//             post: vi.fn(),
//         };

//         mockBridge = {
//             invoke: vi.fn(),
//         };
//     });

//     it("should return error if /request-link returns non-200", async () => {
//         (mockAxiosClient.post as Mock).mockResolvedValueOnce({
//             status: 400,
//             data: "Error from request-link",
//         });

//         const result = await link(
//             mockAxiosClient as AxiosInstance,
//             mockBridge as Bridge
//         );

//         expect(result.success).toBe(false);
//         expect(result.error.message).toBe("Error from request-link");
//     });

//     it("should return error if bridge.invoke (startRegistration) fails", async () => {
//         (mockAxiosClient.post as Mock).mockResolvedValueOnce({
//             status: 200,
//             data: JSON.stringify(mockRequestLinkResponseData),
//         });

//         (mockBridge.invoke as Mock).mockRejectedValueOnce(
//             new Error("startRegistration error")
//         );

//         const result = await link(
//             mockAxiosClient as AxiosInstance,
//             mockBridge as Bridge
//         );

//         expect(result.success).toBe(false);
//         expect(result.error.message).toBe("startRegistration error");
//     });

//     it("should return error if PRF extension is disabled", async () => {
//         (mockAxiosClient.post as Mock).mockResolvedValueOnce({
//             status: 200,
//             data: JSON.stringify(mockRequestLinkResponseData),
//         });

//         (mockBridge.invoke as Mock).mockResolvedValueOnce({
//             clientExtensionResults: { prf: { enabled: false } },
//         });

//         const result = await link(
//             mockAxiosClient as AxiosInstance,
//             mockBridge as Bridge
//         );

//         expect(result.success).toBe(false);
//         expect(result.error.message).toBe("PRF extension disabled");
//     });

//     it("should return error if /link returns non-200", async () => {
//         (mockAxiosClient.post as Mock)
//             // 1. Call: /request-link returns 200 and valid options
//             .mockResolvedValueOnce({
//                 status: 200,
//                 data: JSON.stringify(mockRequestLinkResponseData),
//             })
//             // 2. Call: /link returns non-200
//             .mockResolvedValueOnce({
//                 status: 400,
//                 data: "Error from link",
//             });

//         // Bridge returns a valid response
//         (mockBridge.invoke as Mock).mockResolvedValueOnce(validRegistrationResponse);

//         const result = await link(
//             mockAxiosClient as AxiosInstance,
//             mockBridge as Bridge
//         );

//         expect(result.success).toBe(false);
//         expect(result.error.message).toBe("Error from link");
//     });

//     it("should return success and verify parameters if linking succeeds", async () => {
//         const registerResponse = { verified: true };
        
//         (mockAxiosClient.post as Mock)
//             // 1. Call: /request-link
//             .mockResolvedValueOnce({
//                 status: 200,
//                 data: JSON.stringify(mockRequestLinkResponseData),
//             })
//             // 2. Call: /link
//             .mockResolvedValueOnce({
//                 status: 200,
//                 data: JSON.stringify(registerResponse),
//             });

//         (mockBridge.invoke as Mock).mockResolvedValueOnce(validRegistrationResponse);

//         const result = await link(
//             mockAxiosClient as AxiosInstance,
//             mockBridge as Bridge
//         );

//         // Verify that the Bridge was called with correct arguments
//         expect(mockBridge.invoke).toHaveBeenCalledWith(
//             BridgeMessageType.StartRegistration,
//             {
//                 challengeOptions: mockRequestLinkResponseData,
//                 autoRegister: false,
//             }
//         );

//         // Verify that the final Axios post was called with correctly structured data
//         expect(mockAxiosClient.post).toHaveBeenNthCalledWith(2, `/link`, {
//             linkChallengeResponse: {
//                 credentials: validRegistrationResponse,
//                 challenge: "testChallenge",
//             },
//         });

//         expect(result.success).toBe(true);
//         expect(result.result.verified).toBe(true);
//     });
// });