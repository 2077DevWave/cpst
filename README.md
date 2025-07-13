# C++ Stress Tester

Tired of manually setting up test files and compilation commands for your C++ competitive programming solutions? **C++ Stress Tester** streamlines your entire workflow, letting you focus on what matters: solving the problem.

With a single click, generate a powerful, feature-rich stress testing file. With another click, compile and run it against your solution, all within the VS Code integrated terminal.

## Features

*   **One-Click Test File Generation**: Instantly create a `.test.cpp` file from a robust template when viewing a `.cpp` solution file.
*   **Integrated Compile & Run**: Execute your stress test directly from the side panel. The extension handles the compilation and run commands for you.
*   **Context-Aware Panel**: The panel intelligently shows the "Generate" button if a test file doesn't exist, and the "Run" button if it does. It stays in sync with your active editor.
*   **Powerful C++ Template**: The generated file isn't just a basic runner. It includes a structured template with separate sections for:
    *   **Test Case Generator**: Create randomized inputs.
    *   **Validator**: Ensure your generated test cases adhere to problem constraints.
    *   **Checker**: Verify the correctness of your solution's output, perfect for problems with multiple valid answers.
    *   **Resource Monitoring**: Automatically measures and reports execution time and memory usage.

### Workflow Demo

![C++ Stress Tester Workflow](images/workflow.gif)

> **Tip:** The workflow is seamless. Open your solution, generate the test file, fill in the `generator`/`checker` logic, and run it—all without leaving your editor.

---

## The Generated Test File

The core of this extension is the powerful `tester.cpp` template it generates. It's designed for serious testing and is broken down into clear sections where you add your logic.

#### `generator()`
Here you define the logic to create a valid, random test case based on the problem's constraints.
```cpp
// in tester.cpp
string generator(unsigned seed) {
    mt19937 rng(seed);
    stringstream cout;

    // TODO: Write your test case generation logic here.
    // Example:
    int n = uniform_int_distribution<int>(1, 100)(rng);
    cout << n << endl;
    for (int i = 0; i < n; ++i) {
        cout << uniform_int_distribution<int>(1, 1e9)(rng) << " ";
    }
    cout << endl;

    return cout.str();
}
```

#### `validator()`
This function ensures that the test cases produced by your `generator` are always valid according to the problem statement, preventing you from testing with malformed input.
```cpp
// in tester.cpp
bool validator(const string& test_case) {
    stringstream cin(test_case);

    // TODO: Read the data and check if it meets constraints.
    // Example:
    int n;
    if (!(cin >> n)) return false;
    if (n < 1 || n > 100) return false;
    
    // This final check ensures there is no extra data. Do not remove.
    if (cin.rdbuf()->in_avail() != 0) return false;
    return true;
}
```

#### `checker()`
For problems where the output isn't a single, fixed value, the checker is essential. It determines if your solution's output is a correct answer for the given input.
```cpp
// in tester.cpp
bool checker(const string& input, const string& user_output_str) {
    stringstream test_case(input);
    stringstream user_answer(user_output_str);

    // TODO: Implement logic to verify the user's answer.
    // This is where you would implement a brute-force or model solution
    // to compare against the user's output.

    return false; // Return true if the answer is correct.
}
```

---

## Requirements

You must have a C++ compiler installed and available in your system's `PATH`. The extension uses `g++` by default.

*   **On Linux (Debian/Ubuntu):**
    ```bash
    sudo apt-get update
    sudo apt-get install build-essential
    ```
*   **On macOS:** Install Xcode Command Line Tools.
    ```bash
    xcode-select --install
    ```
*   **On Windows:** We recommend using [WSL (Windows Subsystem for Linux)](https://docs.microsoft.com/en-us/windows/wsl/install) and installing `build-essential` as shown above. Alternatively, you can use [MinGW-w64](https://www.mingw-w64.org/).

## Extension Settings

This extension does not add any VS Code settings at this time. It is designed to work out-of-the-box.

## Known Issues

*   The compile and run commands are currently hardcoded to use `g++`. Support for other compilers like `clang++` or MSVC is not yet available.
*   The template's resource monitoring (`memory_MB`) is most accurate on Linux. It provides a fallback for macOS and may show 0 on other systems.

Please report any other issues on the [GitHub repository](https://github.com/YourGitHub/YourRepo). *(<- Replace with your repo link)*

## Release Notes

### 0.0.1

*   Initial release of **C++ Stress Tester**.
*   Feature: Generate `.test.cpp` files from a template.
*   Feature: Compile and run test files from the side panel.
*   Feature: Context-aware UI that updates based on the active file.

---

**Enjoy a faster, more reliable C++ testing workflow!**