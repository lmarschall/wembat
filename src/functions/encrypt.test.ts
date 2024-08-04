import { encrypt } from './encrypt';
import { ab2str, deriveEncryptionKey } from '../helper';
import { WembatMessage } from '../types';
import { beforeEach, describe, expect, it } from 'vitest';

// Mock the necessary functions and objects
// jest.mock('../helper', () => ({
//   ab2str: jest.fn(),
//   deriveEncryptionKey: jest.fn(),
// }));

describe('encrypt', () => {
  const privateKey = {} as CryptoKey;
  const publicKey = {} as CryptoKey;
  const wembatMessage: WembatMessage = {
    message: 'Hello, World!',
    iv: 'randomIV',
    encrypted: 'encryptedMessage',
  };

  beforeEach(() => {
    // Clear mock function calls and return values
    // (ab2str as jest.Mock).mockClear();
    // (deriveEncryptionKey as jest.Mock).mockClear();
  });

  it('should encrypt the Wembat message', async () => {
    // Mock the necessary functions and return values
    // (deriveEncryptionKey as jest.Mock).mockResolvedValue({});
    // (window.crypto.getRandomValues as jest.Mock).mockReturnValue(new Uint8Array(12));
    // (window.crypto.subtle.encrypt as jest.Mock).mockResolvedValue(new ArrayBuffer(16));
    // (ab2str as jest.Mock).mockReturnValue('encrypted');

    const result = await encrypt(privateKey, wembatMessage, publicKey);

    expect(result.success).toBe(true);
    expect(result.error).toEqual({});
    expect(result.result).toEqual({
      encrypted: 'encrypted',
      iv: 'encrypted',
      message: '',
    });
    expect(deriveEncryptionKey).toHaveBeenCalledWith(privateKey, publicKey);
    expect(window.crypto.getRandomValues).toHaveBeenCalledWith(new Uint8Array(12));
    expect(window.crypto.subtle.encrypt).toHaveBeenCalledWith(
      {
        name: 'AES-GCM',
        iv: expect.any(Uint8Array),
      },
      {},
      expect.any(Uint8Array)
    );
    expect(ab2str).toHaveBeenCalledWith(new ArrayBuffer(16));
  });

  it('should handle the case when the private key is undefined', async () => {
    const result = await encrypt(undefined, wembatMessage, publicKey);

    expect(result.success).toBe(false);
    expect(result.error).toEqual({ error: expect.any(Error) });
    expect(result.result).toEqual({});
    expect(deriveEncryptionKey).not.toHaveBeenCalled();
    expect(window.crypto.getRandomValues).not.toHaveBeenCalled();
    expect(window.crypto.subtle.encrypt).not.toHaveBeenCalled();
    expect(ab2str).not.toHaveBeenCalled();
  });

  it('should handle errors during encryption', async () => {
    // Mock the necessary functions and return values
    // (deriveEncryptionKey as jest.Mock).mockRejectedValue(new Error('Encryption error'));

    const result = await encrypt(privateKey, wembatMessage, publicKey);

    expect(result.success).toBe(false);
    expect(result.error).toEqual({ error: expect.any(Error) });
    expect(result.result).toEqual({});
    expect(deriveEncryptionKey).toHaveBeenCalledWith(privateKey, publicKey);
    expect(window.crypto.getRandomValues).not.toHaveBeenCalled();
    expect(window.crypto.subtle.encrypt).not.toHaveBeenCalled();
    expect(ab2str).not.toHaveBeenCalled();
  });
});