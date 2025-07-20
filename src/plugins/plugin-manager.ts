import { DelayPlugin, DelayInstance } from '../types/index.js';

export class PluginManager {
  private plugins: Map<string, DelayPlugin> = new Map();
  private delayInstance: DelayInstance | null = null;

  setDelayInstance(instance: DelayInstance): void {
    this.delayInstance = instance;
  }

  register(plugin: DelayPlugin): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin with name "${plugin.name}" is already registered`);
    }

    this.plugins.set(plugin.name, plugin);

    if (this.delayInstance && plugin.init) {
      plugin.init(this.delayInstance);
    }
  }

  unregister(pluginName: string): void {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin with name "${pluginName}" is not registered`);
    }

    if (plugin.destroy) {
      plugin.destroy();
    }

    this.plugins.delete(pluginName);
  }

  get(pluginName: string): DelayPlugin | undefined {
    return this.plugins.get(pluginName);
  }

  has(pluginName: string): boolean {
    return this.plugins.has(pluginName);
  }

  list(): DelayPlugin[] {
    return Array.from(this.plugins.values());
  }

  clear(): void {
    for (const plugin of this.plugins.values()) {
      if (plugin.destroy) {
        try {
          plugin.destroy();
        } catch (error) {
          console.error(`Error destroying plugin ${plugin.name}:`, error);
        }
      }
    }
    this.plugins.clear();
  }

  initializeAll(): void {
    if (!this.delayInstance) {
      throw new Error('Delay instance not set');
    }

    for (const plugin of this.plugins.values()) {
      if (plugin.init) {
        try {
          plugin.init(this.delayInstance);
        } catch (error) {
          console.error(`Error initializing plugin ${plugin.name}:`, error);
        }
      }
    }
  }
}

export function createLoggingPlugin(): DelayPlugin {
  return {
    name: 'logging',
    version: '1.0.0',
    init(delay: DelayInstance): void {
      const originalDelay = delay.bind({});
      
      // Override the main delay function to add logging
      Object.assign(delay, function(ms: number, options?: any) {
        console.log(`[delay] Starting delay of ${ms}ms`);
        const start = Date.now();
        
        return originalDelay(ms, options).then(() => {
          const actual = Date.now() - start;
          console.log(`[delay] Delay completed in ${actual}ms (target: ${ms}ms)`);
        });
      });
    },
    destroy(): void {
      console.log('[delay] Logging plugin destroyed');
    },
  };
}

export function createMetricsPlugin(): DelayPlugin {
  const metrics = {
    totalDelays: 0,
    totalTime: 0,
    averageDelay: 0,
    minDelay: Infinity,
    maxDelay: 0,
  };

  return {
    name: 'metrics',
    version: '1.0.0',
    init(delay: DelayInstance): void {
      const originalDelay = delay.bind({});
      
      Object.assign(delay, function(ms: number, options?: any) {
        const start = Date.now();
        metrics.totalDelays++;
        metrics.minDelay = Math.min(metrics.minDelay, ms);
        metrics.maxDelay = Math.max(metrics.maxDelay, ms);
        
        return originalDelay(ms, options).then(() => {
          const actual = Date.now() - start;
          metrics.totalTime += actual;
          metrics.averageDelay = metrics.totalTime / metrics.totalDelays;
        });
      });

      // Add metrics accessor to delay instance
      (delay as any).getMetrics = () => ({ ...metrics });
    },
    destroy(): void {
      // Reset metrics
      Object.assign(metrics, {
        totalDelays: 0,
        totalTime: 0,
        averageDelay: 0,
        minDelay: Infinity,
        maxDelay: 0,
      });
    },
  };
}

export function createDebugPlugin(): DelayPlugin {
  return {
    name: 'debug',
    version: '1.0.0',
    init(delay: DelayInstance): void {
      // Add debug information to the delay instance
      (delay as any).debug = {
        isDebugMode: true,
        logLevel: 'info',
        setLogLevel(level: 'debug' | 'info' | 'warn' | 'error'): void {
          this.logLevel = level;
        },
        log(level: string, message: string, data?: any): void {
          if (this.isDebugMode) {
            if (data !== undefined) {
              (console as any)[level]?.(`[delay:${level}] ${message}`, data);
            } else {
              (console as any)[level]?.(`[delay:${level}] ${message}`);
            }
          }
        },
      };
    },
    destroy(): void {
      console.log('[delay] Debug plugin destroyed');
    },
  };
}