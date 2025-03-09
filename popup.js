document.addEventListener("DOMContentLoaded", function () {
  // Main view elements
  const mainView = document.querySelector(".main-view");
  const settingsBtn = document.getElementById("settings-btn");
  const clearHistoryBtn = document.getElementById("clear-history-btn");

  // Settings view elements
  const settingsView = document.querySelector(".settings-view");
  const backBtn = document.getElementById("back-btn");
  const saveSettingsBtn = document.getElementById("save-settings-btn");
  const mintUrlInput = document.getElementById("mint-url");
  const autoSwapToggle = document.getElementById("auto-swap");
  const notificationsToggle = document.getElementById("notifications");
  const toastNotificationsToggle = document.getElementById(
    "toast-notifications"
  );
  const playSoundsToggle = document.getElementById("play-sounds");
  const showSeedBtn = document.getElementById("show-seed");
  const generateSeedBtn = document.getElementById("generate-seed");
  const seedDisplay = document.getElementById("seed-display");
  const restoreSeedInput = document.getElementById("restore-seed");
  const restoreWalletBtn = document.getElementById("restore-wallet");
  const statusMessage = document.getElementById("status-message");

  // Get references to the view toggle buttons and containers
  const viewProofsBtn = document.getElementById("view-proofs-btn");
  const viewSpentBtn = document.getElementById("view-spent-btn");
  const mintProofsContainer = document.getElementById("mint-proofs");
  const spentTokensContainer = document.getElementById("spent-tokens");
  const proofsTitleText = document.getElementById("proofs-title-text");

  // Load stats, tokens, and mint proofs from storage
  chrome.storage.local.get(
    ["stats", "tokens", "settings", "wallet", "mintProofs"],
    function (data) {
      updateStats(data.stats || { found: 0, claimed: 0, totalValue: 0 });
      updateTokenHistory(data.tokens || []);
      updateMintProofs(data.mintProofs || {});

      // Check if wallet exists
      if (data.wallet) {
        document.getElementById("wallet-status").textContent = "Wallet Ready";
        document.getElementById("wallet-status").classList.add("wallet-ready");
      } else {
        document.getElementById("wallet-status").textContent = "No Wallet";
        document
          .getElementById("wallet-status")
          .classList.add("wallet-missing");
      }

      // Load settings
      loadSettings(data.settings, data.wallet);
    }
  );

  // Set up event listeners for main view
  settingsBtn.addEventListener("click", showSettings);
  clearHistoryBtn.addEventListener("click", clearHistory);

  // Set up event listeners for settings view
  backBtn.addEventListener("click", hideSettings);
  saveSettingsBtn.addEventListener("click", saveSettings);
  showSeedBtn.addEventListener("click", showSeedPhrase);
  generateSeedBtn.addEventListener("click", generateNewSeed);
  restoreWalletBtn.addEventListener("click", restoreWallet);

  // Listen for updates from background script
  chrome.runtime.onMessage.addListener(function (message) {
    if (message.action === "updateStats") {
      updateStats(message.stats);
      updateTokenHistory(message.tokens);

      // Also refresh mint proofs when stats are updated
      chrome.storage.local.get(["mintProofs"], function (data) {
        updateMintProofs(data.mintProofs || {});
      });
    }
  });

  // Add event listeners for view toggle buttons
  viewProofsBtn.addEventListener("click", function () {
    viewProofsBtn.classList.add("active");
    viewSpentBtn.classList.remove("active");
    mintProofsContainer.classList.remove("hidden");
    spentTokensContainer.classList.add("hidden");
    proofsTitleText.textContent = "Stored Proofs by Mint";
  });

  viewSpentBtn.addEventListener("click", function () {
    viewSpentBtn.classList.add("active");
    viewProofsBtn.classList.remove("active");
    spentTokensContainer.classList.remove("hidden");
    mintProofsContainer.classList.add("hidden");
    proofsTitleText.textContent = "Spent Tokens";

    // Load spent tokens when this view is activated
    updateSpentTokens();
  });

  // Function to show settings panel
  function showSettings() {
    backBtn.style.display = "block";
    settingsView.classList.add("active");
    mainView.classList.add("hidden");
  }

  // Function to hide settings panel
  function hideSettings() {
    backBtn.style.display = "none";
    settingsView.classList.remove("active");
    mainView.classList.remove("hidden");
  }

  // Function to load settings
  function loadSettings(settings, wallet) {
    const defaultSettings = {
      mintUrl: "https://legend.lnbits.com/cashu/api/v1/4gr9Xcmz3XEkUNwiBiQGoC",
      notificationsEnabled: true,
      useToastNotifications: true,
      playSounds: true,
    };

    // Use provided settings or defaults
    settings = settings || defaultSettings;

    // Update UI with settings
    mintUrlInput.value = settings.mintUrl;
    notificationsToggle.checked = settings.notificationsEnabled;
    toastNotificationsToggle.checked = settings.useToastNotifications !== false;
    playSoundsToggle.checked = settings.playSounds !== false;

    // Check if wallet exists
    if (wallet && wallet.seedPhrase) {
      showSeedBtn.disabled = false;

      // If the wallet was auto-generated, show a notification to the user
      if (wallet.autoGenerated) {
        showStatus(
          "A wallet has been automatically generated for you. Please back up your seed phrase!",
          "warning"
        );
      }
    } else {
      showSeedBtn.disabled = true;
      showStatus(
        "No wallet found. Generate a new seed phrase or restore from existing.",
        "error"
      );
    }
  }

  // Function to save settings
  function saveSettings() {
    const settings = {
      mintUrl: mintUrlInput.value.trim(),
      notificationsEnabled: notificationsToggle.checked,
      useToastNotifications: toastNotificationsToggle.checked,
      playSounds: playSoundsToggle.checked,
    };

    // Validate mint URL
    if (!settings.mintUrl) {
      showStatus("Please enter a valid mint URL", "error");
      return;
    }

    chrome.storage.local.set({ settings }, function () {
      showStatus("Settings saved successfully!", "success");

      // Notify background script about settings change
      chrome.runtime.sendMessage({
        action: "settingsUpdated",
        settings: settings,
      });
    });
  }

  // Function to show seed phrase
  function showSeedPhrase() {
    chrome.storage.local.get(["wallet"], function (data) {
      if (data.wallet && data.wallet.seedPhrase) {
        seedDisplay.textContent = data.wallet.seedPhrase;
        seedDisplay.classList.remove("hidden");
        showSeedBtn.textContent = "Hide Seed Phrase";
        showSeedBtn.removeEventListener("click", showSeedPhrase);
        showSeedBtn.addEventListener("click", hideSeedPhrase);

        // If this is an auto-generated wallet being viewed for the first time, mark it as viewed
        if (data.wallet.autoGenerated && !data.wallet.seedViewed) {
          const updatedWallet = {
            ...data.wallet,
            seedViewed: true,
          };
          chrome.storage.local.set({ wallet: updatedWallet });

          showStatus(
            "This is your auto-generated wallet seed phrase. Please back it up securely!",
            "warning"
          );
        }
      } else {
        showStatus(
          "No wallet found. Generate a new seed phrase first.",
          "error"
        );
      }
    });
  }

  // Function to hide seed phrase
  function hideSeedPhrase() {
    seedDisplay.classList.add("hidden");
    showSeedBtn.textContent = "Show Seed Phrase";
    showSeedBtn.removeEventListener("click", hideSeedPhrase);
    showSeedBtn.addEventListener("click", showSeedPhrase);
  }

  // Function to generate a new seed phrase
  function generateNewSeed() {
    if (
      confirm(
        "This will generate a new wallet and replace any existing one. Make sure you have backed up your current seed phrase if needed. Continue?"
      )
    ) {
      // Generate a new BIP-39 seed phrase (12 words)
      // In a real implementation, you would use a proper BIP-39 library
      // For this example, we'll simulate it with a placeholder

      // This is just a simulation - in a real app, use a proper BIP-39 library
      const wordList = [
        "abandon",
        "ability",
        "able",
        "about",
        "above",
        "absent",
        "absorb",
        "abstract",
        "absurd",
        "abuse",
        "access",
        "accident",
        "account",
        "accuse",
        "achieve",
        "acid",
        "acoustic",
        "acquire",
        "across",
        "act",
        "action",
        "actor",
        "actress",
        "actual",
        "adapt",
        "add",
        "addict",
        "address",
        "adjust",
        "admit",
        "adult",
        "advance",
        "advice",
        "aerobic",
        "affair",
        "afford",
        "afraid",
        "again",
        "age",
        "agent",
        "agree",
        "ahead",
        "aim",
        "air",
        "airport",
        "aisle",
        "alarm",
        "album",
        "alcohol",
        "alert",
        "alien",
        "all",
        "alley",
        "allow",
        "almost",
        "alone",
        "alpha",
        "already",
        "also",
        "alter",
        "always",
        "amateur",
        "amazing",
        "among",
        "amount",
        "amused",
        "analyst",
        "anchor",
        "ancient",
        "anger",
        "angle",
        "angry",
        "animal",
        "ankle",
        "announce",
        "annual",
        "another",
        "answer",
        "antenna",
        "antique",
        "anxiety",
        "any",
        "apart",
        "apology",
        "appear",
        "apple",
        "approve",
        "april",
        "arch",
        "arctic",
        "area",
        "arena",
        "argue",
        "arm",
        "armed",
        "armor",
        "army",
        "around",
        "arrange",
        "arrest",
      ];

      // Generate 12 random words from the list
      let seedPhrase = [];
      for (let i = 0; i < 12; i++) {
        const randomIndex = Math.floor(Math.random() * wordList.length);
        seedPhrase.push(wordList[randomIndex]);
      }

      const newSeedPhrase = seedPhrase.join(" ");

      // Create a new wallet object
      const wallet = {
        seedPhrase: newSeedPhrase,
        createdAt: Date.now(),
        autoGenerated: false,
        seedViewed: true,
      };

      // Save to storage
      chrome.storage.local.set({ wallet }, function () {
        // Show the seed phrase
        seedDisplay.textContent = newSeedPhrase;
        seedDisplay.classList.remove("hidden");
        showSeedBtn.textContent = "Hide Seed Phrase";
        showSeedBtn.disabled = false;
        showSeedBtn.removeEventListener("click", showSeedPhrase);
        showSeedBtn.addEventListener("click", hideSeedPhrase);

        showStatus(
          "New wallet generated! Make sure to back up your seed phrase securely.",
          "success"
        );

        // Notify background script about wallet change
        chrome.runtime.sendMessage({
          action: "walletUpdated",
        });
      });
    }
  }

  // Function to restore wallet from seed phrase
  function restoreWallet() {
    const seedPhrase = restoreSeedInput.value.trim();

    if (!seedPhrase) {
      showStatus("Please enter a seed phrase", "error");
      return;
    }

    // Validate seed phrase (basic validation)
    const words = seedPhrase.split(/\s+/);
    if (words.length < 12) {
      showStatus(
        "Invalid seed phrase. It should contain at least 12 words.",
        "error"
      );
      return;
    }

    // Create wallet object
    const wallet = {
      seedPhrase: seedPhrase,
      createdAt: Date.now(),
      autoGenerated: false,
      seedViewed: true,
    };

    // Save to storage
    chrome.storage.local.set({ wallet }, function () {
      showStatus("Wallet restored successfully!", "success");
      restoreSeedInput.value = "";
      showSeedBtn.disabled = false;

      // Notify background script about wallet change
      chrome.runtime.sendMessage({
        action: "walletUpdated",
      });
    });
  }

  // Update stats display
  function updateStats(stats) {
    document.getElementById("found-count").textContent = stats.found;
    document.getElementById("claimed-count").textContent = stats.claimed;
    document.getElementById("total-value").textContent = stats.totalValue;
  }

  // Update token history display
  function updateTokenHistory(tokens) {
    const historyContainer = document.getElementById("token-history");
    historyContainer.innerHTML = "";

    if (tokens.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "empty-history";
      emptyMessage.textContent =
        "No tokens found yet. Browse the web and NutHog will sniff out Cashu tokens for you!";
      historyContainer.appendChild(emptyMessage);
      return;
    }

    tokens.forEach((token) => {
      const tokenElement = document.createElement("div");
      tokenElement.className = "token-item";

      // Add claimed/unclaimed status
      if (token.claimed) {
        tokenElement.classList.add("claimed");
      } else {
        tokenElement.classList.add("unclaimed");
      }

      // Create token content
      const tokenContent = document.createElement("div");
      tokenContent.className = "token-content";

      // Format date
      const date = new Date(token.timestamp);
      const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;

      // Create HTML based on token type
      let tokenHtml = "";

      if (token.type === "emoji") {
        // Emoji token
        tokenHtml = `
          <div class="token-header">
            <span class="token-emoji">${token.emoji}</span>
            <span class="token-value">${token.value} sats</span>
          </div>
          <div class="token-details">
            <div class="token-date">${formattedDate}</div>
            <div class="token-url" title="${token.url}">${formatUrl(
          token.url
        )}</div>
          </div>
        `;
      } else {
        // Plain Cashu token
        tokenHtml = `
          <div class="token-header">
            <span class="token-type">Cashu Token</span>
            <span class="token-value">${token.value} sats</span>
          </div>
          <div class="token-details">
            <div class="token-date">${formattedDate}</div>
            <div class="token-url" title="${token.url}">${formatUrl(
          token.url
        )}</div>
          </div>
        `;
      }

      tokenContent.innerHTML = tokenHtml;
      tokenElement.appendChild(tokenContent);

      // Add status indicator
      const statusIndicator = document.createElement("div");
      statusIndicator.className = "token-status";
      statusIndicator.innerHTML = token.claimed
        ? '<span class="status-icon claimed">✓</span>'
        : '<span class="status-icon unclaimed">⚠</span>';
      tokenElement.appendChild(statusIndicator);

      historyContainer.appendChild(tokenElement);
    });
  }

  // Format URL for display (truncate if too long)
  function formatUrl(url) {
    try {
      const urlObj = new URL(url);
      let displayUrl = urlObj.hostname;
      if (displayUrl.length > 25) {
        displayUrl = displayUrl.substring(0, 22) + "...";
      }
      return displayUrl;
    } catch (e) {
      // If URL parsing fails, just truncate the string
      return url.length > 25 ? url.substring(0, 22) + "..." : url;
    }
  }

  // Clear token history
  function clearHistory() {
    // Show confirmation dialog
    if (
      confirm(
        "Are you sure you want to clear your token history? This action cannot be undone."
      )
    ) {
      chrome.storage.local.get(["tokens"], function (data) {
        // If there are no tokens, no need to do anything
        if (!data.tokens || data.tokens.length === 0) {
          return;
        }

        // Clear the tokens array
        chrome.storage.local.set({ tokens: [] }, function () {
          // Update the UI
          updateTokenHistory([]);

          // Show a message
          const historyContainer = document.getElementById("token-history");
          const message = document.createElement("div");
          message.className = "empty-history";
          message.textContent = "History cleared successfully!";
          historyContainer.appendChild(message);

          // Remove the message after 2 seconds
          setTimeout(function () {
            updateTokenHistory([]);
          }, 2000);
        });
      });
    }
  }

  // Function to show status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = "status " + type;
    statusMessage.classList.remove("hidden");

    // Hide the message after 5 seconds
    setTimeout(function () {
      statusMessage.classList.add("hidden");
    }, 5000);
  }

  // Function to update the spent tokens display
  function updateSpentTokens() {
    const spentTokensContainer = document.getElementById("spent-tokens");
    spentTokensContainer.innerHTML = "";

    chrome.storage.local.get(["spentTokens"], function (data) {
      const spentTokens = data.spentTokens || [];

      if (spentTokens.length === 0) {
        const emptyMessage = document.createElement("div");
        emptyMessage.className = "no-spent-tokens";
        emptyMessage.textContent =
          "No spent tokens yet. Send your stored proofs to create tokens.";
        spentTokensContainer.appendChild(emptyMessage);
        return;
      }

      // Sort spent tokens by timestamp (newest first)
      const sortedTokens = [...spentTokens].sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Create elements for each spent token
      sortedTokens.forEach((tokenData) => {
        const tokenElement = document.createElement("div");
        tokenElement.className = "spent-token-item";

        // Format the date
        const date = new Date(tokenData.timestamp);
        const formattedDate = date.toLocaleString();

        // Format the mint URL
        const displayUrl = formatUrl(tokenData.mint);

        // Create the token content
        tokenElement.innerHTML = `
          <div class="spent-token-header">
            <span>Spent Token</span>
            <span class="spent-token-amount">${tokenData.amount} sats</span>
          </div>
          <div class="spent-token-date">${formattedDate}</div>
          <div class="spent-token-mint" title="${
            tokenData.mint
          }">${displayUrl}</div>
          <div class="spent-token-text">${tokenData.token.substring(
            0,
            30
          )}...</div>
          <button class="copy-spent-btn" data-token="${tokenData.token}">
            <span class="copy-icon">📋</span> Copy Token
          </button>
        `;

        // Add event listener to the Copy button
        const copyBtn = tokenElement.querySelector(".copy-spent-btn");
        copyBtn.addEventListener("click", function () {
          const token = this.getAttribute("data-token");
          navigator.clipboard.writeText(token).then(
            function () {
              copyBtn.textContent = "Copied!";
              setTimeout(function () {
                copyBtn.innerHTML =
                  '<span class="copy-icon">📋</span> Copy Token';
              }, 2000);
            },
            function (err) {
              console.error("Could not copy text: ", err);
            }
          );
        });

        spentTokensContainer.appendChild(tokenElement);
      });
    });
  }

  // Function to send all proofs from a mint
  function sendAllProofs(mintUrl, proofs, totalValue) {
    console.log("Sending all proofs from mint:", mintUrl);
    console.log("Number of proofs:", proofs.length);
    console.log("Total value:", totalValue);

    // Show loading spinner
    showSpinner("Creating token...");

    // Send message to background script to serialize the proofs
    chrome.runtime.sendMessage(
      {
        action: "serializeProofs",
        mintUrl: mintUrl,
        proofs: proofs,
      },
      function (response) {
        console.log("Received serializeProofs response:", response);

        if (response && response.success) {
          // Refresh the UI to reflect the changes
          refreshUIAfterSend();

          // Show the token in a modal with QR code
          showTokenModal(response.token, totalValue, mintUrl);
        } else {
          hideSpinner();
          showStatus(
            "Error creating token: " + (response?.error || "Unknown error"),
            "error"
          );
        }
      }
    );
  }

  // Function to refresh the UI after sending proofs
  function refreshUIAfterSend() {
    console.log("Refreshing UI after sending proofs");

    // Get the latest data from storage
    chrome.storage.local.get(
      ["mintProofs", "tokenHistory", "spentTokens"],
      function (data) {
        console.log("Retrieved updated data from storage");
        console.log("Updated mint proofs:", data.mintProofs);
        console.log(
          "Spent tokens count:",
          data.spentTokens ? data.spentTokens.length : 0
        );

        // Update the mint proofs display
        updateMintProofs(data.mintProofs || {});

        // Calculate total value and update stats
        const totalValue = calculateTotalValue(data.mintProofs || {});
        const claimedCount = Object.values(data.mintProofs || {}).flat().length;

        updateStats({
          found: data.tokenHistory ? data.tokenHistory.length : 0,
          claimed: claimedCount,
          totalValue: totalValue,
        });

        // If we're in the spent tokens view, update that too
        if (
          !document.getElementById("spent-tokens").classList.contains("hidden")
        ) {
          updateSpentTokens();
        }
      }
    );
  }

  // Helper function to calculate total value of all proofs
  function calculateTotalValue(mintProofs) {
    let total = 0;
    Object.values(mintProofs).forEach((proofs) => {
      proofs.forEach((proof) => {
        if (proof && typeof proof.amount === "number") {
          total += proof.amount;
        }
      });
    });
    return total;
  }

  // Function to show the token modal with QR code
  function showTokenModal(token, amount, mintUrl) {
    console.log(
      "Showing token modal with token:",
      token ? token.substring(0, 20) + "..." : "undefined"
    );
    console.log("Amount:", amount);
    console.log("Mint URL:", mintUrl);

    const modal = document.getElementById("token-modal");
    const qrCodeContainer = document.getElementById("qr-code");
    const tokenText = document.getElementById("token-text");
    const tokenAmount = document.getElementById("token-amount");
    const copyBtn = document.getElementById("copy-token-btn");
    const closeBtn = document.querySelector(".modal-close");

    // Set the token text and amount
    if (!token) {
      console.error("Token is undefined or empty");
      tokenText.textContent = "Error: No token generated";
      hideSpinner();
      return;
    }

    // Set token text and amount immediately
    tokenText.textContent = token;
    tokenAmount.textContent = amount;

    // Generate QR code
    console.log("Sending generateQRCode message to background");
    chrome.runtime.sendMessage(
      {
        action: "generateQRCode",
        data: token,
      },
      function (response) {
        console.log("Received generateQRCode response:", response);

        // Hide spinner once QR code is generated
        hideSpinner();

        if (response && response.success) {
          if (response.svgString) {
            // Use SVG string directly
            console.log("Using SVG string for QR code");
            qrCodeContainer.innerHTML = response.svgString;
          } else if (response.dataUrl) {
            // Create an image element with the data URL
            console.log("Using data URL for QR code");
            qrCodeContainer.innerHTML = `<img src="${response.dataUrl}" alt="QR Code">`;
          } else {
            console.error("No SVG string or data URL in response");
            qrCodeContainer.innerHTML = "Error generating QR code";
          }
        } else {
          console.error(
            "QR code generation failed:",
            response?.error || "Unknown error"
          );
          qrCodeContainer.innerHTML = "Error generating QR code";
        }

        // Show the modal
        console.log("Displaying modal");
        modal.style.display = "block";

        // Copy button functionality
        copyBtn.addEventListener("click", function () {
          navigator.clipboard.writeText(token).then(
            function () {
              copyBtn.textContent = "Copied!";
              setTimeout(function () {
                copyBtn.innerHTML =
                  '<span class="copy-icon">📋</span> Copy Token';
              }, 2000);
            },
            function (err) {
              console.error("Could not copy text: ", err);
            }
          );
        });

        // Close button functionality
        closeBtn.addEventListener("click", function () {
          modal.style.display = "none";
        });

        // Close when clicking outside the modal
        window.addEventListener("click", function (event) {
          if (event.target == modal) {
            modal.style.display = "none";
          }
        });
      }
    );

    // Add a safety timeout to hide the spinner if the QR code generation takes too long
    setTimeout(function () {
      hideSpinner();
    }, 10000); // 10 seconds timeout
  }

  // Function to show the spinner with custom text
  function showSpinner(text = "Processing...") {
    const spinner = document.getElementById("spinner-overlay");
    const spinnerText = document.getElementById("spinner-text");

    spinnerText.textContent = text;
    spinner.style.display = "flex";
  }

  // Function to hide the spinner
  function hideSpinner() {
    const spinner = document.getElementById("spinner-overlay");
    spinner.style.display = "none";
  }

  // Add a function to update the mint proofs display
  function updateMintProofs(mintProofs) {
    const mintProofsContainer = document.getElementById("mint-proofs");
    mintProofsContainer.innerHTML = "";

    if (!mintProofs || Object.keys(mintProofs).length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "no-proofs";
      emptyMessage.textContent =
        "No proofs stored yet. Find and claim Cashu tokens to store proofs.";
      mintProofsContainer.appendChild(emptyMessage);
      return;
    }

    // Sort mints by total value (descending)
    const mintEntries = Object.entries(mintProofs)
      .map(([mintUrl, proofs]) => {
        // Calculate total value for this mint
        let totalValue = 0;
        proofs.forEach((proof) => {
          if (proof && typeof proof.amount === "number") {
            totalValue += proof.amount;
          }
        });

        return {
          mintUrl,
          proofs,
          totalValue,
          count: proofs.length,
        };
      })
      .sort((a, b) => b.totalValue - a.totalValue);

    // Create elements for each mint
    mintEntries.forEach((mintEntry) => {
      const mintElement = document.createElement("div");
      mintElement.className = "mint-item";

      // Format the mint URL for display
      const displayUrl = formatUrl(mintEntry.mintUrl);

      // Create the mint content
      mintElement.innerHTML = `
        <div class="mint-header">
          <span>Mint</span>
          <span class="mint-value">${mintEntry.totalValue} sats</span>
        </div>
        <div class="mint-url" title="${mintEntry.mintUrl}">${mintEntry.mintUrl}</div>
        <button class="send-all-btn" data-mint-url="${mintEntry.mintUrl}">Send All Balance</button>
      `;

      // Add event listener to the Send All button
      const sendAllBtn = mintElement.querySelector(".send-all-btn");
      sendAllBtn.addEventListener("click", () => {
        sendAllProofs(
          mintEntry.mintUrl,
          mintEntry.proofs,
          mintEntry.totalValue
        );
      });

      mintProofsContainer.appendChild(mintElement);
    });
  }
});
