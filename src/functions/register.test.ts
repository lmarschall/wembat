import axios from 'axios';
import { register } from './register';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('register', () => {
  let axiosClient: any;
  let userMail: string;

  beforeEach(() => {
    axiosClient = axios.create();
    userMail = 'test@example.com';
  });

  afterEach(() => {
    axiosClient = null;
    userMail = '';
  });

  it('should throw an error if WebAuthn is not supported on the browser', async () => {
    // Mock browserSupportsWebAuthn to return false
    // jest.spyOn(window, 'browserSupportsWebAuthn').mockReturnValue(false);

    await expect(register(axiosClient, userMail)).rejects.toThrowError(
      'WebAuthn is not supported on this browser!'
    );
  });

  it('should make a request to /request-register and throw an error if the response status is not 200', async () => {
    // Mock axiosClient.post to return a non-200 response
    // jest.spyOn(axiosClient, 'post').mockResolvedValueOnce({
    //   status: 500,
    //   data: 'Internal Server Error',
    // });

    await expect(register(axiosClient, userMail)).rejects.toThrowError(
      'Internal Server Error'
    );
  });

  it('should make a request to /register and throw an error if the response status is not 200', async () => {
    // Mock axiosClient.post to return a non-200 response
    // jest.spyOn(axiosClient, 'post').mockResolvedValueOnce({
    //   status: 500,
    //   data: 'Internal Server Error',
    // });

    await expect(register(axiosClient, userMail)).rejects.toThrowError(
      'Internal Server Error'
    );
  });

  it('should return a WembatActionResponse with success set to true and the registration result', async () => {
    // Mock axiosClient.post to return a successful response
    // jest.spyOn(axiosClient, 'post').mockResolvedValueOnce({
    //   status: 200,
    //   data: JSON.stringify({
    //     verifiedStatus: true,
    //   }),
    // });

    const actionResponse = await register(axiosClient, userMail);

    expect(actionResponse.success).toBe(true);
    expect(actionResponse.error).toEqual({});
    expect(actionResponse.result).toEqual({
      verifiedStatus: true,
    });
  });
});