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
          
