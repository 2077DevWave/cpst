# CPST Folder Structure

The `.cpst` folder is the central hub for the Competitive Programming Stress Tester extension. It stores all the necessary configurations, temporary files, and detailed results from your stress testing sessions. This document outlines the structure of this folder to help you understand and navigate its contents.

## Root Directory: `.cpst/`

The root of the `.cpst` folder contains subdirectories that organize the extension's data. The most important of these is the `results` directory, where all the stress testing outcomes are stored.

## Results Directory: `.cpst/results/`

This directory is where the magic happens. It logs the results of every stress test you run, organized in a clear and hierarchical manner.

### `main.json`

At the top level of the `results` directory, you'll find `main.json`. This file acts as an index, mapping each solution file you've tested to a list of unique identifiers for each stress test session run against it.

**Example `main.json`:**
```json
{
    "solution.cpp": [
        "2025-08-25T18-11-47-746Z"
    ],
    "another_solution.py": [
        "2025-08-26T10-30-00-000Z"
    ]
}
```
In this example, `solution.cpp` has been tested once, identified by the timestamp `2025-08-25T18-11-47-746Z`.

### Solution-Specific Folders: `results/<solution_file_name>/`

For each solution file you test, a dedicated folder is created within the `results` directory. The name of this folder corresponds to the name of your solution file (e.g., `solution.cpp`).

### Unique Test Session Folders: `results/<solution_file_name>/<session_id>/`

Inside each solution-specific folder, you'll find one or more directories, each named with a unique timestamp-based identifier. This ID corresponds to a single stress testing session. This structure ensures that results from different runs are kept separate and organized chronologically.

**Example Path:**
`.cpst/results/solution.cpp/2025-08-25T18-11-47-746Z/`

### Test Case Files: `results/<solution_file_name>/<session_id>/test_*.json`

Within each session folder, there are multiple JSON files, one for each test case that was run (e.g., `test_1.json`, `test_2.json`, etc.). These files contain detailed information about the outcome of each specific test.

**Format of `test_*.json`:**
```json
{
    "testCase": 1,
    "lastResult": "OK",
    "input": "59",
    "userOutput": "NOn",
    "execTime": 11.418831,
    "memoryUsed": 0,
    "message": ""
}
```

- **`testCase`**: The number of the test case.
- **`lastResult`**: The verdict for this test case (e.g., "OK", "WA", "TLE").
- **`input`**: The input data used for this test.
- **`userOutput`**: The output produced by your solution.
- **`execTime`**: The execution time of your solution in milliseconds.
- **`memoryUsed`**: The memory consumed by your solution in kilobytes.
- **`message`**: Any additional messages or error information.

This structured approach allows for easy access to the results of any test run, making it simple to review past sessions and debug your solutions effectively.
