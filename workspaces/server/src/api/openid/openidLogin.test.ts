import { Request, Response } from "express";

// --- 1. OPENID-CLIENT MOCK ---
const mockGeneratorsState = jest.fn();

// We mock the generators object from openid-client
jest.mock("openid-client", () => ({
  __esModule: true,
  generators: {
    state: mockGeneratorsState,
  },
  // BaseClient is just a type here, but we can provide a dummy if needed
  BaseClient: jest.fn(), 
}));

// --- 2. DYNAMIC IMPORT OF CONTROLLER ---
// Load openidLogin AFTER the mocks are registered
const { openidLogin } = require("./openidLogin");

describe("testOpenidLogin", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let mockOpenidClient: any;

  beforeEach(() => {
    // Crucial: define session object on req so it doesn't crash when assigning githubState
    req = {
      query: {},
      session: {} as any, 
    };
    res = {
      redirect: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    
    // Create a fresh mock client for every test
    mockOpenidClient = {
      authorizationUrl: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("should return 400 if openidClient is undefined", async () => {
    // Pass undefined instead of mockOpenidClient
    await openidLogin(req as Request, res as Response, undefined);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("openid client undefined");
  });

  it("should return 400 if requestId parameter is missing", async () => {
    // req.query.requestId is intentionally left empty
    await openidLogin(req as Request, res as Response, mockOpenidClient);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("missing requestId parameter");
  });

  it("should generate state, update session, and redirect successfully", async () => {
    req.query = { requestId: "test-request-id" };
    
    // Force the generator to return a predictable nonce
    mockGeneratorsState.mockReturnValue("mock-secure-nonce");
    
    // Mock the URL generator
    mockOpenidClient.authorizationUrl.mockReturnValue("https://github.com/login/oauth/authorize?mock=true");

    await openidLogin(req as Request, res as Response, mockOpenidClient);

    // 1. Verify session was updated for Anti-CSRF
    expect(req.session!.githubState).toBe("mock-secure-nonce");

    // 2. Calculate the expected Base64 state string
    const expectedStateObj = { requestId: "test-request-id", nonce: "mock-secure-nonce" };
    const expectedStateString = Buffer.from(JSON.stringify(expectedStateObj)).toString('base64');

    // 3. Verify the openid client was called with the correct parameters
    expect(mockOpenidClient.authorizationUrl).toHaveBeenCalledWith({
      scope: 'user:email read:user',
      state: expectedStateString,
    });

    // 4. Verify the redirect happened
    expect(res.redirect).toHaveBeenCalledWith("https://github.com/login/oauth/authorize?mock=true");
  });

  it("should return 400 if authorizationUrl throws an error", async () => {
    req.query = { requestId: "test-request-id" };
    mockGeneratorsState.mockReturnValue("mock-secure-nonce");
    
    // Simulate an internal failure in the OIDC client
    mockOpenidClient.authorizationUrl.mockImplementation(() => {
        throw new Error("Failed to generate URL");
    });

    await openidLogin(req as Request, res as Response, mockOpenidClient);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith("Failed to generate URL");
    expect(res.redirect).not.toHaveBeenCalled();
  });
});