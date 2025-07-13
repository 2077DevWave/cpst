// 1. Compile this file: g++ -std=c++17 -o tester tester.cpp
// 2. Run against a solution: ./tester path/to/your/solution.cpp

#include <bits/stdc++.h>
#include <memory>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/resource.h>

using namespace std;

// --- Configuration ---
const int NUM_TESTS = 100;
const string COMPILER = "g++";
const string COMPILER_FLAGS = "-std=c++17 -O2 -Wall";
const string EXTERNAL_EXEC_NAME = "./solution_exec";

struct ExecutionResult {
    string output;
    int time_ms = 0;
    int memory_MB = 0;
    string status = "OK";
};

// ===================================================================================
// SECTION 1: GENERATOR
// ===================================================================================
string generator(unsigned seed) {
    mt19937 rng(seed); // A random number generator seeded for reproducibility.
    uniform_int_distribution<int> dist(1, 1e5);    // for generate random number in an specific range. usage: cout << dist(rng)
    stringstream cout;   // A stringstream to build the output.

    /*
        TODO:
        1.  Based on the problem description, generate a valid, random test case.
        2.  Use the `rng` object to generate random numbers.
            Example: uniform_int_distribution<int> dist(1, 100); int my_rand = dist(rng);
        3.  Write the generated test case into the `cout` stringstream. The format
            must match the problem's expected input format.
            Example: cout << my_rand << " " << another_rand << endl;
    */

    return cout.str();
}

// ===================================================================================
// SECTION 2: VALIDATOR
// ===================================================================================
// Validates if the generated test case conforms to the problem constraints.
bool validator(const string& test_case) {
    stringstream cin(test_case);    // The test case is provided as a stringstream for easy parsing.
    
    /*
        TODO:
        1.  Read the data from the `cin` stringstream.
            Example: int n; if (!(cin >> n)) return false;
        2.  Check if all values adhere to the constraints defined in the problem
            statement (e.g., range, size, order, format).
        3.  If any constraint is violated, return `false`.
        4.  If all constraints are met, return `true`.
    */

    
    if (cin.rdbuf()->in_avail() != 0) return false; // This final check ensures there is no extra data in the input. Do not remove.
    return true;
}

// ===================================================================================
// SECTION 3: CHECKER
// ===================================================================================
// Checks if the user's output is a valid answer for the given input.
bool checker(const string& input, const string& user_output_str) {
    stringstream test_case(input); // The original test case for which the answer was produced.
    stringstream user_answer(user_output_str); // The user's full output as a stringstream.

    /*
        TODO: This function must determine if the user's answer is a correct solution to
        the problem, especially for problems with multiple correct answers.
    */
    
    return false;
}

// ===================================================================================
// SECTION 4: EXTERNAL SOLUTION RUNNER
// ===================================================================================
ExecutionResult run_external_solution(const std::string& input) {
    ExecutionResult result;
    int pipe_stdin[2], pipe_stdout[2];

    if (pipe(pipe_stdin) == -1 || pipe(pipe_stdout) == -1) throw std::runtime_error("pipe() failed");

    auto start_time = std::chrono::high_resolution_clock::now();
    pid_t pid = fork();

    if (pid == -1) throw std::runtime_error("fork() failed");

    if (pid == 0) { // Child process
        close(pipe_stdin[1]); dup2(pipe_stdin[0], STDIN_FILENO); close(pipe_stdin[0]);
        close(pipe_stdout[0]); dup2(pipe_stdout[1], STDOUT_FILENO); close(pipe_stdout[1]);
        execl(EXTERNAL_EXEC_NAME.c_str(), EXTERNAL_EXEC_NAME.c_str(), (char*)NULL);
        perror("execl failed"); exit(1);
    } else { // Parent process
        close(pipe_stdin[0]); close(pipe_stdout[1]);
        write(pipe_stdin[1], input.c_str(), input.length());
        close(pipe_stdin[1]);

        std::stringstream output_ss;
        char buffer[4096];
        ssize_t bytes_read;
        while ((bytes_read = read(pipe_stdout[0], buffer, sizeof(buffer) - 1)) > 0) {
            buffer[bytes_read] = '\0'; output_ss << buffer;
        }
        close(pipe_stdout[0]);
        result.output = output_ss.str();

        int status;
        struct rusage usage;
        wait4(pid, &status, 0, &usage); // wait4 provides resource usage
        auto end_time = std::chrono::high_resolution_clock::now();

        std::chrono::duration<double, std::milli> elapsed = end_time - start_time;
        result.time_ms = (int)elapsed.count();

        // Memory usage from rusage (works on Linux and macOS)
        // ru_maxrss is in KB on Linux and bytes on macOS.
        #ifdef __linux__
            result.memory_MB = usage.ru_maxrss / 1024;
        #elif __APPLE__
            result.memory_MB = (usage.ru_maxrss / 1024) / 1024;
        #else
            // Fallback for other systems
            result.memory_MB = 0; // Or implement another method
        #endif


        if (!WIFEXITED(status) || WEXITSTATUS(status) != 0) {
            result.status = "RUNTIME_ERROR";
        }
    }
    return result;
}

namespace Color {
    const string RESET = "\033[0m";
    const string GREEN = "\033[32m";
    const string RED = "\033[31m";
    const string YELLOW = "\033[33m";
    const string BLUE = "\033[34m";
    const string GRAY = "\033[90m";
}

void print_status(const string& status, const string& color, const string& message) {
    cout << "[" << color << status << Color::RESET << "] " << message << endl;
}

// ===================================================================================
// MAIN ORCHESTRATOR
// ===================================================================================
int main(int argc, char* argv[]) {
    if (argc != 2) {
        print_status("ERROR", Color::RED, "Usage: ./tester <path_to_solution.cpp>");
        return 1;
    }
    string solution_path = argv[1];

    print_status("INFO", Color::BLUE, "Compiling external solution...");
    string compile_cmd = COMPILER + " " + COMPILER_FLAGS + " " + solution_path + " -o " + EXTERNAL_EXEC_NAME;
    if (system(compile_cmd.c_str()) != 0) {
        print_status("ERROR", Color::RED, "Compilation of external solution failed.");
        return 1;
    }
    print_status("OK", Color::GREEN, "External solution compiled successfully.");

    for (int i = 1; i <= NUM_TESTS; ++i) {
        cout << "--- Running Test #" << i << " ---" << endl;

        string input_str = generator(chrono::high_resolution_clock::now().time_since_epoch().count() + i);
        if (!validator(input_str)) {
            print_status("ERROR", Color::RED, "Generator created an invalid test case. Aborting.");
            cout << "Invalid Input: " << input_str << endl;
            break;
        }

        ExecutionResult result;
        try {
            result = run_external_solution(input_str);
        } catch (const runtime_error& e) {
            print_status("ERROR", Color::RED, "Internal testing error: " + string(e.what()));
            break;
        }
        
        string perf_info = Color::GRAY + "(Time: " + to_string(result.time_ms) + " ms, Memory: " + to_string(result.memory_MB) + " MB)" + Color::RESET;

        if (result.status == "RUNTIME_ERROR") {
            print_status("RTE", Color::RED, "Runtime Error in external solution. " + perf_info);
            cout << "Input:\n" << input_str << endl;
            break;
        }

        if (checker(input_str, result.output)) {
            print_status("OK", Color::GREEN, "Test passed! " + perf_info);
        } else {
            print_status("WA", Color::RED, "Wrong Answer! " + perf_info);
            cout << "Input:\n" << input_str << endl;
            cout << "Your Output:\n" << result.output << endl;
            break;
        }
    }

    remove(EXTERNAL_EXEC_NAME.c_str());
    return 0;
}