import { PluginManager } from '../../src/plugins/plugin-manager';
import { DelayPlugin, DelayInstance } from '../../src/types/index';

describe('PluginManager Class', () => {
  let pluginManager: PluginManager;
  let mockDelayInstance: DelayInstance;

  beforeEach(() => {
    pluginManager = new PluginManager();
    
    // Create mock delay instance
    mockDelayInstance = {
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

  describe('register', () => {
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

    it('should initialize plugin if delay instance is already set', () => {
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

    it('should not initialize plugin if delay instance is not set', () => {
      const initSpy = jest.fn();
      const plugin: DelayPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        init: initSpy
      };

      pluginManager.register(plugin);

      expect(initSpy).not.toHaveBeenCalled();
    });
  });

  describe('unregister', () => {
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

    it('should handle plugin without destroy method', () => {
      const plugin: DelayPlugin = {
        name: 'test-plugin',
        version: '1.0.0'
      };

      pluginManager.register(plugin);
      
      expect(() => pluginManager.unregister('test-plugin')).not.toThrow();
      expect(pluginManager.has('test-plugin')).toBe(false);
    });
  });

  describe('get', () => {
    it('should return registered plugin', () => {
      const plugin: DelayPlugin = {
        name: 'test-plugin',
        version: '1.0.0'
      };

      pluginManager.register(plugin);
      
      expect(pluginManager.get('test-plugin')).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      expect(pluginManager.get('non-existent')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for registered plugin', () => {
      const plugin: DelayPlugin = {
        name: 'test-plugin',
        version: '1.0.0'
      };

      pluginManager.register(plugin);
      
      expect(pluginManager.has('test-plugin')).toBe(true);
    });

    it('should return false for non-existent plugin', () => {
      expect(pluginManager.has('non-existent')).toBe(false);
    });
  });

  describe('list', () => {
    it('should return all registered plugins', () => {
      const plugin1: DelayPlugin = { name: 'plugin1', version: '1.0.0' };
      const plugin2: DelayPlugin = { name: 'plugin2', version: '1.0.0' };

      pluginManager.register(plugin1);
      pluginManager.register(plugin2);

      const plugins = pluginManager.list();

      expect(plugins).toHaveLength(2);
      expect(plugins).toContain(plugin1);
      expect(plugins).toContain(plugin2);
    });

    it('should return empty array when no plugins registered', () => {
      expect(pluginManager.list()).toHaveLength(0);
    });
  });

  describe('clear', () => {
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

    it('should handle destroy errors gracefully', () => {
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

    it('should handle plugins without destroy method', () => {
      const plugin: DelayPlugin = {
        name: 'no-destroy',
        version: '1.0.0'
      };

      pluginManager.register(plugin);
      
      expect(() => pluginManager.clear()).not.toThrow();
      expect(pluginManager.list()).toHaveLength(0);
    });
  });

  describe('setDelayInstance', () => {
    it('should set delay instance', () => {
      pluginManager.setDelayInstance(mockDelayInstance);
      
      // Test by registering a plugin with init
      const initSpy = jest.fn();
      const plugin: DelayPlugin = {
        name: 'test-plugin',
        version: '1.0.0',
        init: initSpy
      };

      pluginManager.register(plugin);
      
      expect(initSpy).toHaveBeenCalledWith(mockDelayInstance);
    });
  });

  describe('initializeAll', () => {
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

    it('should throw error when delay instance not set', () => {
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

    it('should handle plugins without init method', () => {
      const plugin: DelayPlugin = {
        name: 'no-init',
        version: '1.0.0'
      };

      pluginManager.register(plugin);
      pluginManager.setDelayInstance(mockDelayInstance);
      
      expect(() => pluginManager.initializeAll()).not.toThrow();
    });
  });
});