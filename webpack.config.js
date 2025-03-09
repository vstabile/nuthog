const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  mode: "production",
  entry: {
    background: "./background.js",
    content: "./content.js",
    popup: "./popup.js",
    settings: "./settings.js",
    toast: "./toast.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "manifest.json" },
        { from: "popup.html", to: "popup.html" },
        { from: "settings.html", to: "settings.html" },
        { from: "icons", to: "icons" },
        { from: "sniffing.mp3", to: "sniffing.mp3" },
      ],
    }),
  ],
};
