# Project: C++ Stress Tester (CPST)

## Project Overview

This project is a Visual Studio Code extension named "C++ Stress Tester (CPST)". It's designed to streamline the workflow for C++ competitive programming by providing tools to generate, compile, and run stress tests for C++ solutions. The extension is built with TypeScript and Node.js.

The core functionality of the extension is to:
-   Generate a `.test.cpp` file from a template when viewing a `.cpp` solution file.
-   Compile and run the stress test directly from the side panel.
-   Provide a context-aware panel that shows the "Generate" button if a test file doesn't exist, and the "Run" button if it does.
-   The generated test file includes a structured template with separate sections for a test case generator, a validator, and a checker.
-   The extension also provides resource monitoring for execution time and memory usage.

## Building and Running

To build and run this project, you'll need to have Node.js and npm installed.

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Compile the TypeScript code:**
    ```bash
    npm run compile
    ```

3.  **Run the tests:**
    ```bash
    npm run test
    ```

4.  **Lint the code:**
    ```bash
    npm run lint
    ```

5.  **Run the extension in a new VS Code window:**
    -   Open the project in VS Code.
    -   Press `F5` to open a new window with the extension loaded.

## Architecture of `src/core`

The `src/core` directory is the heart of the extension, containing all the core logic. It follows a clean, layered architecture designed for testability and maintainability, heavily influenced by SOLID principles.

### Architectural Layers

1.  **`Interfaces/`**: This is the abstraction layer.
    *   **Purpose**: Defines the "contracts" for all major components in the system using TypeScript interfaces. This is the key to enforcing the Dependency Inversion Principle (DIP), allowing high-level services to depend on abstractions, not concrete implementations.
    *   **How to use**: Before creating a new service or manager, define its public methods in an interface here. For example, `IFileManager` defines what a file manager *can do* without specifying *how* it does it.

2.  **`Managers/`**: This is the data and resource management layer.
    *   **Purpose**: Managers are concrete classes responsible for low-level tasks and direct interaction with resources like the file system. They implement the interfaces defined in `Interfaces/`. For example, `FileManager` handles reading and writing files, while `CPSTFolderManager` manages the structure of the `.cpst` directory.
    *   **How to create a new Manager**: If you need to manage a new resource (e.g., a database, a specific file format), create a manager for it. It should implement a corresponding interface and focus solely on the mechanics of that resource.

3.  **`Services/`**: This is the application's business logic layer.
    *   **Purpose**: Services orchestrate the application's features. They are the "brains" of the operation, coordinating actions between different managers and other services to fulfill a user request. For example, `CompilationService` uses a `Compiler` and `CPSTFolderManager` to compile the necessary files. The `OrchestrationService` is the highest-level service that coordinates the entire stress-testing workflow.
    *   **How to create a new Service**: When adding a new high-level feature, create a service for it. This service will depend on the *interfaces* of the managers or other services it needs, which are provided via constructor injection. It should contain the core logic for the feature.

4.  **`CompileAndRun/`**: This folder contains concrete implementations related to the compilation and execution process. These classes are used by the higher-level services to perform their tasks.

### How to Add a New Feature

1.  **Define the Contract**: Start in the `Interfaces/` directory. Create a new interface for your feature's service (e.g., `INewFeatureService`).
2.  **Implement the Logic**: Create a new class in the `Services/` directory that implements your new interface (e.g., `NewFeatureService`).
3.  **Inject Dependencies**: If your new service needs to access the file system or other resources, make it depend on the *interfaces* of the required managers or services (e.g., `IFileManager`). These will be passed into its constructor.
4.  **Integrate**: In `extension.ts`, instantiate your new service and inject it into the services that will use it, such as `UIService` or `OrchestrationService`.

This architecture ensures that components are decoupled, making the system easy to test, maintain, and extend.

---

## AI Code Generation Guidelines

Act as a senior software engineer and architect. When you generate code, you must adhere strictly to the following principles to ensure the final output is clean, maintainable, scalable, and highly testable.

### 1. SOLID Principles:

*   **Single Responsibility (SRP):** Every class and method must have only one reason to change. For example, a `Tokenizer` class should only handle tokenization, while a separate `Normalizer` class should handle normalization. Do not combine unrelated responsibilities.
*   **Open/Closed (OCP):** Your code must be open for extension but closed for modification. Use abstractions and patterns that allow adding new functionality without changing existing, tested code.
*   **Dependency Inversion (DIP):** Do not depend on concrete implementations. Instead, depend on abstractions (interfaces or abstract classes). For example, a `SearchEngine` class must depend on an `ISearcher` interface, not a concrete `Searcher` class.

### 2. Dependency and State Management:

*   **Dependency Injection (DI):** Strictly use constructor injection to provide dependencies. Never instantiate dependencies inside a class (e.g., `new MyService()`).
*   **Stateless Services:** All service classes must be stateless. Do not store request-specific or session-specific data in class fields. Any data required for an operation must be passed in as method parameters, often within a Data Transfer Object (DTO).

### 3. Testing:

*   **Design for Testability:** All code must be designed to be easily unit-tested. This means avoiding static classes and methods where possible and preferring dependency injection.
*   **Write Unit Tests:** For any TypeScript code you write, also provide corresponding unit tests.
*   **Use Modern Testing Libraries:** Utilize Jest for unit testing, including its built-in mocking and assertion capabilities. For VS Code API interactions and integration tests, consider `vscode-test` which often uses Mocha and Chai.
*   **Follow the AAA Pattern:** Structure every test method using the Arrange, Act, Assert pattern.
*   **Standard Naming:** Clearly identify the object under test within your test methods (e.g., `const service = new MyService(...)`).

### 4. General Best Practices:

*   **Code Style:** Prefer `const` for variable declarations by default. Use `let` only when a variable needs to be reassigned. Avoid `var` to prevent issues with variable hoisting and to ensure block-scoped variables.
*   **Comments:** Write self-documenting code. Avoid comments that explain what the code is doing. Only add comments to explain *why* a complex or non-obvious decision was made.
*   **Source Control:** At the end of your response, include a list of file patterns (like `CoverageReport`) that should be added to a `.gitignore` file.

Apply these rules to all future code generation requests.
