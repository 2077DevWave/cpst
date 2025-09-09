# Project Overview

This project is a Visual Studio Code extension called **C++ Stress Tester (CPST)**. It is designed to streamline the workflow for competitive programmers who use C++ to solve problems. The extension allows users to quickly generate a stress testing environment for their C++ solutions, including a test case generator, a validator, and a checker. It also provides a simple interface to compile and run the stress tests and view the results.

The extension is written in **TypeScript** and uses the VS Code Extension API. The user interface is a webview panel in the sidebar, which is built with HTML, CSS, and JavaScript.

## Key Technologies

*   **TypeScript:** The primary language for the extension's source code.
*   **Node.js:** The runtime environment for the extension.
*   **VS Code Extension API:** The API used to interact with the VS Code editor and UI.
*   **HTML/CSS/JavaScript:** Used for the webview-based user interface.
*   **g++:** The C++ compiler used to compile the user's solution and test files.

## Architecture

The extension is composed of several key components:

*   **`extension.ts`:** The main entry point of the extension. It registers the webview provider and other components.
*   **`MyPanelProvider.ts`:** A `WebviewViewProvider` that manages the webview panel in the sidebar. It handles the UI and communication between the webview and the extension's core logic.
*   **`StressTestEngine.ts`:** The core of the extension's logic. It orchestrates the entire stress testing process, including file management, compilation, execution, and result reporting.
*   **`webview.html`:** The HTML file that defines the structure of the webview panel.
*   **`assets` directory:** Contains the C++ templates for the generator/validator and checker.

# Building and Running

## Prerequisites

*   [Node.js and npm](https://nodejs.org/)
*   [Visual Studio Code](https://code.visualstudio.com/)
*   A C++ compiler (e.g., `g++`) in the system's PATH.

## Building the Extension

To build the extension, run the following command:

```bash
npm run build
```

This will compile the TypeScript code to the `out` directory and copy the necessary assets.

## Running the Extension in the VS Code Development Host

To run the extension in a new VS Code window for development and testing, press `F5` in VS Code, or run the following command:

```bash
npm run test
```

# Development Conventions

## Coding Style

The project uses [ESLint](https://eslint.org/) to enforce a consistent coding style. The ESLint configuration can be found in the `eslint.config.mjs` file. To check for linting errors, run:

```bash
npm run lint
```

## Testing

The project uses [Mocha](https://mochajs.org/) as the test framework. The tests are located in the `src/test` directory. To run the tests, use the following command:

```bash
npm run test
```

This will compile the code, run the linter, and then run the tests using the VS Code Test CLI.
