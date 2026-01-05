/**
 * Mock de react-native-encrypted-storage para tests
 */
const EncryptedStorage = {
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
};

export default EncryptedStorage;


