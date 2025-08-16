// 1. Compile this file: g++ -std=c++17 -o tester tester.cpp
// 2. Run against a solution: ./tester path/to/your/solution.cpp

#include <bits/stdc++.h>
#include <memory>
#include <unistd.h>
#include <sys/wait.h>
#include <sys/resource.h>
#include <sys/stat.h> // For mkdir
#include <filesystem> // For path manipulation (C++17)
#include <fstream> // For file output
#include <iomanip> // For std::put_time, std::setw, std::setfill
#include <locale> // For std::isspace
#include <algorithm> // For std::find_if
#include <vector> // For std::vector

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

// Helper to trim whitespace from a string
string trim_whitespace(const string& s) {
    auto wsfront=find_if_not(s.begin(),s.end(),[](int c){return isspace(c);});
    auto wsback=find_if_not(s.rbegin(),s.rend(),[](int c){return isspace(c);}).base();
    return (wsback<=wsfront ? "" : string(wsfront,wsback));
}

// Helper to unescape JSON strings
string unescape_json_string(const string& s) {
    string unescaped_s;
    for (size_t i = 0; i < s.length(); ++i) {
        if (s[i] == '\\') {
            if (i + 1 < s.length()) {
                switch (s[i+1]) {
                    case '"': unescaped_s += '"'; i++; break;
                    case '\\': unescaped_s += '\\'; i++; break;
                    case 'b': unescaped_s += '\b'; i++; break;
                    case 'f': unescaped_s += '\f'; i++; break;
                    case 'n': unescaped_s += '\n'; i++; break;
                    case 'r': unescaped_s += '\r'; i++; break;
                    case 't': unescaped_s += '\t'; i++; break;
                    case 'u': // Unicode escape sequence \uXXXX
                        if (i + 5 < s.length()) {
                            string hex_code = s.substr(i + 2, 4);
                            unescaped_s += (char)stoul(hex_code, nullptr, 16);
                            i += 5;
                        } else {
                            unescaped_s += s[i]; // Malformed, keep original
                        }
                        break;
                    default: unescaped_s += s[i]; break; // Not a recognized escape, keep original
                }
            }
        } else {
            unescaped_s += s[i];
        }
    }
    return unescaped_s;
}

// Helper to split a string by a delimiter
vector<string> split_string(const string& s, const string& delimiter) {
    vector<string> tokens;
    size_t last_pos = 0;
    size_t pos = s.find(delimiter, 0);
    while (string::npos != pos) {
        tokens.push_back(s.substr(last_pos, pos - last_pos));
        last_pos = pos + delimiter.length();
        pos = s.find(delimiter, last_pos);
    }
    tokens.push_back(s.substr(last_pos, string::npos));
    return tokens;
}

// Helper to escape strings for JSON
string escape_json_string(const string& s) {
    string escaped_s = "";
    for (char c : s) {
        switch (c) {
            case '"': escaped_s += "\""; break;
            case '\\': escaped_s += "\\\\"; break;
            case '\b': escaped_s += "\\b"; break;
            case '\f': escaped_s += "\\f"; break;
            case '\n': escaped_s += "\\n"; break;
            case '\r': escaped_s += "\\r"; break;
            case '\t': escaped_s += "\\t"; break;
            default:
                if (iscntrl(c)) {
                    stringstream ss;
                    ss << "\\u" << hex << setw(4) << setfill('0') << (int)c;
                    escaped_s += ss.str();
                } else {
                    escaped_s += c;
                }
                break;
        }
    }
    escaped_s += "";
    return escaped_s;
}

// Helper to serialize a map of string to vector of strings into a JSON string
string serialize_json_map_of_arrays(const map<string, vector<string>>& data) {
    stringstream ss;
    ss << "{\n";
    bool first_entry = true;
    for (const auto& pair : data) {
        if (!first_entry) ss << ",\n";
        ss << "  \"" << escape_json_string(pair.first) << "\": [";
        bool first_id = true;
        for (const string& id : pair.second) {
            if (!first_id) ss << ", ";
            ss << "\"" << escape_json_string(id) << "\"";
            first_id = false;
        }
        ss << "]";
        first_entry = false;
    }
    ss << "\n}\n";
    return ss.str();
}

// Helper to parse a simple JSON object with string keys and array of string values
map<string, vector<string>> parse_json_map_of_arrays(const string& json_str) {
    map<string, vector<string>> data;
    string trimmed_json = trim_whitespace(json_str);
    if (trimmed_json.empty() || trimmed_json == "{}") return data;

    // Remove outer braces
    if (trimmed_json.front() == '{' && trimmed_json.back() == '}') {
        trimmed_json = trimmed_json.substr(1, trimmed_json.length() - 2);
    } else {
        return data; // Invalid format
    }

    vector<string> pairs = split_string(trimmed_json, ",\n");
    for (const string& pair_str : pairs) {
        size_t colon_pos = pair_str.find(':');
        if (colon_pos == string::npos) continue;

        string key_str = trim_whitespace(pair_str.substr(0, colon_pos));
        string value_str = trim_whitespace(pair_str.substr(colon_pos + 1));

        // Remove quotes from key
        if (key_str.length() >= 2 && key_str.front() == '"') {
            key_str = key_str.substr(1, key_str.length() - 2);
        }
        key_str = unescape_json_string(key_str);

        // Parse array value
        if (value_str.length() >= 2 && value_str.front() == '[' && value_str.back() == ']') {
            string inner_array = value_str.substr(1, value_str.length() - 2);
            vector<string> ids;
            if (!inner_array.empty()) {
                vector<string> raw_ids = split_string(inner_array, ", ");
                for (string& id_str : raw_ids) {
                    id_str = trim_whitespace(id_str);
                    if (id_str.length() >= 2 && id_str.front() == '"') id_str = id_str.substr(1, id_str.length() - 2);
                    ids.push_back(unescape_json_string(id_str));
                }
            }
            data[key_str] = ids;
        }
    }
    return data;
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

    // Extract solution filename
    std::filesystem::path p(solution_path);
    string solution_filename = p.stem().string(); // Gets "solution" from "path/to/solution.cpp"

    // Ensure .cpst directory exists
    string base_output_dir = ".cpst";
    if (mkdir(base_output_dir.c_str(), 0777) == -1) {
        if (errno != EEXIST) { // EEXIST means directory already exists
            print_status("ERROR", Color::RED, "Failed to create base output directory: " + base_output_dir);
            return 1;
        }
    }

    // Generate a unique folder name for this solution run
    auto now = chrono::system_clock::now();
    auto in_time_t = chrono::system_clock::to_time_t(now);
    stringstream ss;
    ss << put_time(localtime(&in_time_t), "%Y%m%d%H%M%S");
    string unique_id = solution_filename + "_" + ss.str();
    string solution_output_dir = base_output_dir + "/" + unique_id;

    if (mkdir(solution_output_dir.c_str(), 0777) == -1) {
        if (errno != EEXIST) {
            print_status("ERROR", Color::RED, "Failed to create solution output directory: " + solution_output_dir);
            return 1;
        }
    }
    string output_dir = solution_output_dir; // Update output_dir to the new unique folder
    print_status("INFO", Color::BLUE, "Results for this run will be saved in: " + output_dir);

    // Handle solution_map.json
    string map_file_path = base_output_dir + "/solution_map.json";
    ifstream map_read_file(map_file_path);
    string map_content((istreambuf_iterator<char>(map_read_file)), istreambuf_iterator<char>());
    map_read_file.close();

    map<string, vector<string>> solution_map = parse_json_map_of_arrays(map_content);

    // Add or update the entry for the current solution_path
    solution_map[solution_path].push_back(unique_id);

    string new_map_content = serialize_json_map_of_arrays(solution_map);

    ofstream map_write_file(map_file_path);
    if (map_write_file.is_open()) {
        map_write_file << new_map_content;
        map_write_file.close();
        print_status("INFO", Color::BLUE, "Updated solution_map.json");
    } else {
        print_status("ERROR", Color::RED, "Failed to write solution_map.json");
    }

    print_status("INFO", Color::BLUE, "Compiling external solution...");

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
        }else
        {
            result.status = checker(input_str, result.output) ? "OK" : "WA";
            if (result.status == "OK") {
                print_status("OK", Color::GREEN, "Test passed! " + perf_info);
            } else {
                print_status("WA", Color::RED, "Wrong Answer! " + perf_info);
                cout << "Input:\n" << input_str << endl;
                cout << "Your Output:\n" << result.output << endl;
            }
        }

        // Prepare JSON output
        string json_output_filename = output_dir + "/" + solution_filename + ".result" + to_string(i) + ".json";
        ofstream json_file(json_output_filename);
        if (!json_file.is_open()) {
            print_status("ERROR", Color::RED, "Failed to open JSON output file: " + json_output_filename);
        } else {
            json_file << "{\n";
            json_file << "  \"testcase_input\": " << escape_json_string(input_str) << ",\n";
            json_file << "  \"output\": " << escape_json_string(result.output) << ",\n";
            json_file << "  \"result\": " << escape_json_string(result.status) << ",\n";
            json_file << "  \"time_ms\": " << result.time_ms << ",\n";
            json_file << "  \"memory_MB\": " << result.memory_MB << "\n";
            json_file << "}\n";
            json_file.close();
            print_status("INFO", Color::BLUE, "Results saved to: " + json_output_filename);
        }
    }

    remove(EXTERNAL_EXEC_NAME.c_str());
    return 0;
}
