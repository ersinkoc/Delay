import {
  createLoggingPlugin,
  createMetricsPlugin,
  createDebugPlugin
} from '../../src/plugins/plugin-manager';
import { DelayInstance } from '../../src/types/index';

describe('Plugin Functions', () => {
  let mockDelayInstance: DelayInstance;
  let consoleLogSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleDebugSpy: jest.SpyInstance;

  beforeEach(() => {

    // Create spies
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

    // Create a mock delay function
    const mockDelayFunction = jest.fn().mockResolvedValue(undefined);
    
    // Create mock delay instance with all required methods
    mockDelayInstance = Object.assign(mockDelayFunction, {
      ms: jest.fn(),
      seconds: jest.fn(),
      minutes: jest.fn(),
      hours: jest.fn(),
      days: jest.fn(),
      for: jest.fn(),
      until: jest.fn(),
      while: jest.fn(),
      cancellable: jest.fn(),
      retry: jest.fn(),
      repeat: jest.fn(),
      random: jest.fn(),
      between: jest.fn(),
      precise: jest.fn(),
      batch: jest.fn(),
      race: jest.fn(),
      timeout: jest.fn(),
      minimum: jest.fn(),
      throttle: jest.fn(),
      debounce: jest.fn(),
      nextFrame: jest.fn(),
      idle: jest.fn(),
      use: jest.fn(),
      bind: jest.fn(() => mockDelayFunction)
    }) as any;
  });

  afterEach(() => {
    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('createLoggingPlugin', () => {
    it('should create logging plugin with correct metadata', () => {
      const plugin = createLoggingPlugin();
      
      expect(plugin.name).toBe('logging');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.init).toBeDefined();
      expect(plugin.destroy).toBeDefined();
    });

    it('should log delay start and completion', async () => {
      const plugin = createLoggingPlugin();
      
      // Mock Date.now for timing
      const originalNow = Date.now;
      let currentTime = 1000;
      Date.now = jest.fn(() => currentTime);

      // Mock the original delay to simulate time passing
      const originalDelayMock = jest.fn().mockImplementation(() => {
        currentTime += 150;
        return Promise.resolve();
      });
      (mockDelayInstance.bind as jest.Mock).mockReturnValue(originalDelayMock);
      
      // Capture the wrapper function that Object.assign receives
      let wrapperFunc: any;
      jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
        if (typeof sources[0] === 'function') {
          wrapperFunc = sources[0];
        }
        return target;
      });

      // Initialize plugin
      plugin.init!(mockDelayInstance);
      
      // Verify Object.assign was called
      expect(Object.assign).toHaveBeenCalled();
      expect(wrapperFunc).toBeDefined();

      // Call the wrapper function
      await wrapperFunc.call(mockDelayInstance, 100);

      // Check logs
      expect(consoleLogSpy).toHaveBeenCalledWith('[delay] Starting delay of 100ms');
      expect(consoleLogSpy).toHaveBeenCalledWith('[delay] Delay completed in 150ms (target: 100ms)');

      Date.now = originalNow;
      jest.restoreAllMocks();
    });

    it('should pass options to original delay', async () => {
      const plugin = createLoggingPlugin();
      const options = { signal: new AbortController().signal };
      
      const originalDelayMock = jest.fn().mockResolvedValue(undefined);
      (mockDelayInstance.bind as jest.Mock).mockReturnValue(originalDelayMock);
      
      // Capture the wrapper function
      let wrapperFunc: any;
      jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
        if (typeof sources[0] === 'function') {
          wrapperFunc = sources[0];
        }
        return target;
      });
      
      plugin.init!(mockDelayInstance);
      
      await wrapperFunc.call(mockDelayInstance, 200, options);

      expect(originalDelayMock).toHaveBeenCalledWith(200, options);
      
      jest.restoreAllMocks();
    });

    it('should log destroy message', () => {
      const plugin = createLoggingPlugin();
      
      plugin.destroy!();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[delay] Logging plugin destroyed');
    });
  });

  describe('createMetricsPlugin', () => {
    it('should create metrics plugin with correct metadata', () => {
      const plugin = createMetricsPlugin();
      
      expect(plugin.name).toBe('metrics');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.init).toBeDefined();
      expect(plugin.destroy).toBeDefined();
    });

    it('should track delay metrics', async () => {
      const plugin = createMetricsPlugin();
      
      // Mock Date.now for timing
      const originalNow = Date.now;
      let currentTime = 1000;
      Date.now = jest.fn(() => currentTime);

      // Set up the original delay mock once
      const originalDelayMock = jest.fn().mockImplementation((delay: number) => {
        if (delay === 100) currentTime += 100;
        else if (delay === 200) currentTime += 200;
        else if (delay === 50) currentTime += 50;
        return Promise.resolve();
      });
      (mockDelayInstance.bind as jest.Mock).mockReturnValue(originalDelayMock);
      
      // Capture the wrapper function
      let wrapperFunc: any;
      jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
        if (typeof sources[0] === 'function') {
          wrapperFunc = sources[0];
        }
        return target;
      });

      // Initialize plugin
      plugin.init!(mockDelayInstance);
      
      // Check that getMetrics was added
      expect((mockDelayInstance as any).getMetrics).toBeDefined();

      // Reset time and call the wrapped delay multiple times
      currentTime = 1000;
      await wrapperFunc.call(mockDelayInstance, 100);
      
      currentTime = 2000;
      await wrapperFunc.call(mockDelayInstance, 200);
      
      currentTime = 3000;
      await wrapperFunc.call(mockDelayInstance, 50);

      // Check metrics
      const metrics = (mockDelayInstance as any).getMetrics();
      expect(metrics.totalDelays).toBe(3);
      expect(metrics.totalTime).toBe(350); // 100 + 200 + 50
      expect(metrics.averageDelay).toBeCloseTo(116.67, 1);
      expect(metrics.minDelay).toBe(50);
      expect(metrics.maxDelay).toBe(200);

      Date.now = originalNow;
      jest.restoreAllMocks();
    });

    it('should pass options to original delay', async () => {
      const plugin = createMetricsPlugin();
      const options = { signal: new AbortController().signal };
      
      const originalDelayMock = jest.fn().mockResolvedValue(undefined);
      (mockDelayInstance.bind as jest.Mock).mockReturnValue(originalDelayMock);
      
      // Capture the wrapper function
      let wrapperFunc: any;
      jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
        if (typeof sources[0] === 'function') {
          wrapperFunc = sources[0];
        }
        return target;
      });
      
      plugin.init!(mockDelayInstance);
      
      await wrapperFunc.call(mockDelayInstance, 100, options);

      expect(originalDelayMock).toHaveBeenCalledWith(100, options);
      
      jest.restoreAllMocks();
    });

    it('should reset metrics on destroy', () => {
      const plugin = createMetricsPlugin();
      
      // Initialize and use plugin
      plugin.init!(mockDelayInstance);
      
      // Destroy plugin
      plugin.destroy!();
      
      // Check that metrics are reset
      const metrics = (mockDelayInstance as any).getMetrics();
      expect(metrics.totalDelays).toBe(0);
      expect(metrics.totalTime).toBe(0);
      expect(metrics.averageDelay).toBe(0);
      expect(metrics.minDelay).toBe(Infinity);
      expect(metrics.maxDelay).toBe(0);
    });
  });

  describe('createDebugPlugin', () => {
    it('should create debug plugin with correct metadata', () => {
      const plugin = createDebugPlugin();
      
      expect(plugin.name).toBe('debug');
      expect(plugin.version).toBe('1.0.0');
      expect(plugin.init).toBeDefined();
      expect(plugin.destroy).toBeDefined();
    });

    it('should add debug functionality to delay instance', () => {
      const plugin = createDebugPlugin();
      
      plugin.init!(mockDelayInstance);
      
      const debug = (mockDelayInstance as any).debug;
      expect(debug).toBeDefined();
      expect(debug.isDebugMode).toBe(true);
      expect(debug.logLevel).toBe('info');
      expect(debug.setLogLevel).toBeDefined();
      expect(debug.log).toBeDefined();
    });

    it('should allow setting log level', () => {
      const plugin = createDebugPlugin();
      
      plugin.init!(mockDelayInstance);
      
      const debug = (mockDelayInstance as any).debug;
      debug.setLogLevel('error');
      
      expect(debug.logLevel).toBe('error');
    });

    it('should log messages with data when debug mode is enabled', () => {
      const plugin = createDebugPlugin();
      
      plugin.init!(mockDelayInstance);
      
      const debug = (mockDelayInstance as any).debug;
      debug.log('info', 'Test message', { data: 'test' });
      
      expect(consoleInfoSpy).toHaveBeenCalledWith('[delay:info] Test message', { data: 'test' });
    });

    it('should log messages without data when debug mode is enabled', () => {
      const plugin = createDebugPlugin();
      
      plugin.init!(mockDelayInstance);
      
      const debug = (mockDelayInstance as any).debug;
      debug.log('info', 'Test message without data');
      
      expect(consoleInfoSpy).toHaveBeenCalledWith('[delay:info] Test message without data');
    });

    it('should handle different log levels', () => {
      const plugin = createDebugPlugin();
      
      plugin.init!(mockDelayInstance);
      
      const debug = (mockDelayInstance as any).debug;
      
      debug.log('warn', 'Warning message');
      debug.log('error', 'Error message');
      debug.log('debug', 'Debug message');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('[delay:warn] Warning message');
      expect(consoleErrorSpy).toHaveBeenCalledWith('[delay:error] Error message');
      expect(consoleDebugSpy).toHaveBeenCalledWith('[delay:debug] Debug message');
    });

    it('should not log when debug mode is disabled', () => {
      const plugin = createDebugPlugin();
      
      plugin.init!(mockDelayInstance);
      
      const debug = (mockDelayInstance as any).debug;
      debug.isDebugMode = false;
      debug.log('info', 'Test message');
      
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log destroy message', () => {
      const plugin = createDebugPlugin();
      
      plugin.destroy!();
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[delay] Debug plugin destroyed');
    });
  });
});