import {
  PluginManager,
  createLoggingPlugin,
  createMetricsPlugin,
  createDebugPlugin
} from '../../src/plugins/plugin-manager';
import { DelayPlugin, DelayInstance } from '../../src/types/index';

describe('Plugin Manager', () => {
  let pluginManager: PluginManager;
  let mockDelayInstance: DelayInstance;

  beforeEach(() => {
    pluginManager = new PluginManager();
    mockDelayInstance = {
      // Mock delay instance methods
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
      use: jest.fn()
    } as any;
  });

  describe('PluginManager', () => {
    it('should register a plugin', () => {
      const plugin: DelayPlugin = {
        name: 'test-plugin',
        version: '1.0.0'
      };

      pluginManager.register(plugin);

      expect(pluginManager.has('test-plugin')).toBe(true);
      expect(pluginManager.get('test-plugin')).toBe(plugin);
    });

    it('should throw error when registering plugin with existing name', () => {
      const plugin1: DelayPlugin = {
        name: 'duplicate-plugin',
        version: '1.0.0'
      };

      const plugin2: DelayPlugin = {
        name: 'duplicate-plugin',
        version: '2.0.0'
      };

      pluginManager.register(plugin1);

      expect(() => pluginManager.register(plugin2)).toThrow(
        'Plugin with name "duplicate-plugin" is already registered'
      );
    });

    it('should initialize plugin when delay instance is set', () => {
      const initSpy = jest.fn();
      const plugin: DelayPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        init: initSpy
      };

      pluginManager.setDelayInstance(mockDelayInstance);
      pluginManager.register(plugin);

      expect(initSpy).toHaveBeenCalledWith(mockDelayInstance);
    });

    it('should initialize plugin when delay instance is already set', () => {
      const initSpy = jest.fn();
      const plugin: DelayPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        init: initSpy
      };

      pluginManager.setDelayInstance(mockDelayInstance);
      pluginManager.register(plugin);

      expect(initSpy).toHaveBeenCalledWith(mockDelayInstance);
    });

    it('should unregister a plugin', () => {
      const destroySpy = jest.fn();
      const plugin: DelayPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        destroy: destroySpy
      };

      pluginManager.register(plugin);
      expect(pluginManager.has('test-plugin')).toBe(true);

      pluginManager.unregister('test-plugin');

      expect(pluginManager.has('test-plugin')).toBe(false);
      expect(destroySpy).toHaveBeenCalled();
    });

    it('should throw error when unregistering non-existent plugin', () => {
      expect(() => pluginManager.unregister('non-existent')).toThrow(
        'Plugin with name "non-existent" is not registered'
      );
    });

    it('should list all registered plugins', () => {
      const plugin1: DelayPlugin = { name: 'plugin1', version: '1.0.0' };
      const plugin2: DelayPlugin = { name: 'plugin2', version: '1.0.0' };

      pluginManager.register(plugin1);
      pluginManager.register(plugin2);

      const plugins = pluginManager.list();

      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
    });

    it('should clear all plugins', () => {
      const destroySpy1 = jest.fn();
      const destroySpy2 = jest.fn();

      const plugin1: DelayPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        destroy: destroySpy1
      };

      const plugin2: DelayPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        destroy: destroySpy2
      };

      pluginManager.register(plugin1);
      pluginManager.register(plugin2);

      expect(pluginManager.list()).toHaveLength(2);

      pluginManager.clear();

      expect(pluginManager.list()).toHaveLength(0);
      expect(destroySpy1).toHaveBeenCalled();
      expect(destroySpy2).toHaveBeenCalled();
    });

    it('should handle destroy errors gracefully during clear', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const plugin: DelayPlugin = {
        name: 'error-plugin',
        version: '1.0.0',
        destroy: jest.fn(() => {
          throw new Error('Destroy error');
        })
      };

      pluginManager.register(plugin);
      
      expect(() => pluginManager.clear()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error destroying plugin error-plugin:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should initialize all plugins', () => {
      const initSpy1 = jest.fn();
      const initSpy2 = jest.fn();

      const plugin1: DelayPlugin = {
        name: 'plugin1',
        version: '1.0.0',
        init: initSpy1
      };

      const plugin2: DelayPlugin = {
        name: 'plugin2',
        version: '1.0.0',
        init: initSpy2
      };

      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      pluginManager.setDelayInstance(mockDelayInstance);

      pluginManager.initializeAll();

      expect(initSpy1).toHaveBeenCalledWith(mockDelayInstance);
      expect(initSpy2).toHaveBeenCalledWith(mockDelayInstance);
    });

    it('should throw error when initializing without delay instance', () => {
      expect(() => pluginManager.initializeAll()).toThrow('Delay instance not set');
    });

    it('should handle initialization errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const plugin: DelayPlugin = {
        name: 'error-plugin',
        version: '1.0.0',
        init: jest.fn(() => {
          throw new Error('Init error');
        })
      };

      pluginManager.register(plugin);
      pluginManager.setDelayInstance(mockDelayInstance);

      expect(() => pluginManager.initializeAll()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error initializing plugin error-plugin:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Built-in Plugins', () => {
    describe('createLoggingPlugin', () => {
      let consoleSpy: jest.SpyInstance;

      beforeEach(() => {
        consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      });

      afterEach(() => {
        consoleSpy.mockRestore();
      });

      it('should create a logging plugin with correct metadata', () => {
        const plugin = createLoggingPlugin();

        expect(plugin.name).toBe('logging');
        expect(plugin.version).toBe('1.0.0');
        expect(plugin.init).toBeDefined();
        expect(plugin.destroy).toBeDefined();
      });

      it('should log delay operations', async () => {
        const plugin = createLoggingPlugin();

        // Mock the original delay implementation
        const originalDelayImpl = jest.fn().mockResolvedValue(undefined);
        
        // Create a delay instance
        const delayInstance: any = Object.assign(originalDelayImpl, mockDelayInstance);
        
        // Mock bind to return the original implementation
        delayInstance.bind = jest.fn().mockReturnValue(originalDelayImpl);
        
        // Capture the wrapper function passed to Object.assign
        let wrapperFunc: any;
        const assignSpy = jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
          if (typeof sources[0] === 'function') {
            wrapperFunc = sources[0];
          }
          return target;
        });

        // Initialize plugin
        plugin.init!(delayInstance);

        // Object.assign should have been called with a wrapper function
        expect(assignSpy).toHaveBeenCalled();
        expect(wrapperFunc).toBeDefined();

        // Call the wrapper function directly to test the logging behavior
        await wrapperFunc.call(delayInstance, 1000);

        // Check that console.log was called for start and completion
        expect(consoleSpy).toHaveBeenCalledWith('[delay] Starting delay of 1000ms');
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\[delay\] Delay completed in \d+ms \(target: 1000ms\)/)
        );

        assignSpy.mockRestore();
      });

      it('should handle multiple delay calls with logging', async () => {
        const plugin = createLoggingPlugin();

        const originalDelayImpl = jest.fn()
          .mockResolvedValueOnce(undefined)
          .mockResolvedValueOnce(undefined);

        const delayInstance: any = Object.assign(originalDelayImpl, mockDelayInstance);
        delayInstance.bind = jest.fn().mockReturnValue(originalDelayImpl);
        
        let wrapperFunc: any;
        const assignSpy = jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
          if (typeof sources[0] === 'function') {
            wrapperFunc = sources[0];
          }
          return target;
        });

        plugin.init!(delayInstance);

        // Call wrapper multiple times
        await wrapperFunc.call(delayInstance, 500);
        await wrapperFunc.call(delayInstance, 2000);

        // Verify all logs
        expect(consoleSpy).toHaveBeenCalledWith('[delay] Starting delay of 500ms');
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\[delay\] Delay completed in \d+ms \(target: 500ms\)/)
        );
        expect(consoleSpy).toHaveBeenCalledWith('[delay] Starting delay of 2000ms');
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringMatching(/\[delay\] Delay completed in \d+ms \(target: 2000ms\)/)
        );

        assignSpy.mockRestore();
      });

      it('should log destruction', () => {
        const plugin = createLoggingPlugin();

        plugin.destroy!();

        expect(consoleSpy).toHaveBeenCalledWith('[delay] Logging plugin destroyed');
      });

      it('should pass through options parameter to delay', async () => {
        const plugin = createLoggingPlugin();
        const options = { signal: new AbortController().signal };

        const originalDelayImpl = jest.fn().mockResolvedValue(undefined);
        const delayInstance: any = Object.assign(originalDelayImpl, mockDelayInstance);
        delayInstance.bind = jest.fn().mockReturnValue(originalDelayImpl);
        
        let wrapperFunc: any;
        const assignSpy = jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
          if (typeof sources[0] === 'function') {
            wrapperFunc = sources[0];
          }
          return target;
        });

        plugin.init!(delayInstance);

        // Call wrapper with options
        await wrapperFunc.call(delayInstance, 100, options);

        // Verify original delay was called with both ms and options
        expect(originalDelayImpl).toHaveBeenCalledWith(100, options);

        assignSpy.mockRestore();
      });

      it('should track timing accurately', async () => {
        const plugin = createLoggingPlugin();
        
        // Mock Date.now for timing tests
        const originalNow = Date.now;
        let currentTime = 1000;
        Date.now = jest.fn(() => currentTime);

        const originalDelayImpl = jest.fn().mockImplementation(() => {
          currentTime += 150; // Simulate 150ms delay
          return Promise.resolve();
        });
        
        const delayInstance: any = Object.assign(originalDelayImpl, mockDelayInstance);
        delayInstance.bind = jest.fn().mockReturnValue(originalDelayImpl);
        
        let wrapperFunc: any;
        const assignSpy = jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
          if (typeof sources[0] === 'function') {
            wrapperFunc = sources[0];
          }
          return target;
        });

        plugin.init!(delayInstance);

        await wrapperFunc.call(delayInstance, 100);

        // Should log with actual time
        expect(consoleSpy).toHaveBeenCalledWith('[delay] Delay completed in 150ms (target: 100ms)');

        Date.now = originalNow;
        assignSpy.mockRestore();
      });
    });

    describe('createMetricsPlugin', () => {
      it('should create a metrics plugin with correct metadata', () => {
        const plugin = createMetricsPlugin();

        expect(plugin.name).toBe('metrics');
        expect(plugin.version).toBe('1.0.0');
        expect(plugin.init).toBeDefined();
        expect(plugin.destroy).toBeDefined();
      });

      it('should track delay metrics', async () => {
        const plugin = createMetricsPlugin();

        // Mock delay function that resolves immediately
        const originalDelayImpl = jest.fn().mockResolvedValue(undefined);
        
        const delayInstance: any = Object.assign(originalDelayImpl, mockDelayInstance);
        delayInstance.bind = jest.fn().mockReturnValue(originalDelayImpl);

        let wrapperFunc: any;
        const assignSpy = jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
          if (typeof sources[0] === 'function') {
            wrapperFunc = sources[0];
          }
          return target;
        });

        // Mock Date.now to control timing
        const dateSpy = jest.spyOn(Date, 'now');
        dateSpy
          .mockReturnValueOnce(1000) // Start of first delay
          .mockReturnValueOnce(1100) // End of first delay (100ms)
          .mockReturnValueOnce(2000) // Start of second delay
          .mockReturnValueOnce(2200) // End of second delay (200ms)
          .mockReturnValueOnce(3000) // Start of third delay
          .mockReturnValueOnce(3050); // End of third delay (50ms)

        plugin.init!(delayInstance);

        // Should add metrics accessor
        expect(delayInstance.getMetrics).toBeDefined();

        // Call wrapper multiple times with different durations
        await wrapperFunc.call(delayInstance, 100);
        await wrapperFunc.call(delayInstance, 200);
        await wrapperFunc.call(delayInstance, 50);

        const metrics = delayInstance.getMetrics();
        expect(metrics.totalDelays).toBe(3);
        expect(metrics.totalTime).toBe(350); // 100 + 200 + 50
        expect(metrics.averageDelay).toBeCloseTo(116.67, 1); // 350 / 3
        expect(metrics.minDelay).toBe(50);
        expect(metrics.maxDelay).toBe(200);

        dateSpy.mockRestore();
        assignSpy.mockRestore();
      });

      it('should calculate metrics correctly for single delay', async () => {
        const plugin = createMetricsPlugin();

        const originalDelayImpl = jest.fn().mockResolvedValue(undefined);
        
        const delayInstance: any = Object.assign(originalDelayImpl, mockDelayInstance);
        delayInstance.bind = jest.fn().mockReturnValue(originalDelayImpl);

        let wrapperFunc: any;
        const assignSpy = jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
          if (typeof sources[0] === 'function') {
            wrapperFunc = sources[0];
          }
          return target;
        });

        plugin.init!(delayInstance);

        // Mock Date.now for precise timing
        const startTime = 1000;
        const dateSpy = jest.spyOn(Date, 'now')
          .mockReturnValueOnce(startTime) // Start time in metrics
          .mockReturnValueOnce(startTime + 500); // End time

        await wrapperFunc.call(delayInstance, 500);

        const metrics = delayInstance.getMetrics();
        expect(metrics.totalDelays).toBe(1);
        expect(metrics.totalTime).toBe(500);
        expect(metrics.averageDelay).toBe(500);
        expect(metrics.minDelay).toBe(500);
        expect(metrics.maxDelay).toBe(500);

        dateSpy.mockRestore();
        assignSpy.mockRestore();
      });

      it('should reset metrics on destroy', () => {
        const plugin = createMetricsPlugin();

        const mockDelay = jest.fn().mockResolvedValue(undefined);
        const delayInstance = Object.assign(mockDelay, mockDelayInstance);

        plugin.init!(delayInstance);
        plugin.destroy!();

        const metrics = (delayInstance as any).getMetrics();
        expect(metrics.totalDelays).toBe(0);
        expect(metrics.totalTime).toBe(0);
        expect(metrics.averageDelay).toBe(0);
        expect(metrics.minDelay).toBe(Infinity);
        expect(metrics.maxDelay).toBe(0);
      });

      it('should handle wrapper function with options parameter', async () => {
        const plugin = createMetricsPlugin();
        const options = { signal: new AbortController().signal };

        const originalDelayImpl = jest.fn().mockResolvedValue(undefined);
        const delayInstance: any = Object.assign(originalDelayImpl, mockDelayInstance);
        delayInstance.bind = jest.fn().mockReturnValue(originalDelayImpl);
        
        let wrapperFunc: any;
        const assignSpy = jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
          if (typeof sources[0] === 'function') {
            wrapperFunc = sources[0];
          }
          return target;
        });

        // Mock Date.now for timing
        const dateSpy = jest.spyOn(Date, 'now')
          .mockReturnValueOnce(1000)
          .mockReturnValueOnce(1100);

        plugin.init!(delayInstance);

        // Call wrapper with options
        await wrapperFunc.call(delayInstance, 100, options);

        // Verify original delay was called with both ms and options
        expect(originalDelayImpl).toHaveBeenCalledWith(100, options);

        const metrics = delayInstance.getMetrics();
        expect(metrics.totalDelays).toBe(1);
        expect(metrics.totalTime).toBe(100);

        dateSpy.mockRestore();
        assignSpy.mockRestore();
      });

      it('should track timing in wrapper function correctly', async () => {
        const plugin = createMetricsPlugin();
        
        // Mock Date.now for precise timing control
        const originalNow = Date.now;
        let currentTime = 1000;
        Date.now = jest.fn(() => currentTime);

        const originalDelayImpl = jest.fn().mockImplementation(() => {
          currentTime += 150; // Simulate 150ms delay
          return Promise.resolve();
        });
        
        const delayInstance: any = Object.assign(originalDelayImpl, mockDelayInstance);
        delayInstance.bind = jest.fn().mockReturnValue(originalDelayImpl);
        
        let wrapperFunc: any;
        const assignSpy = jest.spyOn(Object, 'assign').mockImplementation((target, ...sources) => {
          if (typeof sources[0] === 'function') {
            wrapperFunc = sources[0];
          }
          return target;
        });

        plugin.init!(delayInstance);

        await wrapperFunc.call(delayInstance, 100);

        const metrics = delayInstance.getMetrics();
        expect(metrics.totalDelays).toBe(1);
        expect(metrics.totalTime).toBe(150); // Actual time taken
        expect(metrics.averageDelay).toBe(150);
        expect(metrics.minDelay).toBe(100);  // Min is the requested delay
        expect(metrics.maxDelay).toBe(100);  // Max is the requested delay

        Date.now = originalNow;
        assignSpy.mockRestore();
      });
    });

    describe('createDebugPlugin', () => {
      let infoSpy: jest.SpyInstance;
      let logSpy: jest.SpyInstance;

      beforeEach(() => {
        infoSpy = jest.spyOn(console, 'info').mockImplementation();
        logSpy = jest.spyOn(console, 'log').mockImplementation();
      });

      afterEach(() => {
        infoSpy.mockRestore();
        logSpy.mockRestore();
      });

      it('should create a debug plugin with correct metadata', () => {
        const plugin = createDebugPlugin();

        expect(plugin.name).toBe('debug');
        expect(plugin.version).toBe('1.0.0');
        expect(plugin.init).toBeDefined();
        expect(plugin.destroy).toBeDefined();
      });

      it('should add debug functionality', () => {
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

      it('should log messages when debug mode is enabled', () => {
        const plugin = createDebugPlugin();

        plugin.init!(mockDelayInstance);

        const debug = (mockDelayInstance as any).debug;
        debug.log('info', 'Test message', { data: 'test' });

        expect(infoSpy).toHaveBeenCalledWith('[delay:info] Test message', { data: 'test' });
      });

      it('should log messages without data when debug mode is enabled', () => {
        const plugin = createDebugPlugin();

        plugin.init!(mockDelayInstance);

        const debug = (mockDelayInstance as any).debug;
        
        // Test logging without data parameter (covers line 163)
        debug.log('info', 'Test message without data');

        expect(infoSpy).toHaveBeenCalledWith('[delay:info] Test message without data');
      });

      it('should handle different log levels', () => {
        const plugin = createDebugPlugin();
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const errorSpy = jest.spyOn(console, 'error').mockImplementation();
        const debugSpy = jest.spyOn(console, 'debug').mockImplementation();

        plugin.init!(mockDelayInstance);

        const debug = (mockDelayInstance as any).debug;
        
        // Test different log levels without data
        debug.log('warn', 'Warning message');
        debug.log('error', 'Error message');
        debug.log('debug', 'Debug message');

        expect(warnSpy).toHaveBeenCalledWith('[delay:warn] Warning message');
        expect(errorSpy).toHaveBeenCalledWith('[delay:error] Error message');
        expect(debugSpy).toHaveBeenCalledWith('[delay:debug] Debug message');

        warnSpy.mockRestore();
        errorSpy.mockRestore();
        debugSpy.mockRestore();
      });

      it('should not log when debug mode is disabled', () => {
        const plugin = createDebugPlugin();

        plugin.init!(mockDelayInstance);

        const debug = (mockDelayInstance as any).debug;
        debug.isDebugMode = false;
        debug.log('info', 'Test message');

        expect(infoSpy).not.toHaveBeenCalled();
      });

      it('should log destruction', () => {
        const plugin = createDebugPlugin();

        plugin.destroy!();

        expect(logSpy).toHaveBeenCalledWith('[delay] Debug plugin destroyed');
      });
    });
  });
});