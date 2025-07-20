import {
  nextFrame,
  nextFrames,
  idle,
  waitForDOMReady,
  waitForWindowLoad,
  waitForVisibilityChange,
  createFrameBasedDelay,
  createIdleDelay,
  isRequestAnimationFrameAvailable,
  isRequestIdleCallbackAvailable,
  getEnvironmentCapabilities
} from '../../src/utils/browser';
import { DelayError, DelayErrorCode } from '../../src/types/index';

// Mock browser APIs
const mockRequestAnimationFrame = jest.fn();
const mockCancelAnimationFrame = jest.fn();
const mockRequestIdleCallback = jest.fn();
const mockCancelIdleCallback = jest.fn();

// Mock document
const mockDocument = {
  readyState: 'loading',
  hidden: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Mock window
const mockWindow = {
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

describe('Browser Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDocument.readyState = 'loading';
    mockDocument.hidden = false;
    
    // Reset global mocks
    (global as any).requestAnimationFrame = mockRequestAnimationFrame;
    (global as any).cancelAnimationFrame = mockCancelAnimationFrame;
    (global as any).requestIdleCallback = mockRequestIdleCallback;
    (global as any).cancelIdleCallback = mockCancelIdleCallback;
    (global as any).document = mockDocument;
    (global as any).window = mockWindow;
  });

  afterEach(() => {
    // Clean up globals
    delete (global as any).requestAnimationFrame;
    delete (global as any).cancelAnimationFrame;
    delete (global as any).requestIdleCallback;
    delete (global as any).cancelIdleCallback;
    delete (global as any).document;
    delete (global as any).window;
  });

  describe('nextFrame', () => {
    it('should resolve with frame timestamp when requestAnimationFrame is available', async () => {
      const expectedTimestamp = 123.456;
      mockRequestAnimationFrame.mockImplementation((callback) => {
        setTimeout(() => callback(expectedTimestamp), 0);
        return 1;
      });

      const promise = nextFrame();
      const result = await promise;

      expect(result).toBe(expectedTimestamp);
      expect(mockRequestAnimationFrame).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should throw error when requestAnimationFrame is not available', () => {
      delete (global as any).requestAnimationFrame;

      expect(() => nextFrame()).toThrow(DelayError);
      expect(() => nextFrame()).toThrow('requestAnimationFrame is not available');
    });

    it('should throw error with correct error code', () => {
      delete (global as any).requestAnimationFrame;

      try {
        nextFrame();
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.UNSUPPORTED_ENVIRONMENT);
        expect((error as DelayError).details).toEqual({ feature: 'requestAnimationFrame' });
      }
    });
  });

  describe('nextFrames', () => {
    it('should resolve after specified number of frames', async () => {
      let frameCount = 0;
      mockRequestAnimationFrame.mockImplementation((callback) => {
        setTimeout(() => callback(++frameCount * 16.67), 0);
        return frameCount;
      });

      const promise = nextFrames(3);
      const result = await promise;

      expect(result).toBe(3 * 16.67);
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(3);
    });

    it('should handle single frame', async () => {
      mockRequestAnimationFrame.mockImplementation((callback) => {
        setTimeout(() => callback(16.67), 0);
        return 1;
      });

      const result = await nextFrames(1);
      expect(result).toBe(16.67);
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);
    });

    it('should throw error for invalid frame count', () => {
      expect(() => nextFrames(0)).toThrow(DelayError);
      expect(() => nextFrames(-1)).toThrow(DelayError);
      expect(() => nextFrames(-5)).toThrow(DelayError);
    });

    it('should throw error with correct details for invalid count', () => {
      try {
        nextFrames(-1);
      } catch (error) {
        expect(error).toBeInstanceOf(DelayError);
        expect((error as DelayError).code).toBe(DelayErrorCode.INVALID_OPTIONS);
        expect((error as DelayError).details).toEqual({ count: -1 });
      }
    });
  });

  describe('idle', () => {
    it('should resolve with idle deadline when requestIdleCallback is available', async () => {
      const mockDeadline = {
        didTimeout: false,
        timeRemaining: jest.fn(() => 30)
      };

      mockRequestIdleCallback.mockImplementation((callback) => {
        setTimeout(() => callback(mockDeadline), 0);
        return 1;
      });

      const result = await idle();

      expect(result).toBe(mockDeadline);
      expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {});
    });

    it('should pass options to requestIdleCallback', async () => {
      const options = { timeout: 1000 };
      const mockDeadline = {
        didTimeout: false,
        timeRemaining: jest.fn(() => 30)
      };

      mockRequestIdleCallback.mockImplementation((callback) => {
        setTimeout(() => callback(mockDeadline), 0);
        return 1;
      });

      await idle(options);

      expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), options);
    });

    it('should provide fallback when requestIdleCallback is not available', async () => {
      delete (global as any).requestIdleCallback;

      const result = await idle();

      expect(result.didTimeout).toBe(false);
      expect(result.timeRemaining()).toBe(50);
    });

    it('should handle timeout option with fallback', async () => {
      delete (global as any).requestIdleCallback;

      const promise = idle({ timeout: 100 });
      
      // Should not throw and should resolve
      const result = await promise;
      expect(result.didTimeout).toBe(false);
    });
  });

  describe('waitForDOMReady', () => {
    it('should resolve immediately if document is already ready', async () => {
      mockDocument.readyState = 'complete';

      const result = await waitForDOMReady();
      expect(result).toBeUndefined();
      expect(mockDocument.addEventListener).not.toHaveBeenCalled();
    });

    it('should resolve immediately if document is interactive', async () => {
      mockDocument.readyState = 'interactive';

      const result = await waitForDOMReady();
      expect(result).toBeUndefined();
      expect(mockDocument.addEventListener).not.toHaveBeenCalled();
    });

    it('should wait for DOMContentLoaded event if document is loading', async () => {
      mockDocument.readyState = 'loading';
      
      mockDocument.addEventListener.mockImplementation((event, handler) => {
        if (event === 'DOMContentLoaded') {
          setTimeout(() => handler(), 0);
        }
      });

      const result = await waitForDOMReady();

      expect(result).toBeUndefined();
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
      expect(mockDocument.removeEventListener).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });

    it('should throw error when document is not available', () => {
      delete (global as any).document;

      expect(() => waitForDOMReady()).toThrow(DelayError);
      expect(() => waitForDOMReady()).toThrow('DOM is not available');
    });
  });

  describe('waitForWindowLoad', () => {
    it('should resolve immediately if document is already complete', async () => {
      mockDocument.readyState = 'complete';

      const result = await waitForWindowLoad();
      expect(result).toBeUndefined();
      expect(mockWindow.addEventListener).not.toHaveBeenCalled();
    });

    it('should wait for load event if document is not complete', async () => {
      mockDocument.readyState = 'loading';
      
      mockWindow.addEventListener.mockImplementation((event, handler) => {
        if (event === 'load') {
          setTimeout(() => handler(), 0);
        }
      });

      const result = await waitForWindowLoad();

      expect(result).toBeUndefined();
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('load', expect.any(Function));
      expect(mockWindow.removeEventListener).toHaveBeenCalledWith('load', expect.any(Function));
    });

    it('should throw error when window is not available', () => {
      delete (global as any).window;

      expect(() => waitForWindowLoad()).toThrow(DelayError);
      expect(() => waitForWindowLoad()).toThrow('Window is not available');
    });
  });

  describe('waitForVisibilityChange', () => {
    it('should resolve immediately if visibility matches target', async () => {
      mockDocument.hidden = false;

      const result = await waitForVisibilityChange(true);
      expect(result).toBeUndefined();
      expect(mockDocument.addEventListener).not.toHaveBeenCalled();
    });

    it('should wait for visibility change event', async () => {
      mockDocument.hidden = true; // Currently hidden
      
      mockDocument.addEventListener.mockImplementation((event, handler) => {
        if (event === 'visibilitychange') {
          setTimeout(() => {
            mockDocument.hidden = false; // Become visible
            handler();
          }, 0);
        }
      });

      const result = await waitForVisibilityChange(true);

      expect(result).toBeUndefined();
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(mockDocument.removeEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
    });

    it('should continue listening until target visibility is reached', async () => {
      mockDocument.hidden = true;
      let eventHandler: Function | undefined;
      
      mockDocument.addEventListener.mockImplementation((event, handler) => {
        if (event === 'visibilitychange') {
          eventHandler = handler;
        }
      });

      const promise = waitForVisibilityChange(true);

      // First event - still hidden
      mockDocument.hidden = true;
      if (eventHandler) eventHandler();

      // Second event - now visible
      setTimeout(() => {
        mockDocument.hidden = false;
        if (eventHandler) eventHandler();
      }, 10);

      const result = await promise;
      expect(result).toBeUndefined();
    });

    it('should throw error when document is not available', () => {
      delete (global as any).document;

      expect(() => waitForVisibilityChange(true)).toThrow(DelayError);
      expect(() => waitForVisibilityChange(true)).toThrow('Document is not available');
    });
  });

  describe('createFrameBasedDelay', () => {
    it('should be an alias for nextFrames', async () => {
      mockRequestAnimationFrame.mockImplementation((callback) => {
        setTimeout(() => callback(16.67), 0);
        return 1;
      });

      const result = await createFrameBasedDelay(1);
      expect(result).toBe(16.67);
      expect(mockRequestAnimationFrame).toHaveBeenCalledTimes(1);
    });
  });

  describe('createIdleDelay', () => {
    it('should be an alias for idle with timeout', async () => {
      const mockDeadline = {
        didTimeout: false,
        timeRemaining: jest.fn(() => 30)
      };

      mockRequestIdleCallback.mockImplementation((callback) => {
        setTimeout(() => callback(mockDeadline), 0);
        return 1;
      });

      const result = await createIdleDelay(1000);

      expect(result).toBe(mockDeadline);
      expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 1000 });
    });

    it('should use default timeout', async () => {
      const mockDeadline = {
        didTimeout: false,
        timeRemaining: jest.fn(() => 30)
      };

      mockRequestIdleCallback.mockImplementation((callback) => {
        setTimeout(() => callback(mockDeadline), 0);
        return 1;
      });

      await createIdleDelay();

      expect(mockRequestIdleCallback).toHaveBeenCalledWith(expect.any(Function), { timeout: 5000 });
    });
  });

  describe('isRequestAnimationFrameAvailable', () => {
    it('should return true when requestAnimationFrame is available', () => {
      expect(isRequestAnimationFrameAvailable()).toBe(true);
    });

    it('should return false when requestAnimationFrame is not available', () => {
      delete (global as any).requestAnimationFrame;
      expect(isRequestAnimationFrameAvailable()).toBe(false);
    });
  });

  describe('isRequestIdleCallbackAvailable', () => {
    it('should return true when requestIdleCallback is available', () => {
      expect(isRequestIdleCallbackAvailable()).toBe(true);
    });

    it('should return false when requestIdleCallback is not available', () => {
      delete (global as any).requestIdleCallback;
      expect(isRequestIdleCallbackAvailable()).toBe(false);
    });
  });

  describe('getEnvironmentCapabilities', () => {
    it('should return all capabilities when available', () => {
      (global as any).performance = { now: jest.fn() };

      const capabilities = getEnvironmentCapabilities();

      expect(capabilities).toEqual({
        hasRequestAnimationFrame: true,
        hasRequestIdleCallback: true,
        hasPerformanceNow: true,
        hasDocument: true,
        hasWindow: true
      });
    });

    it('should return false for missing capabilities', () => {
      delete (global as any).requestAnimationFrame;
      delete (global as any).requestIdleCallback;
      delete (global as any).performance;
      delete (global as any).document;
      delete (global as any).window;

      const capabilities = getEnvironmentCapabilities();

      expect(capabilities).toEqual({
        hasRequestAnimationFrame: false,
        hasRequestIdleCallback: false,
        hasPerformanceNow: false,
        hasDocument: false,
        hasWindow: false
      });
    });

    it('should handle partial availability', () => {
      delete (global as any).requestIdleCallback;
      delete (global as any).performance;
      (global as any).performance = {}; // performance exists but no .now

      const capabilities = getEnvironmentCapabilities();

      expect(capabilities.hasRequestAnimationFrame).toBe(true);
      expect(capabilities.hasRequestIdleCallback).toBe(false);
      expect(capabilities.hasPerformanceNow).toBe(false);
      expect(capabilities.hasDocument).toBe(true);
      expect(capabilities.hasWindow).toBe(true);
    });
  });
});