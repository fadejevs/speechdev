// Only include this in development builds
if (process.env.NODE_ENV === 'development') {
  // Disable React DevTools profiling in development
  if (typeof window !== 'undefined' && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    // Disable profiling which can cause lag
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__.inject = function() {};
  }
  
  // Disable console logs that might slow down rendering
  const originalConsoleLog = console.log;
  console.log = (...args) => {
    if (args[0]?.includes?.('HMR') || args[0]?.includes?.('webpack')) {
      return; // Skip webpack and HMR logs
    }
    originalConsoleLog(...args);
  };
}

export {}; 