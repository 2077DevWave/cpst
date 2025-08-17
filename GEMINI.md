# Project Overview: C++ Stress Tester (CPST)

This project is a Visual Studio Code extension designed to enhance the competitive programming workflow for C++ users. It automates the process of generating stress test files, compiling C++ solutions, and executing them against custom test cases. The extension provides a user-friendly interface within a VS Code side panel to manage and view test results, including execution time and memory usage.

## Key Features:
- **One-Click Test File Generation:** Automatically creates C++ stress test files (`.genval.cpp` and `.check.cpp`) from robust templates.
- **Integrated Compile & Run:** Compiles user solutions and generated test files, then runs the stress tests directly within the VS Code integrated terminal.
- **Context-Aware UI:** The side panel dynamically updates based on the active C++ file, showing relevant actions (generate or run tests).
- **Comprehensive C++ Templates:** The generated test files include structured sections for test case generation (`generator()`), input validation (`validator()`), and output checking (`checker()`), along with resource monitoring.

## Technologies Used:
- **TypeScript:** For the core VS Code extension logic.
- **C++:** For user solutions and the generated stress testing templates.
- **HTML/CSS/JavaScript:** For the interactive webview UI within the VS Code side panel.
- **Node.js:** As the runtime environment for the TypeScript extension.
- **ESLint:** For code linting and style enforcement.
- **@google/generative-ai:** Included as a dependency, suggesting potential or planned integration of AI capabilities.

## Project Architecture:
The extension's main entry point is `src/extension.ts`, which activates and initializes key components. The user interface is provided by `MyPanelProvider` which manages a webview (`webview.html`) displayed in a VS Code side panel. This provider interacts with a `StressTestEngine` that orchestrates the testing process. The `StressTestEngine` utilizes `Compiler`, `Executor`, and `FileManager` components to handle compilation, execution, and file operations. Generated test files and temporary assets are stored in a `.cpst` directory within the user's workspace.

## Building and Running:

### Development Commands:
- **Compile TypeScript:**
  ```bash
  npm run compile
  # or
  tsc -p ./
  ```
- **Watch for changes and recompile automatically:**
  ```bash
  npm run watch
  # or
  tsc -watch -p ./
  ```
- **Run Linter:**
  ```bash
  npm run lint
  # or
  eslint src
  ```
- **Run Tests:**
  ```bash
  npm run test
  # or
  vscode-test
  ```
- **Run Extension (Development Host):**
  To run the extension in a development environment, open this project in VS Code and press `F5`. This will open a new VS Code window with the extension loaded.

### Pre-publish Script:
- **Prepare for publishing (compiles TypeScript):**
  ```bash
  npm run vscode:prepublish
  ```

## Development Conventions:

### Language and Tooling:
- **Primary Language:** TypeScript
- **Linting:** ESLint is configured using `eslint.config.mjs` with `@typescript-eslint` plugin.
- **Type Checking:** Strict type checking is enabled in `tsconfig.json`.

### Coding Style:
- ESLint rules enforce `curly` braces, `eqeqeq` (strict equality), `no-throw-literal`, and `semi`colons.
- Import statements follow `camelCase` or `PascalCase` naming conventions.

### Testing:
- Unit and integration tests for the extension are written in TypeScript and executed using `vscode-test`.
- Test files are typically located in the `src/test/` directory (e.g., `src/test/extension.test.ts`).

### File Structure:
- `src/`: Contains the main TypeScript source code for the extension.
- `src/core/`: Houses core functionalities like `Compiler`, `Executor`, `FileManager`, and `StressTestEngine`.
- `assets/`: Stores C++ template files (`checker_template.cpp`, `generator_validator_template.cpp`) used for generating stress test boilerplate.
- `media/`: Contains icons and other media assets for the extension.
- `.cpst/`: (Created at runtime) A hidden directory within the workspace used by the extension to store generated test files and temporary assets.
