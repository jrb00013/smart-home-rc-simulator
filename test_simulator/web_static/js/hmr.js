/**
 * Hot Module Replacement (HMR) Client
 * Listens for file change events from the server and reloads modules
 */

(function() {
    'use strict';
    
    // Only enable HMR in debug mode or when explicitly enabled
    var HMR_ENABLED = false;
    if (typeof window !== 'undefined' && window.location) {
        var hostname = window.location.hostname;
        if (hostname === 'localhost' || hostname === '127.0.0.1' || 
            window.location.search.includes('hmr=true') || 
            window.location.port === '5000') {
            HMR_ENABLED = true;
        }
    }
    
    if (!HMR_ENABLED) {
        return;
    }
    
    console.log('[HMR] Hot Module Replacement enabled');
    
    // Track loaded scripts
    var loadedScripts = {};
    var scriptElements = {};
    
    // Get all script tags
    function collectScripts() {
        var scripts = document.querySelectorAll('script[src]');
        scripts.forEach(function(script) {
            var src = script.getAttribute('src');
            if (src && src.startsWith('/static/js/')) {
                var fullPath = src;
                if (!fullPath.startsWith('http')) {
                    fullPath = window.location.origin + fullPath;
                }
                loadedScripts[src] = {
                    path: src,
                    fullPath: fullPath,
                    element: script
                };
                scriptElements[src] = script;
            }
        });
    }
    
    // Reload a specific script
    function reloadScript(scriptPath) {
        var scriptInfo = loadedScripts[scriptPath];
        if (!scriptInfo) {
            console.warn('[HMR] Script not found:', scriptPath);
            return;
        }
        
        var oldScript = scriptInfo.element;
        var newScript = document.createElement('script');
        newScript.src = scriptPath + '?t=' + Date.now(); // Cache bust
        newScript.type = 'text/javascript';
        
        // Copy attributes
        Array.from(oldScript.attributes).forEach(function(attr) {
            if (attr.name !== 'src') {
                newScript.setAttribute(attr.name, attr.value);
            }
        });
        
        newScript.onload = function() {
            console.log('[HMR] Reloaded:', scriptPath);
            // Dispatch custom event for module-specific cleanup
            window.dispatchEvent(new CustomEvent('hmr:reload', {
                detail: { path: scriptPath }
            }));
        };
        
        newScript.onerror = function() {
            console.error('[HMR] Failed to reload:', scriptPath);
        };
        
        // Replace the old script
        oldScript.parentNode.insertBefore(newScript, oldScript);
        oldScript.parentNode.removeChild(oldScript);
        
        // Update tracking
        loadedScripts[scriptPath].element = newScript;
        scriptElements[scriptPath] = newScript;
    }
    
    // Reload all scripts (full page reload fallback)
    function reloadPage() {
        console.log('[HMR] Reloading page...');
        window.location.reload();
    }
    
    // Initialize HMR when socket is available
    function initHMR() {
        if (typeof socket === 'undefined' || !socket) {
            // Wait for socket to be available
            setTimeout(initHMR, 100);
            return;
        }
        
        collectScripts();
        
        // Listen for file change events
        socket.on('hmr:file_changed', function(data) {
            console.log('[HMR] File changed:', data.path);
            
            // Map server path to client path
            var clientPath = data.path;
            if (clientPath.startsWith('web_static/')) {
                clientPath = clientPath.replace('web_static/', '/static/');
            } else if (!clientPath.startsWith('/static/')) {
                clientPath = '/static/' + clientPath;
            }
            
            // Check if this script is loaded
            var found = false;
            for (var path in loadedScripts) {
                if (path === clientPath || path.endsWith(clientPath) || clientPath.endsWith(path)) {
                    reloadScript(path);
                    found = true;
                    break;
                }
            }
            
            // If not found but it's a JS file, reload page
            if (!found && clientPath.endsWith('.js')) {
                console.log('[HMR] Script not in page, reloading...');
                reloadPage();
            } else if (!found) {
                console.log('[HMR] File not a loaded script, ignoring:', clientPath);
            }
        });
        
        // Listen for full reload requests
        socket.on('hmr:reload', function() {
            console.log('[HMR] Server requested full reload');
            reloadPage();
        });
        
        console.log('[HMR] Connected and listening for changes');
    }
    
    // Start HMR when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHMR);
    } else {
        initHMR();
    }
    
    // Expose HMR API
    window.HMR = {
        reload: reloadScript,
        reloadPage: reloadPage,
        getLoadedScripts: function() { return Object.keys(loadedScripts); }
    };
})();

