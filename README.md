# NutHog 🐷💰

A Chrome extension that sniffs out valuable Cashu nuts hidden in emojis across the web.

## Features

- Constantly sniffs through web page content for emojis that might contain hidden Cashu nuts
- Uses its special snout (decoder) to extract the valuable nuts from emoji encodings
- Processes Cashu nuts using the cashu-ts library
- Automatically collects found nuts and swaps them for fresh ones to prevent double-spending
- Oinks with joy (sends notifications) when nuts are found

## Installation

### From Source

1. Clone this repository:

   ```
   git clone https://github.com/vstabile/nuthog.git
   cd nuthog
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Build the extension:

   ```
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" by clicking the toggle in the top right
   - Click "Load unpacked" and select the `dist` directory from this project

### From Chrome Web Store

_(Coming soon)_

## Usage

1. After installing the extension, you'll see the NutHog icon in your Chrome toolbar
2. NutHog automatically sniffs all web pages you visit for emojis containing encoded Cashu nuts
3. When a nut is found, NutHog will oink with joy (show a notification)
4. Click on the NutHog icon to see your hunting statistics and collection of found nuts

## How It Works

NutHog uses a special snout (MutationObserver) to continuously sniff through the DOM for text content. When it finds an emoji, it attempts to decode it using its specialized nut-detection algorithm.

If the decoded content smells like a Cashu nut (token), it's sent to the background script for processing using the cashu-ts library.

## Development

To work on this extension:

1. Make your changes to the source files
2. Run the build process:
   ```
   npm run build
   ```
   Or use watch mode for continuous building during development:
   ```
   npm run watch
   ```
3. Reload the extension in Chrome by going to `chrome://extensions/` and clicking the refresh icon on the extension card

## License

MIT
