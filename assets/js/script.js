const display = document.getElementById('display');
const expression = document.getElementById('expression');
const historyBtn = document.getElementById('historyBtn');
const historyModal = document.getElementById('historyModal');
const historyContent = document.getElementById('historyContent');
const basicBtn = document.getElementById('basicBtn');
const sciBtn = document.getElementById('sciBtn');
const basicButtons = document.getElementById('basicButtons');
const sciButtons = document.getElementById('sciButtons');
const angleRadios = document.querySelectorAll('input[name="angleMode"]');
const acBackspaceBtn = document.getElementById('acBackspaceBtn');

let angleMode = 'deg';
let history = [];
let isResult = false;
let lastOperator = null;
let savedSelection = null; // To save cursor position
let isACMode = true; // Track if the button should show AC or Backspace
let currentMode = 'basic'; // Track current mode
let insideFunction = false; // Track if cursor is inside a function

basicBtn.onclick = () => toggleMode('basic');
sciBtn.onclick = () => toggleMode('scientific');
historyBtn.onclick = openHistory;

// Initialize the calculator based on screen size
function initializeCalculator() {
    if (window.innerWidth <= 768) {
        // Mobile view
        currentMode = 'basic';
        basicButtons.style.display = 'grid';
        sciButtons.style.display = 'none';
        basicBtn.classList.add('active');
        sciBtn.classList.remove('active');
    } else {
        // Desktop view - both button sets should be visible
        basicButtons.style.display = 'grid';
        sciButtons.style.display = 'grid';
        basicBtn.classList.remove('active');
        sciBtn.classList.remove('active');
    }
}

// Handle window resize
window.addEventListener('resize', initializeCalculator);

function toggleMode(mode) {
    // Only apply mode toggle in mobile view
    if (window.innerWidth <= 768) {
        currentMode = mode;
        if (mode === 'basic') {
            basicButtons.style.display = 'grid';
            sciButtons.style.display = 'none';
            basicBtn.classList.add('active');
            sciBtn.classList.remove('active');
        } else {
            basicButtons.style.display = 'none';
            sciButtons.style.display = 'grid';
            basicBtn.classList.remove('active');
            sciBtn.classList.add('active');
        }
    }
    focusDisplay();
}

function focusDisplay() {
    display.focus();
}

function saveCursorPosition() {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
        savedSelection = sel.getRangeAt(0);
    }
}

function restoreCursorPosition() {
    if (savedSelection) {
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedSelection);
    }
}

function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection !== "undefined" &&
        typeof document.createRange !== "undefined") {
        let range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        // Save this position
        savedSelection = range;
    }
}

function placeCaretAt(node) {
    focusDisplay();
    if (typeof window.getSelection !== "undefined" &&
        typeof document.createRange !== "undefined") {
        let range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        // Save this position
        savedSelection = range;
    }
}

function placeCaretAtBeginning(node) {
    focusDisplay();
    if (typeof window.getSelection !== "undefined" &&
        typeof document.createRange !== "undefined") {
        let range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(true);
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        // Save this position
        savedSelection = range;
    }
}

function updateACBackspaceButton() {
    if (isACMode) {
        acBackspaceBtn.textContent = 'AC';
    } else {
        acBackspaceBtn.textContent = '⌫';
    }
}

function toggleACBackspace() {
    if (isACMode) {
        clearAll();
    } else {
        backspace();
    }
}

function insertChar(char) {
    // If we're starting a new operation after a result with a digit, clear the display
    if (isResult && !isNaN(char)) {
        display.innerHTML = '';
        expression.innerHTML = '';
        isResult = false;
        lastOperator = null;
    }
    
    // Change AC to Backspace when user starts typing a digit
    if (isACMode && !isNaN(char) && display.innerText.trim() !== '0') {
        isACMode = false;
        updateACBackspaceButton();
    }
    
    // Handle operator replacement
    if (['+', '-', '*', '/'].includes(char)) {
        // If we're starting a new operation after a result, keep the result
        if (isResult) {
            isResult = false;
        }
        
        // Get the plain text content
        const text = getPlainExpression(display).trim();
        const lastChar = text.length > 0 ? text.charAt(text.length - 1) : '';
        
        // For non-minus operators, replace any existing operator at the end
        if (char !== '-') {
            if (['+', '-', '×', '÷'].includes(lastChar)) {
                // Remove the last operator
                placeCaretAtEnd(display);
                backspace();
            }
        } else {
            // For minus operator, special handling
            if (['+', '×', '÷'].includes(lastChar)) {
                // Allow minus after other operators (for negative numbers)
                // Just insert the minus
            } else if (lastChar === '-') {
                // If last character is already a minus, replace it
                placeCaretAtEnd(display);
                backspace();
            }
        }
        
        // Remember the current operator for next time
        lastOperator = char;
        
        // Convert to display symbols
        if (char === '/') char = '÷';
        if (char === '*') char = '×';
        
        // Insert the operator
        insertTextAtCursor(char);
        focusDisplay();
        return;
    }
    
    if (char === '.') {
        let text = getPlainExpression(display);
        const sel = window.getSelection();
        let range = sel.rangeCount ? sel.getRangeAt(0) : null;
        let pos = range ? range.startOffset : text.length;
        let before = text.substr(0, pos);
        let after = text.substr(pos);

        let lastGroup = before.match(/(\d*\.\d*|\d+)$/);
        if (lastGroup && lastGroup[0].includes('.')) return;
        if (after.match(/^\d*\./)) return;
    }
    if (char === '/') char = '÷';
    if (display.innerText.trim() === '0') display.innerHTML = '';
    if (char === '*') char = '×';
    insertTextAtCursor(char);
    focusDisplay();
}

function insertTextAtCursor(text) {
    focusDisplay();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    
    // --- Start of Corrected Logic for Exponent Box ---
    let container = range.startContainer;
    let expBox = null;

    // Check if the cursor is inside an exponent box, whether it's empty or not.
    if (container.nodeType === Node.ELEMENT_NODE && container.classList.contains('exp')) {
        // Case 1: Cursor is in an empty exponent box.
        expBox = container;
    } else if (container.nodeType === Node.TEXT_NODE && container.parentNode.classList.contains('exp')) {
        // Case 2: Cursor is in a text node that's inside an exponent box.
        expBox = container.parentNode;
    }

    if (expBox) {
        // If we are inside an exponent box, handle it here.
        if (!expBox.classList.contains('typed')) {
            // If it's the first character, add the 'typed' class to remove the box visuals.
            expBox.classList.add('typed');
        }
        
        // Use standard insertion logic which works correctly.
        range.deleteContents();
        const textNode = document.createTextNode(text);
        range.insertNode(textNode);
        // Move cursor after the newly inserted character.
        range.setStart(textNode, text.length);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        savedSelection = range;
        return; // Exit the function since we've handled the insertion.
    }
    // --- End of Corrected Logic ---
    
    // This is the original logic for all other cases (not in an exponent box).
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStart(textNode, text.length);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    // Save this position
    savedSelection = range;
}

function backspace() {
    focusDisplay();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    if (!range.collapsed) {
        range.deleteContents();
        // Save this position
        savedSelection = range;
        // Check if we should switch to AC mode
        checkIfInsideFunction();
        return;
    }

    let node = range.startContainer;
    let offset = range.startOffset;

    // Handle backspace in power expressions
    if (node.classList && node.classList.contains('exp')) {
        if (node.textContent.length <= 1) {
            // If exponent has one character or is empty, move cursor to base
            const powerExpr = node.closest('.power-expr, .exp-x-expr');
            if (powerExpr) {
                // If the exponent box is empty, remove the entire function
                if (node.textContent.trim() === '') {
                    powerExpr.remove();
                    placeCaretAtEnd(display);
                    // Switch back to AC mode
                    isACMode = true;
                    updateACBackspaceButton();
                    return;
                }
                
                const baseNode = powerExpr.querySelector('.base');
                placeCaretAtEnd(baseNode);
                // Check if we should switch to AC mode
                checkIfInsideFunction();
                return;
            }
        } else {
            // Remove last character from exponent
            const currentText = node.textContent;
            node.textContent = currentText.slice(0, -1);
            // Move cursor to end
            range.selectNodeContents(node);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            
            // CRITICAL FIX: Check if the exponent box is now empty after removing the character
            if (node.textContent.trim() === '') {
                // Switch to AC mode if the exponent box is empty
                isACMode = true;
                updateACBackspaceButton();
            } else {
                // Otherwise, check if we're inside a function
                checkIfInsideFunction();
            }
            return;
        }
    }

    // Handle backspace after calculation (when display contains plain text)
    if (node.nodeType === Node.TEXT_NODE && node.parentNode === display) {
        if (offset > 0) {
            node.textContent = node.textContent.slice(0, offset - 1) + node.textContent.slice(offset);
            setCaretPosition(node, offset - 1);
        } else if (node.previousSibling) {
            let prev = node.previousSibling;
            if (prev.nodeType === Node.TEXT_NODE) {
                let len = prev.textContent.length;
                prev.textContent = prev.textContent.slice(0, -1);
                setCaretPosition(prev, Math.max(0, len - 1));
            } else {
                prev.remove();
            }
        }
    } else if (node.nodeType === Node.TEXT_NODE) {
        if (offset > 0) {
            node.textContent = node.textContent.slice(0, offset - 1) + node.textContent.slice(offset);
            setCaretPosition(node, offset - 1);
            
            // CRITICAL FIX: If we just cleared the exponent text, check if it's empty
            let expNode = node;
            if (node.parentNode && node.parentNode.classList.contains('exp')) {
                expNode = node.parentNode;
                if (expNode.textContent === '') {
                    expNode.classList.remove('typed');
                    // Switch to AC mode if the exponent box is empty
                    isACMode = true;
                    updateACBackspaceButton();
                }
            }
        } else {
            if (node.previousSibling) {
                let prev = node.previousSibling;
                if (prev.nodeType === Node.TEXT_NODE) {
                    let len = prev.textContent.length;
                    prev.textContent = prev.textContent.slice(0, -1);
                    setCaretPosition(prev, Math.max(0, len - 1));
                } else {
                    prev.remove();
                }
            }
        }
    } else if (node.nodeType === Node.ELEMENT_NODE && node !== display) {
        // If we're at the beginning of an element, remove the element
        if (offset === 0 && node.previousSibling) {
            node.previousSibling.remove();
            placeCaretAtEnd(display);
        }
    }

    // Check if display is empty after backspace and reset to 0 if needed
    if (display.innerText.trim() === '') {
        display.innerHTML = '0';
        placeCaretAtEnd(display);
        // Switch back to AC mode
        isACMode = true;
        updateACBackspaceButton();
    } else {
        // Check if we're inside a function
        checkIfInsideFunction();
    }
}

// Function to check if cursor is inside a function
function checkIfInsideFunction() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    
    const range = sel.getRangeAt(0);
    let node = range.startContainer;
    
    // Check if cursor is inside an exponent box of e^x or x^y
    if (node.classList && node.classList.contains('exp')) {
        const expXExpr = node.closest('.exp-x-expr, .power-expr');
        if (expXExpr) {
            // If the exponent box is empty, we're inside a function
            if (node.textContent.trim() === '') {
                isACMode = true;
                updateACBackspaceButton();
                return;
            }
        }
    }
    
    // CRITICAL FIX: Also check if cursor is in a text node inside an exponent box
    if (node.nodeType === Node.TEXT_NODE && node.parentNode && node.parentNode.classList.contains('exp')) {
        const expNode = node.parentNode;
        const expXExpr = expNode.closest('.exp-x-expr, .power-expr');
        if (expXExpr) {
            // If the exponent box is empty, we're inside a function
            if (expNode.textContent.trim() === '') {
                isACMode = true;
                updateACBackspaceButton();
                return;
            }
        }
    }
    
    // Get the plain text content
    const text = getPlainExpression(display);
    
    // Check if we're inside any function parentheses
    let cursorPos = 0;
    
    // Calculate cursor position in the text
    if (node.nodeType === Node.TEXT_NODE) {
        // Find the position of this text node in the display
        let tempNode = display.firstChild;
        while (tempNode && tempNode !== node) {
            if (tempNode.nodeType === Node.TEXT_NODE) {
                cursorPos += tempNode.textContent.length;
            }
            tempNode = tempNode.nextSibling;
        }
        cursorPos += range.startOffset;
    }
    
    // Check if cursor is inside any function parentheses
    let insideAnyFunction = false;
    let openParenCount = 0;
    
    // List of function patterns to check
    const functionPatterns = [
        'sin⁻¹', 'cos⁻¹', 'tan⁻¹', // 4 characters each
        'sin', 'cos', 'tan', 'log', 'ln', 'abs', // 3 characters each
        '1/', // 2 characters
        '³√', // 2 characters
        '√',  // 1 character
        'e^',  // For e^x
        'x^'   // For x^y
    ];
    
    // Sort by length descending to match longer patterns first
    functionPatterns.sort((a, b) => b.length - a.length);
    
    // Also check for power expressions like ()² and ()³
    const powerPatterns = [')²', ')³'];
    
    // Scan through the text to find function patterns
    for (let i = 0; i < text.length; i++) {
        // Check if any function pattern starts at this position
        let foundFunction = false;
        for (const pattern of functionPatterns) {
            if (text.substr(i, pattern.length) === pattern) {
                // Found a function pattern
                foundFunction = true;
                i += pattern.length - 1; // Skip ahead, but the loop will increment by 1 more
                break;
            }
        }
        
        // Check for power patterns
        let foundPower = false;
        for (const pattern of powerPatterns) {
            if (text.substr(i, pattern.length) === pattern) {
                // Found a power pattern
                foundPower = true;
                i += pattern.length - 1; // Skip ahead, but the loop will increment by 1 more
                break;
            }
        }
        
        if (foundFunction) {
            // The next character should be an opening parenthesis for most functions
            if (i + 1 < text.length && text[i + 1] === '(') {
                openParenCount++;
                i++; // Skip the opening parenthesis
            }
            // Special case for e^x and x^y - they don't have parentheses but are functions
            else if (text.substr(i - 1, 2) === 'e^' || text.substr(i - 1, 2) === 'x^') {
                // These are special function patterns
                openParenCount++;
            }
        } else if (foundPower) {
            // Power patterns like ()² and ()³ are functions
            openParenCount++;
        } else if (text[i] === '(') {
            openParenCount++;
        } else if (text[i] === ')') {
            if (openParenCount > 0) {
                openParenCount--;
            }
        }
        
        // Check if cursor is at this position
        if (i === cursorPos - 1) {
            // If we have any open parentheses, we're inside a function
            insideAnyFunction = openParenCount > 0;
            break;
        }
    }
    
    // Set AC/Backspace mode based on whether we're inside a function
    if (insideAnyFunction) {
        isACMode = true;
        updateACBackspaceButton();
    } else {
        // Check if only one digit remains
        checkIfOnlyOneDigitRemains();
    }
}

// New function to check if only one digit remains
function checkIfOnlyOneDigitRemains() {
    const text = getPlainExpression(display);
    
    // Check if the text is a single digit (0-9) and length is 1
    if (text.length === 1 && /^\d$/.test(text)) {
        // Switch back to AC mode
        isACMode = true;
        updateACBackspaceButton();
    } else {
        // Make sure we're in backspace mode if there's more than one digit
        isACMode = false;
        updateACBackspaceButton();
    }
}

function setCaretPosition(node, offset) {
    const sel = window.getSelection();
    const range = document.createRange();
    range.setStart(node, Math.max(0, offset));
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    // Save this position
    savedSelection = range;
}

function insertFunction(func) {
    // If we're starting a new operation after a result, clear the display
    if (isResult) {
        display.innerHTML = '';
        expression.innerHTML = '';
        isResult = false;
        lastOperator = null;
    }
    
    // Clear display if it's just "0"
    if (display.innerText.trim() === '0') {
        display.innerHTML = '';
    }
    
    // Map function names to display names
    const displayNames = {
        'asin': 'sin⁻¹',
        'acos': 'cos⁻¹',
        'atan': 'tan⁻¹'
    };
    
    const displayName = displayNames[func] || func;
    
    focusDisplay();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);

    if (!range.collapsed) {
        const selected = range.extractContents();
        const span = document.createElement('span');
        span.appendChild(selected);

        const funcNode = document.createTextNode(displayName + "(");
        const closingNode = document.createTextNode(")");
        const frag = document.createDocumentFragment();
        frag.appendChild(funcNode);
        frag.appendChild(span);
        frag.appendChild(closingNode);

        range.insertNode(frag);

        let lastNode = span.lastChild || span;
        placeCaretAtEnd(lastNode);
    } else {
        const funcNode = document.createTextNode(displayName + "(");
        const closingNode = document.createTextNode(")");
        range.insertNode(funcNode);

        range.setStartAfter(funcNode);
        sel.removeAllRanges();
        sel.addRange(range);

        range.insertNode(closingNode);
        range.setStartBefore(closingNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        // Save this position
        savedSelection = range;
    }
    
    // Set AC mode since we're inside a function
    isACMode = true;
    updateACBackspaceButton();
}

function insertPower() {
    // If we're starting a new operation after a result, use the result as the base
    if (isResult) {
        const resultText = display.innerText;
        display.innerHTML = '';
        expression.innerHTML = '';
        const powerExpr = createPowerExpr(resultText);
        display.appendChild(powerExpr);
        const expNode = powerExpr.querySelector('.exp');
        placeCaretAtBeginning(expNode);
        isResult = false;
        lastOperator = null;
        // Set AC mode since we're inside a function
        isACMode = true;
        updateACBackspaceButton();
        return;
    }

    // *** FIX STARTS HERE ***
    // Check if the entire display contains a single, simple number
    const plainText = getPlainExpression(display).trim();
    if (/^[\d.]+$/.test(plainText) && !isNaN(parseFloat(plainText))) {
        // If so, use the entire number as the base.
        display.innerHTML = ''; // Clear the current display
        const powerExpr = createPowerExpr(plainText);
        display.appendChild(powerExpr);
        
        // Move the cursor into the new exponent box
        const expNode = powerExpr.querySelector('.exp');
        placeCaretAtBeginning(expNode);
        
        // Set AC mode as we are now inside a function
        isACMode = true;
        updateACBackspaceButton();
        return; // Exit after handling this primary case
    }
    // *** FIX ENDS HERE ***
    
    focusDisplay();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let range = sel.getRangeAt(0);
    
    // If there's a selection, use it as the base
    if (!range.collapsed) {
        const selectedText = range.toString();
        // Create a power expression structure
        const powerExpr = createPowerExpr(selectedText);
        range.deleteContents();
        range.insertNode(powerExpr);
        // Move cursor to the exponent
        const expNode = powerExpr.querySelector('.exp');
        placeCaretAtBeginning(expNode);
    } else {
        // No selection: check if cursor is inside a number
        let node = range.startContainer;
        let offset = range.startOffset;
        
        // If the entire display is a single number, use it as the base
        if (node === display && display.childNodes.length === 1 && 
            display.childNodes[0].nodeType === Node.TEXT_NODE) {
            const number = display.childNodes[0].textContent;
            display.innerHTML = '';
            const powerExpr = createPowerExpr(number);
            display.appendChild(powerExpr);
            const expNode = powerExpr.querySelector('.exp');
            placeCaretAtBeginning(expNode);
        } else if (node.nodeType !== Node.TEXT_NODE) {
            // If not in a text node, insert a power expression with empty base and exponent
            const powerExpr = createPowerExpr('');
            range.insertNode(powerExpr);
            // Move cursor to the base
            const baseNode = powerExpr.querySelector('.base');
            placeCaretAtBeginning(baseNode);
        } else {
            const text = node.textContent;
            
            // Find the start and end of the current number at the cursor
            let start = offset;
            let end = offset;
            
            // Move start backwards until we hit a non-digit, non-dot, or the beginning
            while (start > 0 && /[\d.]/.test(text.charAt(start - 1))) {
                start--;
            }
            
            // Move end forwards until we hit a non-digit, non-dot, or the end
            while (end < text.length && /[\d.]/.test(text.charAt(end))) {
                end++;
            }
            
            // If we found a number (at least one digit)
            if (start < end && /\d/.test(text.substring(start, end))) {
                // Extract the number
                const number = text.substring(start, end);
                
                // Replace the number with a power expression
                const before = text.substring(0, start);
                const after = text.substring(end);
                
                // Create the power expression
                const powerExpr = createPowerExpr(number);
                
                // Create a new text node for the parts before and after
                const beforeNode = document.createTextNode(before);
                const afterNode = document.createTextNode(after);
                
                // Replace the current node with the new structure
                const parent = node.parentNode;
                parent.insertBefore(beforeNode, node);
                parent.insertBefore(powerExpr, node);
                parent.insertBefore(afterNode, node);
                parent.removeChild(node);
                
                // Move cursor to the exponent
                const expNode = powerExpr.querySelector('.exp');
                placeCaretAtBeginning(expNode);
            } else {
                // No number found, insert a power expression with empty base and exponent
                const powerExpr = createPowerExpr('');
                const before = text.substring(0, offset);
                const after = text.substring(offset);
                
                node.textContent = before;
                const parent = node.parentNode;
                parent.insertBefore(powerExpr, node.nextSibling);
                const afterNode = document.createTextNode(after);
                parent.insertBefore(afterNode, powerExpr.nextSibling);
                
                // Move cursor to the base
                const baseNode = powerExpr.querySelector('.base');
                placeCaretAtBeginning(baseNode);
            }
        }
    }
    
    // Set AC mode since we're inside a function
    isACMode = true;
    updateACBackspaceButton();
}

function createPowerExpr(baseText) {
    const powerExpr = document.createElement('span');
    powerExpr.className = 'power-expr';
    
    const baseSpan = document.createElement('span');
    baseSpan.className = 'base';
    baseSpan.contentEditable = true;
    baseSpan.textContent = baseText || '';
    
    // Create exponent box without dots
    const expSup = document.createElement('sup');
    expSup.className = 'exp';
    expSup.contentEditable = true;
    expSup.textContent = '';
    
    powerExpr.appendChild(baseSpan);
    powerExpr.appendChild(expSup);
    
    return powerExpr;
}

function insertEXPX() {
    // If we're starting a new operation after a result, clear the display
    if (isResult) {
        display.innerHTML = '';
        expression.innerHTML = '';
        isResult = false;
        lastOperator = null;
    }
    
    // Clear display if it's just "0"
    if (display.innerText.trim() === '0') {
        display.innerHTML = '';
    }
    
    focusDisplay();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let range = sel.getRangeAt(0);
    
    // Create e^x expression structure
    const expXExpr = createEXPXExpr();
    
    // Insert the structure
    range.insertNode(expXExpr);
    
    // Move cursor to the exponent
    const expNode = expXExpr.querySelector('.exp');
    placeCaretAtBeginning(expNode);
    
    // Set AC mode since we're inside a function
    isACMode = true;
    updateACBackspaceButton();
}

function createEXPXExpr() {
    const expXExpr = document.createElement('span');
    expXExpr.className = 'exp-x-expr';
    
    const baseSpan = document.createElement('span');
    baseSpan.className = 'base';
    baseSpan.contentEditable = false; // Base is fixed as 'e'
    baseSpan.textContent = 'e';
    baseSpan.style.fontStyle = 'italic'; // Italicize the 'e'
    
    // Create exponent box
    const expSup = document.createElement('sup');
    expSup.className = 'exp';
    expSup.contentEditable = true;
    expSup.textContent = ''; // Empty box instead of 'x'
    
    expXExpr.appendChild(baseSpan);
    expXExpr.appendChild(expSup);
    
    return expXExpr;
}

function insertSquare() {
    // If we're starting a new operation after a result, clear the display
    if (isResult) {
        display.innerHTML = '';
        expression.innerHTML = '';
        isResult = false;
        lastOperator = null;
    }
    
    // Clear display if it's just "0"
    if (display.innerText.trim() === '0') {
        display.innerHTML = '';
    }
    
    focusDisplay();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let range = sel.getRangeAt(0);
    
    // Check if the entire display is a number (only digits and decimal point)
    const plainText = getPlainExpression(display);
    if (/^[\d.]+$/.test(plainText)) {
        // Replace the entire display with the number followed by ² (without parentheses)
        display.innerHTML = plainText + "²";
        placeCaretAtEnd(display);
        
        // Set AC mode since we're inside a function
        isACMode = true;
        updateACBackspaceButton();
        return;
    }
    
    // If there's a selection, wrap it in parentheses with superscript 2
    if (!range.collapsed) {
        const selectedText = range.toString();
        const openingParen = document.createTextNode("(");
        const closingParen = document.createTextNode(")²");
        
        // Extract the selected content
        const selectedContent = range.extractContents();
        
        // Create a document fragment to hold the parentheses and selected content
        const frag = document.createDocumentFragment();
        frag.appendChild(openingParen);
        frag.appendChild(selectedContent);
        frag.appendChild(closingParen);
        
        // Insert the fragment
        range.insertNode(frag);
        
        // Move the cursor after the superscript 2
        range.setStartAfter(closingParen);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        // Save this position
        savedSelection = range;
    } else {
        // No selection: check if cursor is inside a number
        let node = range.startContainer;
        let offset = range.startOffset;
        
        if (node.nodeType !== Node.TEXT_NODE) {
            // If not in a text node, just insert "()²" with cursor inside
            insertTextAtCursor("()²");
            // Move cursor inside the parentheses
            const sel = window.getSelection();
            if (sel.rangeCount) {
                const range = sel.getRangeAt(0);
                // We need to move cursor back by 2 positions (to skip the closing parenthesis and superscript)
                if (range.startContainer.nodeType === Node.TEXT_NODE) {
                    const textNode = range.startContainer;
                    const currentOffset = range.startOffset;
                    // Move cursor to position after opening parenthesis
                    range.setStart(textNode, currentOffset - 2);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    // Save this position
                    savedSelection = range;
                }
            }
        } else {
            const text = node.textContent;
            
            // Find the start and end of the current number at the cursor
            let start = offset;
            let end = offset;
            
            // Move start backwards until we hit a non-digit, non-dot, or the beginning
            while (start > 0 && /[\d.]/.test(text.charAt(start - 1))) {
                start--;
            }
            
            // Move end forwards until we hit a non-digit, non-dot, or the end
            while (end < text.length && /[\d.]/.test(text.charAt(end))) {
                end++;
            }
            
            // If we found a number (at least one digit)
            if (start < end && /\d/.test(text.substring(start, end))) {
                // Extract the number
                const number = text.substring(start, end);
                
                // Replace the number with number² (without parentheses)
                const before = text.substring(0, start);
                const after = text.substring(end);
                
                // Create a new text node for the squared number
                const newNode = document.createTextNode(before + number + "²" + after);
                node.parentNode.replaceChild(newNode, node);
                
                // Move the cursor after the superscript 2
                const newOffset = before.length + number.length + 1; // +1 for '²'
                setCaretPosition(newNode, newOffset);
            } else {
                // No number found, insert "()²" with cursor inside
                insertTextAtCursor("()²");
                // Move cursor inside the parentheses
                const sel = window.getSelection();
                if (sel.rangeCount) {
                    const range = sel.getRangeAt(0);
                    // We need to move cursor back by 2 positions (to skip the closing parenthesis and superscript)
                    if (range.startContainer.nodeType === Node.TEXT_NODE) {
                        const textNode = range.startContainer;
                        const currentOffset = range.startOffset;
                        // Move cursor to position after opening parenthesis
                        range.setStart(textNode, currentOffset - 2);
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                        // Save this position
                        savedSelection = range;
                    }
                }
            }
        }
    }
    
    // Set AC mode since we're inside a function
    isACMode = true;
    updateACBackspaceButton();
}

function insertCube() {
    // If we're starting a new operation after a result, clear the display
    if (isResult) {
        display.innerHTML = '';
        expression.innerHTML = '';
        isResult = false;
        lastOperator = null;
    }
    
    // Clear display if it's just "0"
    if (display.innerText.trim() === '0') {
        display.innerHTML = '';
    }
    
    focusDisplay();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let range = sel.getRangeAt(0);
    
    // Check if the entire display is a number (only digits and decimal point)
    const plainText = getPlainExpression(display);
    if (/^[\d.]+$/.test(plainText)) {
        // Replace the entire display with the number followed by ³ (without parentheses)
        display.innerHTML = plainText + "³";
        placeCaretAtEnd(display);
        
        // Set AC mode since we're inside a function
        isACMode = true;
        updateACBackspaceButton();
        return;
    }
    
    // If there's a selection, wrap it in parentheses with superscript 3
    if (!range.collapsed) {
        const selectedText = range.toString();
        const openingParen = document.createTextNode("(");
        const closingParen = document.createTextNode(")³");
        
        // Extract the selected content
        const selectedContent = range.extractContents();
        
        // Create a document fragment to hold the parentheses and selected content
        const frag = document.createDocumentFragment();
        frag.appendChild(openingParen);
        frag.appendChild(selectedContent);
        frag.appendChild(closingParen);
        
        // Insert the fragment
        range.insertNode(frag);
        
        // Move the cursor after the superscript 3
        range.setStartAfter(closingParen);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        // Save this position
        savedSelection = range;
    } else {
        // No selection: check if cursor is inside a number
        let node = range.startContainer;
        let offset = range.startOffset;
        
        if (node.nodeType !== Node.TEXT_NODE) {
            // If not in a text node, just insert "()³" with cursor inside
            insertTextAtCursor("()³");
            // Move cursor inside the parentheses
            const sel = window.getSelection();
            if (sel.rangeCount) {
                const range = sel.getRangeAt(0);
                // We need to move cursor back by 2 positions (to skip the closing parenthesis and superscript)
                if (range.startContainer.nodeType === Node.TEXT_NODE) {
                    const textNode = range.startContainer;
                    const currentOffset = range.startOffset;
                    // Move cursor to position after opening parenthesis
                    range.setStart(textNode, currentOffset - 2);
                    range.collapse(true);
                    sel.removeAllRanges();
                    sel.addRange(range);
                    // Save this position
                    savedSelection = range;
                }
            }
        } else {
            const text = node.textContent;
            
            // Find the start and end of the current number at the cursor
            let start = offset;
            let end = offset;
            
            // Move start backwards until we hit a non-digit, non-dot, or the beginning
            while (start > 0 && /[\d.]/.test(text.charAt(start - 1))) {
                start--;
            }
            
            // Move end forwards until we hit a non-digit, non-dot, or the end
            while (end < text.length && /[\d.]/.test(text.charAt(end))) {
                end++;
            }
            
            // If we found a number (at least one digit)
            if (start < end && /\d/.test(text.substring(start, end))) {
                // Extract the number
                const number = text.substring(start, end);
                
                // Replace the number with number³ (without parentheses)
                const before = text.substring(0, start);
                const after = text.substring(end);
                
                // Create a new text node for the cubed number
                const newNode = document.createTextNode(before + number + "³" + after);
                node.parentNode.replaceChild(newNode, node);
                
                // Move the cursor after the superscript 3
                const newOffset = before.length + number.length + 1; // +1 for '³'
                setCaretPosition(newNode, newOffset);
            } else {
                // No number found, insert "()³" with cursor inside
                insertTextAtCursor("()³");
                // Move cursor inside the parentheses
                const sel = window.getSelection();
                if (sel.rangeCount) {
                    const range = sel.getRangeAt(0);
                    // We need to move cursor back by 2 positions (to skip the closing parenthesis and superscript)
                    if (range.startContainer.nodeType === Node.TEXT_NODE) {
                        const textNode = range.startContainer;
                        const currentOffset = range.startOffset;
                        // Move cursor to position after opening parenthesis
                        range.setStart(textNode, currentOffset - 2);
                        range.collapse(true);
                        sel.removeAllRanges();
                        sel.addRange(range);
                        // Save this position
                        savedSelection = range;
                    }
                }
            }
        }
    }
    
    // Set AC mode since we're inside a function
    isACMode = true;
    updateACBackspaceButton();
}

function insertRoot() {
    // If we're starting a new operation after a result, clear the display
    if (isResult) {
        display.innerHTML = '';
        expression.innerHTML = '';
        isResult = false;
        lastOperator = null;
    }
    
    // Clear display if it's just "0"
    if (display.innerText.trim() === '0') {
        display.innerHTML = '';
    }
    
    focusDisplay();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let range = sel.getRangeAt(0);
    
    // If there's a selection, wrap it with √()
    if (!range.collapsed) {
        const selectedContent = range.extractContents();
        const openingText = document.createTextNode("√(");
        const closingText = document.createTextNode(")");
        
        const frag = document.createDocumentFragment();
        frag.appendChild(openingText);
        frag.appendChild(selectedContent);
        frag.appendChild(closingText);
        
        range.insertNode(frag);
        
        // Move cursor inside the parentheses
        range.setStartAfter(openingText);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        // Save this position
        savedSelection = range;
    } else {
        // Check if cursor is inside existing parentheses
        let node = range.startContainer;
        let offset = range.startOffset;
        let text = '';
        
        if (node.nodeType === Node.TEXT_NODE) {
            text = node.textContent;
            
            // Check if cursor is right after "√("
            if (offset >= 2 && text.substring(offset - 2, offset) === "√(") {
                // We're inside an existing √(), insert nested √()
                const before = text.substring(0, offset);
                const after = text.substring(offset);
                
                const newNode = document.createTextNode(before + "√()" + after);
                node.parentNode.replaceChild(newNode, node);
                
                // Move cursor inside the nested parentheses
                setCaretPosition(newNode, offset + 2);
            } else {
                // Insert new √()
                const before = text.substring(0, offset);
                const after = text.substring(offset);
                
                const newNode = document.createTextNode(before + "√()" + after);
                node.parentNode.replaceChild(newNode, node);
                
                // Move cursor inside the parentheses
                setCaretPosition(newNode, offset + 2);
            }
        } else {
            // Not in a text node, just insert √()
            insertTextAtCursor("√()");
            
            // Move cursor inside the parentheses
            if (node.childNodes.length > 0) {
                const lastChild = node.childNodes[node.childNodes.length - 1];
                if (lastChild.nodeType === Node.TEXT_NODE) {
                    setCaretPosition(lastChild, lastChild.length - 1);
                }
            }
        }
    }
    
    // Set AC mode since we're inside a function
    isACMode = true;
    updateACBackspaceButton();
}

function insertCubeRoot() {
    // If we're starting a new operation after a result, clear the display
    if (isResult) {
        display.innerHTML = '';
        expression.innerHTML = '';
        isResult = false;
        lastOperator = null;
    }
    
    // Clear display if it's just "0"
    if (display.innerText.trim() === '0') {
        display.innerHTML = '';
    }
    
    focusDisplay();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let range = sel.getRangeAt(0);
    
    // If there's a selection, wrap it with ³√()
    if (!range.collapsed) {
        const selectedContent = range.extractContents();
        const openingText = document.createTextNode("³√(");
        const closingText = document.createTextNode(")");
        
        const frag = document.createDocumentFragment();
        frag.appendChild(openingText);
        frag.appendChild(selectedContent);
        frag.appendChild(closingText);
        
        range.insertNode(frag);
        
        // Move cursor inside the parentheses
        range.setStartAfter(openingText);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        // Save this position
        savedSelection = range;
    } else {
        // Check if cursor is inside existing parentheses
        let node = range.startContainer;
        let offset = range.startOffset;
        let text = '';
        
        if (node.nodeType === Node.TEXT_NODE) {
            text = node.textContent;
            
            // Check if cursor is right after "³√("
            if (offset >= 3 && text.substring(offset - 3, offset) === "³√(") {
                // We're inside an existing ³√(), insert nested ³√()
                const before = text.substring(0, offset);
                const after = text.substring(offset);
                
                const newNode = document.createTextNode(before + "³√()" + after);
                node.parentNode.replaceChild(newNode, node);
                
                // Move cursor inside the nested parentheses
                setCaretPosition(newNode, offset + 3);
            } else {
                // Insert new ³√()
                const before = text.substring(0, offset);
                const after = text.substring(offset);
                
                const newNode = document.createTextNode(before + "³√()" + after);
                node.parentNode.replaceChild(newNode, node);
                
                // Move cursor inside the parentheses
                setCaretPosition(newNode, offset + 3);
            }
        } else {
            // Not in a text node, just insert ³√()
            insertTextAtCursor("³√()");
            
            // Move cursor inside the parentheses
            if (node.childNodes.length > 0) {
                const lastChild = node.childNodes[node.childNodes.length - 1];
                if (lastChild.nodeType === Node.TEXT_NODE) {
                    setCaretPosition(lastChild, lastChild.length - 1);
                }
            }
        }
    }
    
    // Set AC mode since we're inside a function
    isACMode = true;
    updateACBackspaceButton();
}

function insertScientificNotation() {
    // If we're starting a new operation after a result, clear the display
    if (isResult) {
        display.innerHTML = '';
        expression.innerHTML = '';
        isResult = false;
        lastOperator = null;
    }
    
    // Clear display if it's just "0"
    if (display.innerText.trim() === '0') {
        display.innerHTML = '';
    }
    
    // Change AC to Backspace when user starts typing
    if (isACMode) {
        isACMode = false;
        updateACBackspaceButton();
    }
    
    insertTextAtCursor('E');
    focusDisplay();
}

function applySciFunc(func) {
    // If we're starting a new operation after a result, clear the display
    if (isResult) {
        display.innerHTML = '';
        expression.innerHTML = '';
        isResult = false;
        lastOperator = null;
    }
    
    // Clear display if it's just "0"
    if (display.innerText.trim() === '0') {
        display.innerHTML = '';
    }
    
    focusDisplay();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let range = sel.getRangeAt(0);
    
    if (func === 'inverse') {
        // Handle 1/x function
        if (!range.collapsed) {
            // If there's a selection, wrap it with 1/()
            const selectedContent = range.extractContents();
            const openingText = document.createTextNode("1/(");
            const closingText = document.createTextNode(")");
            
            const frag = document.createDocumentFragment();
            frag.appendChild(openingText);
            frag.appendChild(selectedContent);
            frag.appendChild(closingText);
            
            range.insertNode(frag);
            
            // Move cursor inside the parentheses
            range.setStartAfter(openingText);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            // Save this position
            savedSelection = range;
        } else {
            // Check if cursor is inside existing parentheses
            let node = range.startContainer;
            let offset = range.startOffset;
            let text = '';
            
            if (node.nodeType === Node.TEXT_NODE) {
                text = node.textContent;
                
                // Check if cursor is right after "1/("
                if (offset >= 3 && text.substring(offset - 3, offset) === "1/(") {
                    // We're inside an existing 1/(), insert nested 1/()
                    const before = text.substring(0, offset);
                    const after = text.substring(offset);
                    
                    const newNode = document.createTextNode(before + "1/()" + after);
                    node.parentNode.replaceChild(newNode, node);
                    
                    // Move cursor inside the nested parentheses
                    setCaretPosition(newNode, offset + 3);
                } else {
                    // Insert new 1/()
                    const before = text.substring(0, offset);
                    const after = text.substring(offset);
                    
                    const newNode = document.createTextNode(before + "1/()" + after);
                    node.parentNode.replaceChild(newNode, node);
                    
                    // Move cursor inside the parentheses
                    setCaretPosition(newNode, offset + 3);
                }
            } else {
                // Not in a text node, just insert 1/()
                insertTextAtCursor("1/()");
                
                // Move cursor inside the parentheses
                if (node.childNodes.length > 0) {
                    const lastChild = node.childNodes[node.childNodes.length - 1];
                    if (lastChild.nodeType === Node.TEXT_NODE) {
                        setCaretPosition(lastChild, lastChild.length - 1);
                    }
                }
            }
        }
    } else if (func === 'abs') {
        // Handle abs function
        if (!range.collapsed) {
            // If there's a selection, wrap it with abs()
            const selectedContent = range.extractContents();
            const openingText = document.createTextNode("abs(");
            const closingText = document.createTextNode(")");
            
            const frag = document.createDocumentFragment();
            frag.appendChild(openingText);
            frag.appendChild(selectedContent);
            frag.appendChild(closingText);
            
            range.insertNode(frag);
            
            // Move cursor inside the parentheses
            range.setStartAfter(openingText);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
            // Save this position
            savedSelection = range;
        } else {
            // Check if cursor is inside existing parentheses
            let node = range.startContainer;
            let offset = range.startOffset;
            let text = '';
            
            if (node.nodeType === Node.TEXT_NODE) {
                text = node.textContent;
                
                // Check if cursor is right after "abs("
                if (offset >= 4 && text.substring(offset - 4, offset) === "abs(") {
                    // We're inside an existing abs(), insert nested abs()
                    const before = text.substring(0, offset);
                    const after = text.substring(offset);
                    
                    const newNode = document.createTextNode(before + "abs()" + after);
                    node.parentNode.replaceChild(newNode, node);
                    
                    // Move cursor inside the nested parentheses
                    setCaretPosition(newNode, offset + 4);
                } else {
                    // Insert new abs()
                    const before = text.substring(0, offset);
                    const after = text.substring(offset);
                    
                    const newNode = document.createTextNode(before + "abs()" + after);
                    node.parentNode.replaceChild(newNode, node);
                    
                    // Move cursor inside the parentheses
                    setCaretPosition(newNode, offset + 4);
                }
            } else {
                // Not in a text node, just insert abs()
                insertTextAtCursor("abs()");
                
                // Move cursor inside the parentheses
                if (node.childNodes.length > 0) {
                    const lastChild = node.childNodes[node.childNodes.length - 1];
                    if (lastChild.nodeType === Node.TEXT_NODE) {
                        setCaretPosition(lastChild, lastChild.length - 1);
                    }
                }
            }
        }
    }
    
    // Set AC mode since we're inside a function
    isACMode = true;
    updateACBackspaceButton();
}

function insertFactorial() {
    // If we're starting a new operation after a result, clear the display
    if (isResult) {
        display.innerHTML = '';
        expression.innerHTML = '';
        isResult = false;
        lastOperator = null;
    }
    
    // Change AC to Backspace when user starts typing
    if (isACMode) {
        isACMode = false;
        updateACBackspaceButton();
    }
    
    focusDisplay();
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    let range = sel.getRangeAt(0);
    
    // If there's a selection, add factorial after the selection
    if (!range.collapsed) {
        const selectedText = range.toString();
        const factorialNode = document.createTextNode("!");
        
        // Extract the selected content
        const selectedContent = range.extractContents();
        
        // Create a document fragment to hold the selected content and factorial
        const frag = document.createDocumentFragment();
        frag.appendChild(selectedContent);
        frag.appendChild(factorialNode);
        
        // Insert the fragment
        range.insertNode(frag);
        
        // Move the cursor after the factorial
        range.setStartAfter(factorialNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        // Save this position
        savedSelection = range;
        return;
    }
    
    // No selection: check if cursor is inside a number
    let node = range.startContainer;
    let offset = range.startOffset;
    
    if (node.nodeType !== Node.TEXT_NODE) {
        // If not in a text node, just insert "!"
        insertTextAtCursor("!");
        return;
    }
    
    const text = node.textContent;
    
    // Find the start and end of the current number at the cursor
    let start = offset;
    let end = offset;
    
    // Move start backwards until we hit a non-digit, non-dot, or the beginning
    while (start > 0 && /[\d.]/.test(text.charAt(start - 1))) {
        start--;
    }
    
    // Move end forwards until we hit a non-digit, non-dot, or the end
    while (end < text.length && /[\d.]/.test(text.charAt(end))) {
        end++;
    }
    
    // If we found a number (at least one digit)
    if (start < end && /\d/.test(text.substring(start, end))) {
        // Extract the number
        const number = text.substring(start, end);
        
        // Replace the number with number!
        const before = text.substring(0, start);
        const after = text.substring(end);
        
        // Create a new text node for the factorial number
        const newNode = document.createTextNode(before + number + "!" + after);
        node.parentNode.replaceChild(newNode, node);
        
        // Move the cursor after the factorial
        const newOffset = before.length + number.length + 1; // +1 for '!'
        setCaretPosition(newNode, newOffset);
    } else {
        // No number found, just insert "!"
        insertTextAtCursor("!");
    }
}

function isParenthesesBalanced(expr) {
    let stack = [];
    for (let char of expr) {
        if (char === '(') stack.push(char);
        else if (char === ')') {
            if (!stack.length) return false;
            stack.pop();
        }
    }
    return stack.length === 0;
}

function autoCloseParentheses(expr) {
    let stack = [];
    let result = '';
    
    for (let char of expr) {
        if (char === '(') {
            stack.push(result.length);
            result += char;
        } else if (char === ')') {
            if (stack.length > 0) {
                stack.pop();
                result += char;
            } else {
                // Extra closing parenthesis, ignore it
            }
        } else {
            result += char;
        }
    }
    
    // Add missing closing parentheses
    while (stack.length > 0) {
        result += ')';
        stack.pop();
    }
    
    return result;
}

function convertPowerExpressions(expr) {
    // Process the expression from right to left to handle nested expressions correctly
    let result = '';
    let i = expr.length - 1;
    
    while (i >= 0) {
        if (i >= 1 && (expr.substr(i-1, 2) === ')²' || expr.substr(i-1, 2) === ')³')) {
            // Found a power expression, find the matching opening parenthesis
            let power = expr[i] === '²' ? '2' : '3';
            let depth = 0;
            let j = i - 2; // Start before the )² or )³
            
            // Find the matching opening parenthesis
            while (j >= 0) {
                if (expr[j] === ')') depth++;
                else if (expr[j] === '(') {
                    if (depth === 0) break;
                    depth--;
                }
                j--;
            }
            
            if (j >= 0) {
                // Found matching opening parenthesis
                let content = expr.substring(j+1, i-1);
                // Recursively process the content to handle nested power expressions
                content = convertPowerExpressions(content);
                result = `pow(${content},${power})` + result;
                i = j - 1; // Skip the opening parenthesis
            } else {
                // No matching opening parenthesis, just append the characters
                result = expr[i] + result;
                i--;
            }
        } else {
            result = expr[i] + result;
            i--;
        }
    }
    
    return result;
}

function calculate() {
    try {
        // Get the expression by traversing the DOM to properly handle all structures
        let expr = convertDisplayToMathExpression();
        if (!expr) return;
        
        // Save the original expression exactly as displayed
        const originalExpression = display.innerHTML;
        
        expr = autoCloseParentheses(expr);
        if (!isParenthesesBalanced(expr)) {
            display.innerHTML = 'Lỗi: Dấu ngoặc không khớp';
            expression.innerHTML = '';
            focusDisplay();
            placeCaretAtEnd(display);
            return;
        }
        
        // Replace ln with log (natural logarithm)
        expr = expr.replace(/ln\s*\(/g, 'log(');
        
        expr = expr
            .replace(/π/g, 'pi')
            .replace(/e/g, 'e')
            .replace(/³√/g, 'cbrt')   // First replace cube root
            .replace(/√/g, 'sqrt')    // Then replace square root
            .replace(/×/g, '*')
            .replace(/÷/g, '/');
        
        // Handle the (number)² and (number)³ formats with nested parentheses
        expr = convertPowerExpressions(expr);
        
        // Handle direct superscripts like 555²
        expr = expr.replace(/(\d+(\.\d+)?)²/g, 'pow($1,2)');
        expr = expr.replace(/(\d+(\.\d+)?)³/g, 'pow($1,3)');
        
        // Handle factorial without parentheses
        expr = expr.replace(/(\d+)!/g, 'factorial($1)');
        // Handle factorial with parentheses
        expr = expr.replace(/\(([^)]+)\)!/g, 'factorial($1)');
        // Fixed log replacement to handle nested functions
        expr = expr.replace(/log\s*\(/g, 'log10(');
        expr = expr.replace(/abs\(/g, 'abs(');
        expr = expr.replace(/(\d+)E(\d+)/g, '$1e$2');
        expr = expr.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

        expr = replaceTrigFunctions(expr);
        expr = expr.replace(/\b(sin|cos|tan|asin|acos|atan|sqrt|log|ln|abs|fact)\(\s*\)/g, '0');

        const result = math.evaluate(expr);
        if (typeof result === 'number' && !isNaN(result)) {
            // Display the expression above the result
            expression.innerHTML = originalExpression;
            display.innerHTML = result;
            // Save the original expression (as HTML) and the result
            history.push({ expression: originalExpression, result: result });
            isResult = true;
            lastOperator = null;
            // Switch back to AC mode after calculation
            isACMode = true;
            updateACBackspaceButton();
        } else {
            if (result && (result.re !== undefined || result.im !== undefined)) {
                expression.innerHTML = originalExpression;
                display.innerHTML = result.toString();
                history.push({ expression: originalExpression, result: result.toString() });
                isResult = true;
                lastOperator = null;
                // Switch back to AC mode after calculation
                isACMode = true;
                updateACBackspaceButton();
            } else {
                display.innerHTML = 'Lỗi: Kết quả không hợp lệ';
                expression.innerHTML = '';
                isResult = false;
                lastOperator = null;
                // Switch back to AC mode after error
                isACMode = true;
                updateACBackspaceButton();
            }
        }
    } catch (e) {
        display.innerHTML = 'Lỗi: ' + e.message;
        expression.innerHTML = '';
        isResult = false;
        lastOperator = null;
        // Switch back to AC mode after error
        isACMode = true;
        updateACBackspaceButton();
    }
    focusDisplay();
    placeCaretAtEnd(display);
}

// New function to convert display to math expression by traversing DOM
function convertDisplayToMathExpression() {
    let result = '';
    
    function processNode(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent;
            // Handle inverse trig functions by replacing special characters
            text = text.replace(/sin⁻¹/g, 'asin')
                      .replace(/cos⁻¹/g, 'acos')
                      .replace(/tan⁻¹/g, 'atan');
            result += text;
        } else if (node.classList && node.classList.contains('power-expr')) {
            const baseNode = node.querySelector('.base');
            const expNode = node.querySelector('.exp');
            
            if (baseNode && expNode) {
                // Get the text content directly
                const base = baseNode.textContent || '0';
                const exp = expNode.textContent || '0';
                
                // Validate that both base and exponent are not empty
                if (base.trim() === '' || exp.trim() === '') {
                    // If either is empty, use default values
                    result += `pow(${base || '0'},${exp || '0'})`;
                } else {
                    // Check if they are valid numbers
                    const baseNum = parseFloat(base);
                    const expNum = parseFloat(exp);
                    
                    if (isNaN(baseNum) || isNaN(expNum)) {
                        // If they are not valid numbers, treat them as variables
                        result += `pow(${base},${exp})`;
                    } else {
                        // If they are valid numbers, use them directly
                        result += `pow(${baseNum},${expNum})`;
                    }
                }
            }
            return; // Skip processing children of power-expr
        } else if (node.classList && node.classList.contains('exp-x-expr')) {
            const expNode = node.querySelector('.exp');
            
            if (expNode) {
                // Get the exponent content
                const exponent = expNode.textContent || '0';
                
                // Convert to exp(exponent) format
                result += `exp(${exponent})`;
            }
            return; // Skip processing children of exp-x-expr
        } else {
            // Process child nodes
            for (let i = 0; i < node.childNodes.length; i++) {
                processNode(node.childNodes[i]);
            }
        }
    }
    
    processNode(display);
    return result;
}

function convertPowerBlocks(expr) {
    // This function is now replaced by convertDisplayToMathExpression
    return expr;
}

// Optimized parser for trig functions
function replaceTrigFunctions(expr) {
    const funcs = {
        sin: { deg: v => `sin((${v}) * pi / 180)`, rad: v => `sin(${v})` },
        cos: { deg: v => `cos((${v}) * pi / 180)`, rad: v => `cos(${v})` },
        tan: { deg: v => `tan((${v}) * pi / 180)`, rad: v => `tan(${v})` },
        asin: { deg: v => `(asin(${v}) * 180 / pi)`, rad: v => `asin(${v})` },
        acos: { deg: v => `(acos(${v}) * 180 / pi)`, rad: v => `acos(${v})` },
        atan: { deg: v => `(atan(${v}) * 180 / pi)`, rad: v => `atan(${v})` }
    };

    // Use a more efficient approach with regex replacements
    const funcPattern = /(?:sin|cos|tan|asin|acos|atan)\s*\([^)]*\)/g;
    let result = '';
    let lastIndex = 0;
    let match;
    
    while ((match = funcPattern.exec(expr)) !== null) {
        // Add the part before the match
        result += expr.substring(lastIndex, match.index);
        
        // Process the matched function
        const funcMatch = match[0];
        const funcName = funcMatch.match(/^(sin|cos|tan|asin|acos|atan)/)[1];
        const innerExpr = funcMatch.substring(funcName.length + 1, funcMatch.length - 1);
        
        // Apply the appropriate conversion
        const conversion = funcs[funcName][angleMode];
        result += conversion(innerExpr);
        
        lastIndex = funcPattern.lastIndex;
    }
    
    // Add the remaining part of the expression
    result += expr.substring(lastIndex);
    
    return result;
}

function getPlainExpression(el) {
    let text = el.innerText || el.textContent;
    if (!text) return null;
    return text;
}

function openHistory() {
    if (history.length === 0) {
        // Enhanced message for empty history
        historyContent.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <i class="fas fa-history" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                <p>Chưa có lịch sử tính toán nào.</p>
                <p style="font-size: 14px; margin-top: 5px;">Hãy thực hiện một phép tính để xem lịch sử tại đây.</p>
            </div>
        `;
    } else {
        // Enhanced history display with heading
        historyContent.innerHTML = `
            <div style="margin-bottom: 15px; font-weight: 500; color: #333;">
                <i class="fas fa-history" style="margin-right: 8px;"></i>
                Lịch sử tính toán gần đây
            </div>
        `;
        
        history.forEach((item, index) => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.tabIndex = 0;
            historyItem.onclick = () => loadFromHistory(index);
            
            // Create a container for the expression
            const exprContainer = document.createElement('span');
            
            // Parse the expression HTML and convert power expressions to a readable format
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.expression;
            
            function processNode(node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    return document.createTextNode(node.textContent);
                }
                
                if (node.classList && node.classList.contains('power-expr')) {
                    const powerElement = document.createElement('span');
                    powerElement.className = 'history-power';
                    
                    const baseElement = document.createElement('span');
                    baseElement.className = 'base';
                    baseElement.textContent = node.querySelector('.base')?.textContent || '0';
                    
                    const expElement = document.createElement('span');
                    expElement.className = 'exp';
                    expElement.textContent = node.querySelector('.exp')?.textContent || '0';
                    
                    powerElement.appendChild(baseElement);
                    powerElement.appendChild(expElement);
                    
                    return powerElement;
                } else if (node.classList && node.classList.contains('exp-x-expr')) {
                    // Handle e^x expressions in history
                    const expXElement = document.createElement('span');
                    expXElement.className = 'history-power';
                    
                    const baseElement = document.createElement('span');
                    baseElement.className = 'base';
                    baseElement.textContent = 'e';
                    baseElement.style.fontStyle = 'italic';
                    
                    const expElement = document.createElement('span');
                    expElement.className = 'exp';
                    expElement.textContent = node.querySelector('.exp')?.textContent || 'x';
                    
                    expXElement.appendChild(baseElement);
                    expXElement.appendChild(expElement);
                    
                    return expXElement;
                }
                
                // Clone other nodes
                const clone = node.cloneNode(false);
                
                // Process children
                Array.from(node.childNodes).forEach(child => {
                    clone.appendChild(processNode(child));
                });
                
                return clone;
            }
            
            // Process all nodes in the expression
            Array.from(tempDiv.childNodes).forEach(child => {
                exprContainer.appendChild(processNode(child));
            });
            
            // Create the equals sign and result
            const equalsText = document.createTextNode(' = ');
            const resultText = document.createTextNode(item.result);
            
            historyItem.appendChild(exprContainer);
            historyItem.appendChild(equalsText);
            historyItem.appendChild(resultText);
            
            historyContent.appendChild(historyItem);
        });
    }
    
    // Show modal with a slight delay for better rendering
    setTimeout(() => {
        historyModal.classList.add('active');
        // Focus on modal content after a delay
        setTimeout(() => {
            historyContent.focus();
        }, 100);
    }, 10);
}

function closeHistory() {
    historyModal.classList.remove('active');
    restoreCursorPosition();
}

function loadFromHistory(index) {
    const item = history[index];
    display.innerHTML = item.expression;
    expression.innerHTML = '';
    isResult = false;
    lastOperator = null;
    // Switch to backspace mode when loading from history
    isACMode = false;
    updateACBackspaceButton();
    closeHistory();
    focusDisplay();
    placeCaretAtEnd(display);
}

angleRadios.forEach(radio => {
    radio.addEventListener('change', () => {
        angleMode = radio.value;
    });
});

document.addEventListener('keydown', function(e) {
    if (document.activeElement === display) {
        return;
    }
    if (e.key >= '0' && e.key <= '9') {
        insertChar(e.key);
        e.preventDefault();
    } else if (e.key === '.') {
        insertChar('.');
        e.preventDefault();
    } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
        insertChar(e.key);
        e.preventDefault();
    } else if (e.key === 'Enter' || e.key === '=') {
        calculate();
        e.preventDefault();
    } else if (e.key === 'Escape') {
        clearAll();
        e.preventDefault();
    } else if (e.key === 'Backspace') {
        backspace();
        e.preventDefault();
    } else if (e.key === '(') {
        insertChar('(');
        e.preventDefault();
    } else if (e.key === ')') {
        insertChar(')');
        e.preventDefault();
    } else if (e.key === '%') {
        insertChar('%');
        e.preventDefault();
    } else if (e.key === '!') {
        insertFactorial();
        e.preventDefault();
    }
});

// Save cursor position when display loses focus
display.addEventListener('blur', function() {
    saveCursorPosition();
});

// Restore cursor position when display gets focus
display.addEventListener('focus', function() {
    restoreCursorPosition();
});

// Add click event to close modal when clicking outside
document.getElementById('historyModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeHistory();
    }
});

// Initialize calculator on page load
window.addEventListener('load', function() {
    initializeCalculator();
    display.focus();
    placeCaretAtEnd(display);
});

function clearAll() {
    display.innerHTML = '0';
    expression.innerHTML = '';
    isResult = false;
    lastOperator = null;
    isACMode = true; // Set to AC mode
    updateACBackspaceButton(); // Update the button text
    focusDisplay();
    placeCaretAtEnd(display);
}

// Mobile Menu JavaScript
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    mobileMenuBtn.addEventListener('click', function() {
        mobileMenu.classList.toggle('active');
        
        // Change icon between bars and times
        const icon = mobileMenuBtn.querySelector('i');
        if (icon.classList.contains('fa-bars')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
    
    // Close mobile menu when clicking on a link
    const mobileLinks = document.querySelectorAll('.mobile-menu-links a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenu.classList.remove('active');
            const icon = mobileMenuBtn.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        });
    });
});
          
