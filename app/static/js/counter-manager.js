// Counter element state management and logic
(function() {
    'use strict';
    
    if (typeof window.CounterManager === 'undefined') {
        window.CounterManager = {};
    }
    
    // Store active counters by element ID
    const activeCounters = {};
    
    /**
     * Calculate the number of decimal places based on increment
     * @param {number} increment - The increment value
     * @returns {number} - Number of decimal places
     */
    function getDecimalPlaces(increment) {
        if (increment % 1 === 0) {
            return 0; // Integer increment
        }
        // Convert to string to find decimal places
        const str = increment.toString();
        if (str.includes('e') || str.includes('E')) {
            // Scientific notation - extract from exponent
            const match = str.match(/e([+-]?\d+)/i);
            if (match) {
                const exponent = parseInt(match[1]);
                const baseStr = str.split(/e/i)[0];
                const baseDecimalPlaces = baseStr.includes('.') ? baseStr.split('.')[1].length : 0;
                return Math.max(0, baseDecimalPlaces - exponent);
            }
        }
        // Regular decimal
        if (str.includes('.')) {
            return str.split('.')[1].length;
        }
        return 0;
    }
    
    /**
     * Round a value to match the precision of the increment
     * @param {number} value - The value to round
     * @param {number} increment - The increment value
     * @returns {number} - Rounded value
     */
    function roundToIncrementPrecision(value, increment) {
        const decimalPlaces = getDecimalPlaces(increment);
        // Round to nearest increment
        const rounded = Math.round(value / increment) * increment;
        // Round to appropriate decimal places to avoid floating point errors
        return parseFloat(rounded.toFixed(decimalPlaces));
    }
    
    /**
     * Format a value for display based on increment precision
     * @param {number} value - The value to format
     * @param {number} increment - The increment value
     * @returns {string} - Formatted value string
     */
    function formatCounterValue(value, increment) {
        const rounded = roundToIncrementPrecision(value, increment);
        const decimalPlaces = getDecimalPlaces(increment);
        return rounded.toFixed(decimalPlaces);
    }
    
    /**
     * Start a counter
     * @param {string} elementId - The element ID
     * @param {Object} properties - Counter properties (value, increment, count_up, prefix, suffix)
     * @param {Function} updateCallback - Function to call when counter value changes (elementId, newValue)
     */
    function startCounter(elementId, properties, updateCallback) {
        // Stop existing counter if running
        stopCounter(elementId);
        
        const props = properties || {};
        const value = parseFloat(props.value) || 10;
        const increment = parseFloat(props.increment) || 1;
        const countUp = props.count_up !== false;
        const prefix = props.prefix || '';
        const suffix = props.suffix || '';
        
        if (increment <= 0) {
            console.error('[CounterManager] Increment must be greater than 0');
            return;
        }
        
        // Initialize counter state
        let currentValue = countUp ? 0 : value;
        const targetValue = countUp ? value : 0;
        const incrementAmount = countUp ? increment : -increment;
        
        // Store counter info
        activeCounters[elementId] = {
            intervalId: null,
            currentValue: currentValue,
            targetValue: targetValue,
            incrementAmount: incrementAmount,
            increment: increment,
            countUp: countUp,
            prefix: prefix,
            suffix: suffix,
            updateCallback: updateCallback
        };
        
        // Initial update (round to increment precision)
        if (updateCallback) {
            const roundedValue = roundToIncrementPrecision(currentValue, increment);
            const formattedValue = formatCounterValue(currentValue, increment);
            updateCallback(elementId, roundedValue, `${prefix}${formattedValue}${suffix}`);
        }
        
        // Start interval
        const intervalId = setInterval(() => {
            const counter = activeCounters[elementId];
            if (!counter) {
                clearInterval(intervalId);
                return;
            }
            
            // Update value
            if (counter.countUp) {
                counter.currentValue += counter.increment;
                if (counter.currentValue >= counter.targetValue) {
                    counter.currentValue = counter.targetValue;
                    stopCounter(elementId);
                }
            } else {
                counter.currentValue -= counter.increment;
                if (counter.currentValue <= counter.targetValue) {
                    counter.currentValue = counter.targetValue;
                    stopCounter(elementId);
                }
            }
            
            // Call update callback (round to increment precision)
            if (counter.updateCallback) {
                const roundedValue = roundToIncrementPrecision(counter.currentValue, counter.increment);
                const formattedValue = formatCounterValue(counter.currentValue, counter.increment);
                const displayText = `${counter.prefix}${formattedValue}${counter.suffix}`;
                counter.updateCallback(elementId, roundedValue, displayText);
            }
        }, increment * 1000); // Convert seconds to milliseconds
        
        activeCounters[elementId].intervalId = intervalId;
    }
    
    /**
     * Stop a counter
     * @param {string} elementId - The element ID
     */
    function stopCounter(elementId) {
        const counter = activeCounters[elementId];
        if (counter && counter.intervalId) {
            clearInterval(counter.intervalId);
            delete activeCounters[elementId];
        }
    }
    
    /**
     * Get current counter value
     * @param {string} elementId - The element ID
     * @returns {number|null} - Current value or null if not running
     */
    function getCounterValue(elementId) {
        const counter = activeCounters[elementId];
        return counter ? counter.currentValue : null;
    }
    
    /**
     * Check if counter is running
     * @param {string} elementId - The element ID
     * @returns {boolean}
     */
    function isCounterRunning(elementId) {
        return activeCounters[elementId] !== undefined;
    }
    
    /**
     * Stop all counters
     */
    function stopAllCounters() {
        Object.keys(activeCounters).forEach(elementId => {
            stopCounter(elementId);
        });
    }
    
    // Export API
    window.CounterManager = {
        startCounter: startCounter,
        stopCounter: stopCounter,
        getCounterValue: getCounterValue,
        isCounterRunning: isCounterRunning,
        stopAllCounters: stopAllCounters
    };
})();

