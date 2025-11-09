/**
 * Copy Code Functionality
 * Adds copy buttons to code blocks for easy copying
 */

(function() {
  'use strict';

  /**
   * Add copy buttons to all code blocks
   */
  function addCopyButtons() {
    // Find all code blocks with the .highlight class
    const codeBlocks = document.querySelectorAll('.highlight');

    codeBlocks.forEach(function(codeBlock) {
      // Skip if button already exists
      if (codeBlock.querySelector('.copy-code-button')) {
        return;
      }

      // Create the copy button
      const button = document.createElement('button');
      button.className = 'copy-code-button';
      button.type = 'button';
      button.textContent = 'Copy';
      button.setAttribute('aria-label', 'Copy code to clipboard');

      // Add click event listener
      button.addEventListener('click', function() {
        copyCode(codeBlock, button);
      });

      // Insert the button at the beginning of the code block
      codeBlock.insertBefore(button, codeBlock.firstChild);
    });
  }

  /**
   * Copy code from a code block to clipboard
   * @param {HTMLElement} codeBlock - The code block element
   * @param {HTMLElement} button - The copy button element
   */
  function copyCode(codeBlock, button) {
    let code;

    // Check if code block has line numbers (table structure)
    const codeElement = codeBlock.querySelector('.code pre');

    if (codeElement) {
      // Code block with line numbers - get text from .code column
      code = codeElement.textContent;
    } else {
      // Code block without line numbers - get text from pre
      const preElement = codeBlock.querySelector('pre');
      code = preElement ? preElement.textContent : '';
    }

    // Remove any trailing whitespace
    code = code.trim();

    // Copy to clipboard using the Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      // Modern browsers with Clipboard API
      navigator.clipboard.writeText(code).then(function() {
        showCopySuccess(button);
      }).catch(function(err) {
        console.error('Failed to copy code: ', err);
        fallbackCopyToClipboard(code, button);
      });
    } else {
      // Fallback for older browsers
      fallbackCopyToClipboard(code, button);
    }
  }

  /**
   * Fallback method to copy text to clipboard for older browsers
   * @param {string} text - The text to copy
   * @param {HTMLElement} button - The copy button element
   */
  function fallbackCopyToClipboard(text, button) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      if (successful) {
        showCopySuccess(button);
      } else {
        console.error('Fallback: Failed to copy code');
      }
    } catch (err) {
      console.error('Fallback: Unable to copy', err);
    }

    document.body.removeChild(textArea);
  }

  /**
   * Show success feedback on the copy button
   * @param {HTMLElement} button - The copy button element
   */
  function showCopySuccess(button) {
    const originalText = button.textContent;

    button.textContent = 'Copied!';
    button.classList.add('copied');

    // Reset button after 2 seconds
    setTimeout(function() {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 2000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addCopyButtons);
  } else {
    // DOM is already ready
    addCopyButtons();
  }

  // Also reinitialize if new content is loaded dynamically
  // (useful for single-page applications or dynamic content)
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length) {
          addCopyButtons();
        }
      });
    });

    // Start observing when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    } else {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }
})();
