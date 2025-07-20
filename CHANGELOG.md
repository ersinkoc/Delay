## [1.0.3] - 2025-07-20

## [1.0.2] - 2025-07-20

# Changelog

## [1.0.1] - 2025-07-20

### Fixed
- ESLint compatibility with TypeScript 5.8.3
- Fixed linting errors in core modules
- Improved type safety in plugin system
- Removed unnecessary type assertions
- Fixed promise handling in setTimeout callbacks

### Changed
- Updated TypeScript configuration for better compatibility
- Improved code quality based on ESLint recommendations
- Enhanced type definitions for better inference

### Technical Improvements
- Better memory management in test suite
- Optimized build process
- Reduced package size through better tree-shaking

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-07-19

### Added

#### Core Features
- Basic delay functionality with millisecond precision
- Time unit helpers: `ms()`, `seconds()`, `minutes()`, `hours()`, `days()`
- Human-friendly time string parsing (`'2s'`, `'5m 30s'`, `'1h 30m'`, etc.)
- Cancellable delays with `AbortController` support
- Conditional delays: `until()` and `while()` with predicate functions
- Date-based delays: wait until specific date or time string (`'14:30'`)

#### Advanced Features
- Retry mechanism with exponential and linear backoff strategies
- Repeating delays with pause/resume/stop controls
- Progress tracking with customizable callback intervals
- Randomization with jitter and random range delays
- High-precision timing with drift compensation
- Batch delay processing for performance optimization

#### Promise Utilities
- Promise racing with timeout support
- Minimum execution time enforcement
- Custom timeout promise creation
- Sequential and parallel execution helpers

#### Rate Limiting
- Throttle function implementation with leading/trailing edge control
- Debounce function implementation with maxWait support
- Configurable leading/trailing behavior for both

#### Browser Integration
- `requestAnimationFrame` wrapper (`nextFrame()`)
- `requestIdleCallback` wrapper (`idle()`)
- DOM ready state utilities
- Window load event utilities
- Visibility change detection
- Environment capability detection

#### Plugin System
- Extensible plugin architecture
- Built-in logging plugin for debugging
- Built-in metrics plugin for performance monitoring
- Built-in debug plugin for development
- Custom plugin creation support

#### Developer Experience
- 100% TypeScript coverage with strict typing
- Comprehensive error handling with specific error codes
- Dual format support (CommonJS and ESM)
- Zero runtime dependencies
- 100% test coverage with Jest
- Extensive JSDoc documentation
- Source maps and declaration maps

#### Error Handling
- Custom `DelayError` class with error codes
- Specific error types for different failure scenarios
- Detailed error context in `details` property
- Proper error message formatting

#### Performance Features
- Efficient timer management and cleanup
- Memory leak prevention
- Optimized batch processing
- Minimal memory footprint
- Browser and Node.js compatibility

### Technical Details

#### Supported Environments
- Node.js 14.0.0 and above
- Modern browsers with ES2020 support
- TypeScript 5.0+ for development

#### Bundle Information
- Zero runtime dependencies
- Dual package (ESM + CommonJS)
- Tree-shakeable exports
- Source maps included
- TypeScript declarations included

#### Testing
- 100% code coverage requirement
- Unit tests for all functions
- Integration tests for complex scenarios
- Performance benchmarks
- Browser compatibility tests
- Edge case validation

#### Documentation
- Comprehensive README with examples
- API reference documentation
- TypeScript type definitions
- Working examples for all features
- Performance guidelines
- Migration guides for future versions

### Breaking Changes
- None (initial release)

### Migration Guide
- None (initial release)

### Security
- No known security vulnerabilities
- Input validation for all public APIs
- Safe error handling without information leakage
- Proper cleanup of resources and timers

---

## Future Releases

### Planned Features for v1.1.0
- WebWorker support for background delays
- More sophisticated scheduling algorithms
- Additional built-in plugins
- Performance optimizations
- Extended browser API wrappers

### Planned Features for v1.2.0
- Cron-like scheduling syntax
- Timezone-aware delays
- Persistent delay storage
- Advanced retry strategies
- Real-time collaboration features

---

For detailed information about each release, please check the [GitHub releases page](https://github.com/ersinkoc/delay/releases).


