# Sloppy Financial

A suite of features for personal tracking for finances. Not meant to be a professional suite of tools, mostly for organizing personal finances. With limited, but expanding AI integration for categorizing transactions.

Built to use a custom defined MySQL server, and minio as document storage.

## Feature set: (WIP/completed)

- Bills: Track your bills, tag them, and attach documents for later.
- Automated bills: Automatically generate bill records based on scheduled days.
- Transactions: List your bank transactions made. Meant to make it easier to analyze.


## Feature Goals:

- Add fully local storage solution with sqlite and folders.
- Full encryption with support for usb keys.
- Encryption of uploaded files to minio or other sources if added.
- Tax form semi-automation with a dynamic per country/state/province tax form system.
- AI agent integration for evaluating things, support for ollama.
- Tax-year file zipping, so you can make it easier to collect all necessary documents for tax accountants all with 1 button (Assuming you already catalogued everything throughout the year)

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
