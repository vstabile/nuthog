// Set up a MutationObserver to watch for DOM changes
const observer = new MutationObserver(function (mutations) {
  mutations.forEach(function (mutation) {
    // Check for added nodes
    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        const node = mutation.addedNodes[i];
        if (node.nodeType === Node.TEXT_NODE) {
          scanTextForEmojis(node.textContent, node);
          scanTextForCashuTokens(node.textContent, node);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          // Scan the text content of this element and its children
          scanElementForEmojis(node);
          scanElementForCashuTokens(node);
        }
      }
    }

    // Check for character data changes
    if (mutation.type === "characterData") {
      scanTextForEmojis(mutation.target.textContent, mutation.target);
      scanTextForCashuTokens(mutation.target.textContent, mutation.target);
    }
  });
});

// Start observing the document with the configured parameters
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
});

// Initial scan of the page
scanElementForEmojis(document.body);
scanElementForCashuTokens(document.body);

// Function to scan an element and its children for emojis
function scanElementForEmojis(element) {
  // Skip script and style elements
  if (element.tagName === "SCRIPT" || element.tagName === "STYLE") {
    return;
  }

  // Scan text nodes directly under this element
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      scanTextForEmojis(node.textContent, node);
    }
  }

  // Recursively scan child elements
  const children = element.querySelectorAll("*");
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.tagName !== "SCRIPT" && child.tagName !== "STYLE") {
      for (let j = 0; j < child.childNodes.length; j++) {
        const node = child.childNodes[j];
        if (node.nodeType === Node.TEXT_NODE) {
          scanTextForEmojis(node.textContent, node);
        }
      }
    }
  }
}

// Function to scan an element and its children for Cashu tokens
function scanElementForCashuTokens(element) {
  // Skip script and style elements
  if (element.tagName === "SCRIPT" || element.tagName === "STYLE") {
    return;
  }

  // Scan text nodes directly under this element
  for (let i = 0; i < element.childNodes.length; i++) {
    const node = element.childNodes[i];
    if (node.nodeType === Node.TEXT_NODE) {
      scanTextForCashuTokens(node.textContent, node);
    }
  }

  // Check for input elements that might contain Cashu tokens
  if (
    element.tagName === "INPUT" &&
    (element.type === "text" || element.type === "hidden" || !element.type)
  ) {
    scanTextForCashuTokens(element.value, element);
  }

  // Check for textarea elements
  if (element.tagName === "TEXTAREA") {
    scanTextForCashuTokens(element.value, element);
  }

  // Recursively scan child elements
  const children = element.querySelectorAll("*");
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    if (child.tagName !== "SCRIPT" && child.tagName !== "STYLE") {
      // Check for input and textarea elements
      if (
        child.tagName === "INPUT" &&
        (child.type === "text" || child.type === "hidden" || !child.type)
      ) {
        scanTextForCashuTokens(child.value, child);
      } else if (child.tagName === "TEXTAREA") {
        scanTextForCashuTokens(child.value, child);
      }

      // Scan text nodes
      for (let j = 0; j < child.childNodes.length; j++) {
        const node = child.childNodes[j];
        if (node.nodeType === Node.TEXT_NODE) {
          scanTextForCashuTokens(node.textContent, node);
        }
      }
    }
  }
}

// Function to scan text for emojis and extract encoded data
function scanTextForEmojis(text, node) {
  if (!text) return;

  // Process the text character by character to find emoji sequences
  const characters = Array.from(text);

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];

    // Check if this character is an emoji
    if (/\p{Emoji}/u.test(char)) {
      // Found an emoji, now collect the entire sequence including variation selectors
      let emojiSequence = char;
      let j = i + 1;

      // Keep adding characters as long as they're variation selectors
      while (j < characters.length) {
        const nextChar = characters[j];
        const codePoint = nextChar.codePointAt(0);

        // Check if it's a variation selector
        if (
          (codePoint >= 0xfe00 && codePoint <= 0xfe0f) ||
          (codePoint >= 0xe0100 && codePoint <= 0xe01ef)
        ) {
          emojiSequence += nextChar;
          j++;
        } else {
          break;
        }
      }

      // Update the index to skip the characters we've processed
      i = j - 1;

      // Only process sequences with potential encoded data (more than just the base emoji)
      if (emojiSequence.length > 1) {
        try {
          // Try to decode the emoji
          const decoded = decodeEmojiData(emojiSequence);
          if (decoded) {
            // Send the decoded data to the background script
            try {
              chrome.runtime.sendMessage({
                action: "emojiDetected",
                emoji: emojiSequence,
                decoded: decoded,
                url: window.location.href,
              });
            } catch (error) {
              console.log(
                "Error sending emoji to background script:",
                error.message
              );
              // If the extension context is invalidated, we can't do much
              // The page needs to be refreshed to reconnect to the extension
            }
          }
        } catch (error) {
          // Not a valid encoded emoji, ignore
        }
      }
    }
  }
}

// Function to scan text for plain Cashu tokens
function scanTextForCashuTokens(text, node) {
  if (!text) return;

  // Regular expression to find Cashu tokens
  // This pattern matches both formats:
  // 1. cashu followed by base64url characters with dots (common format)
  // 2. cashu followed by base64url characters without dots (alternative format)
  const cashuRegex = /cashu[A-Za-z0-9\-_]{10,}\b/g;

  // Find all matches
  const matches = text.match(cashuRegex);

  if (matches) {
    // Process each match
    matches.forEach((token) => {
      // Check if it's a valid token format
      if (isValidCashuTokenFormat(token)) {
        console.log("Found Cashu token:", token.substring(0, 20) + "...");

        // Send the token to the background script
        try {
          chrome.runtime.sendMessage({
            action: "cashuTokenDetected",
            token: token,
            url: window.location.href,
          });
        } catch (error) {
          console.log(
            "Error sending token to background script:",
            error.message
          );
          // If the extension context is invalidated, we can't do much
          // The page needs to be refreshed to reconnect to the extension
        }
      }
    });
  }
}

// Function to check if a token has valid Cashu format
function isValidCashuTokenFormat(token) {
  // Basic validation - should start with "cashu" and be reasonably long
  if (!token.startsWith("cashu") || token.length < 20) {
    return false;
  }

  try {
    // Most Cashu tokens follow the format "cashu" + base64url encoded data
    const tokenPart = token.substring(5); // Skip "cashu" prefix

    // Check if the token has valid base64url characters
    // Base64url uses A-Z, a-z, 0-9, -, and _ characters
    const base64urlRegex = /^[A-Za-z0-9\-_]+$/;
    if (!base64urlRegex.test(tokenPart)) {
      console.log("Token contains invalid characters for base64url encoding");
      return false;
    }

    // Check if the token has a reasonable length
    if (tokenPart.length < 10 || tokenPart.length > 10000) {
      console.log("Token has suspicious length:", tokenPart.length);
      return false;
    }

    // Note: We're no longer requiring dots in the token format
    // as some valid tokens don't have them

    // If we've passed all checks, it's likely a valid token format
    return true;
  } catch (error) {
    console.error("Error validating token format:", error);
    return false;
  }
}

// Function to decode emoji data based on the provided algorithm
function decodeEmojiData(emoji) {
  try {
    // Skip the first character (the base emoji)
    const emojiChars = Array.from(emoji);

    // Check if we have any characters beyond the base emoji
    if (emojiChars.length <= 1) {
      return null;
    }

    // Try to decode the data
    const decoded = emojiChars
      .slice(1)
      .map((char) => {
        const codePoint = char.codePointAt(0);
        // Handle Variation Selectors (VS1-VS16): U+FE00 to U+FE0F
        if (codePoint >= 0xfe00 && codePoint <= 0xfe0f) {
          const byteValue = codePoint - 0xfe00; // Maps FE00->0, FE01->1, ..., FE0F->15
          return String.fromCharCode(byteValue);
        }
        // Handle Variation Selectors Supplement (VS17-VS256): U+E0100 to U+E01EF
        if (codePoint >= 0xe0100 && codePoint <= 0xe01ef) {
          const byteValue = codePoint - 0xe0100 + 16; // Maps E0100->16, E0101->17, ..., E01EF->255
          return String.fromCharCode(byteValue);
        }

        throw new Error("Invalid code point: " + codePoint);
      })
      .join("");

    // Check if the decoded string starts with "cashu"
    if (decoded.startsWith("cashu")) {
      console.log(
        "Successfully decoded Cashu token:",
        decoded.substring(0, 50) + "..."
      );
      return decoded;
    }

    return null;
  } catch (error) {
    return null;
  }
}
