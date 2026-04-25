# Slack Theme Generator

Upload any brand logo and instantly get a custom Slack sidebar theme that matches it — no design tools required.

## What it does

1. **Upload a logo** — drag and drop or browse for any PNG, JPG, or SVG
2. **Get a color palette** — the app extracts the 4 most dominant colors from your image
3. **Copy your theme string** — paste it directly into Slack to apply the theme

## How to apply the theme in Slack

1. Open Slack and go to **Preferences → Sidebar**
2. Scroll down to **Custom theme**
3. Paste the generated theme string and hit Enter

Your Slack sidebar will instantly match the brand from your logo.

## Running locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- npm (comes with Node.js)

### Steps

```bash
# Clone the repo
git clone https://github.com/scastaneda-eng/Sergio-Slack-Template-Generator.git

# Navigate into the project folder
cd Sergio-Slack-Template-Generator

# Install dependencies
npm install

# Start the app
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000).

## Built with

- [React](https://reactjs.org/)
- [colorthief](https://lokeshdhakar.com/projects/color-thief/) — for color extraction
