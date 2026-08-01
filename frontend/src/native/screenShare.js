import { registerPlugin } from '@capacitor/core';

const webImplementation = () => ({
  isSupported: async () => ({ supported: false }),
  startCapture: async () => {
    throw new Error('Native screen sharing is only available in the iOS app');
  },
  stopCapture: async () => {},
  createOffer: async () => {
    throw new Error('Native screen sharing is only available in the iOS app');
  },
  setRemoteDescription: async () => {
    throw new Error('Native screen sharing is only available in the iOS app');
  },
  addIceCandidate: async () => {},
  cleanup: async () => {},
});

export const ScreenShare = registerPlugin('ScreenShare', { web: webImplementation });
