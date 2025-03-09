// Toast notification system for NutHog
// This script is injected into web pages to show in-browser notifications

// Audio player for notification sounds
let audioPlayer = null;
let audioInitialized = false;

// Initialize audio player
function initAudioPlayer() {
  if (audioInitialized) return;

  try {
    const audioUrl = chrome.runtime.getURL("sniffing.mp3");

    audioPlayer = new Audio(audioUrl);
    audioPlayer.volume = 0.5; // Set volume to 50%

    // Preload the audio
    audioPlayer.load();

    // Add event listeners for debugging
    audioPlayer.addEventListener("canplaythrough", () => {
      audioInitialized = true;
    });

    audioPlayer.addEventListener("error", (e) => {
      console.error("Audio error:", e);
      console.error(
        "Audio error code:",
        audioPlayer.error ? audioPlayer.error.code : "unknown"
      );
    });

    // Force a load attempt
    const playPromise = audioPlayer.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Immediately pause after successful play to prepare for actual use
          audioPlayer.pause();
          audioPlayer.currentTime = 0;
          audioInitialized = true;
        })
        .catch((error) => {
          audioInitialized = true;
        });
    }
  } catch (error) {
    console.error("Error initializing audio player:", error);
  }
}

// Play notification sound
function playNotificationSound() {
  try {
    if (!audioInitialized || !audioPlayer) {
      initAudioPlayer();

      // If we just initialized, wait a bit before playing
      setTimeout(() => {
        attemptPlaySound();
      }, 100);
      return;
    }

    attemptPlaySound();
  } catch (error) {
    console.error("Error playing notification sound:", error);
  }
}

// Helper function to attempt playing the sound
function attemptPlaySound() {
  if (!audioPlayer) return;

  // Reset audio to beginning if it's already playing
  audioPlayer.pause();
  audioPlayer.currentTime = 0;

  // Play the sound with user interaction context
  const playPromise = audioPlayer.play();

  // Handle play() promise to avoid uncaught promise errors
  if (playPromise !== undefined) {
    playPromise.catch((error) => {
      console.warn("Audio play failed:", error);

      // If play fails due to no user interaction, we'll try again on next user interaction
      document.addEventListener(
        "click",
        function playOnInteraction() {
          audioPlayer
            .play()
            .catch((e) => console.warn("Still failed to play audio:", e));
          document.removeEventListener("click", playOnInteraction);
        },
        { once: true }
      );
    });
  }
}

// Create and initialize the toast container
function initToastContainer() {
  // Check if container already exists
  if (document.getElementById("nuthog-toast-container")) {
    return;
  }

  // Create container
  const container = document.createElement("div");
  container.id = "nuthog-toast-container";
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2147483647; /* Maximum z-index */
    width: 300px;
    font-family: Arial, sans-serif;
    pointer-events: none; /* Allow clicking through the container */
  `;
  document.body.appendChild(container);

  // Add styles
  const style = document.createElement("style");
  style.textContent = `
    .nuthog-toast {
      margin-bottom: 10px;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: nuthog-toast-in 0.5s ease-out;
      overflow: hidden;
      position: relative;
      pointer-events: auto; /* Make toast clickable */
      cursor: pointer;
      transition: transform 0.2s ease;
    }
    .nuthog-toast:hover {
      transform: translateX(-5px);
    }
    .nuthog-toast-icon {
      float: left;
      margin-right: 10px;
      font-size: 24px;
    }
    .nuthog-toast-content {
      overflow: hidden;
    }
    .nuthog-toast-title {
      font-weight: bold;
      margin-bottom: 5px;
      padding-right: 20px;
    }
    .nuthog-toast-message {
      font-size: 14px;
      line-height: 1.4;
    }
    .nuthog-toast-close {
      position: absolute;
      top: 10px;
      right: 10px;
      cursor: pointer;
      font-size: 16px;
      opacity: 0.7;
      width: 20px;
      height: 20px;
      text-align: center;
      line-height: 20px;
    }
    .nuthog-toast-close:hover {
      opacity: 1;
    }
    .nuthog-toast-success {
      background-color: #d4edda;
      border-left: 5px solid #28a745;
      color: #155724;
    }
    .nuthog-toast-info {
      background-color: #d1ecf1;
      border-left: 5px solid #17a2b8;
      color: #0c5460;
    }
    .nuthog-toast-warning {
      background-color: #fff3cd;
      border-left: 5px solid #ffc107;
      color: #856404;
    }
    .nuthog-toast-error {
      background-color: #f8d7da;
      border-left: 5px solid #dc3545;
      color: #721c24;
    }
    @keyframes nuthog-toast-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes nuthog-toast-out {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Initialize audio player
  initAudioPlayer();
}

// Create a toast notification
function createToast(
  title,
  message,
  type = "info",
  duration = 5000,
  playSound = true
) {
  // Initialize container if needed
  initToastContainer();

  // Get container
  const container = document.getElementById("nuthog-toast-container");

  // Create toast element
  const toast = document.createElement("div");
  toast.className = `nuthog-toast nuthog-toast-${type}`;

  // Set icon based on type
  let icon = "🐷"; // Default
  if (type === "success") icon = "🐷"; // NutHog icon for success
  if (type === "warning") icon = "⚠️";
  if (type === "error") icon = "❌";

  // Create toast content
  toast.innerHTML = `
    <div class="nuthog-toast-icon">${icon}</div>
    <div class="nuthog-toast-content">
      <div class="nuthog-toast-title">${title}</div>
      <div class="nuthog-toast-message">${message}</div>
    </div>
    <div class="nuthog-toast-close">×</div>
  `;

  // Add to container
  container.appendChild(toast);

  // Play notification sound if enabled
  if (playSound) {
    // Use the click on the toast to trigger audio (to satisfy user interaction requirement)
    toast.addEventListener(
      "click",
      function playOnFirstInteraction() {
        playNotificationSound();
        toast.removeEventListener("click", playOnFirstInteraction);
      },
      { once: true }
    );

    // Also try to play it directly (might work if user has interacted with the page)
    playNotificationSound();
  }

  // Add close button functionality
  const closeBtn = toast.querySelector(".nuthog-toast-close");
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeToast(toast);
  });

  // Add click handler to dismiss
  toast.addEventListener("click", () => {
    removeToast(toast);
  });

  // Auto-remove after duration
  if (duration > 0) {
    setTimeout(() => {
      removeToast(toast);
    }, duration);
  }

  return toast;
}

// Remove a toast with animation
function removeToast(toast) {
  if (!toast || !toast.parentNode) return;

  toast.style.animation = "nuthog-toast-out 0.5s ease-in forwards";
  setTimeout(() => {
    if (toast.parentNode) {
      toast.parentNode.removeChild(toast);
    }
  }, 500);
}

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "showToast") {
    createToast(
      message.title,
      message.message,
      message.type,
      message.duration,
      message.playSound !== false // Default to true if not specified
    );
    return true;
  }
});

// Initialize when the script loads
initToastContainer();

// Add a global click handler to help with audio initialization
document.addEventListener(
  "click",
  function initAudioOnUserInteraction() {
    if (!audioInitialized) {
      initAudioPlayer();
    }
    // Only need this once
    document.removeEventListener("click", initAudioOnUserInteraction);
  },
  { once: true }
);
