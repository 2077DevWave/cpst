#include <iostream>
#include <string>
#include <sstream>
#include <fstream>

using namespace std;

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

int main(int argc, char* argv[]) {
    if (argc != 3) {
        cerr << "Usage: ./checker <input_file> <user_output_file>" << endl;
        return 2; // Internal error
    }

    ifstream input_file(argv[1]);
    ifstream user_output_file(argv[2]);

    if (!input_file.is_open() || !user_output_file.is_open()) {
        cerr << "Error opening files." << endl;
        return 2;
    }

    string input_content((istreambuf_iterator<char>(input_file)), istreambuf_iterator<char>());
    string user_output_content((istreambuf_iterator<char>(user_output_file)), istreambuf_iterator<char>());

    if (checker(input_content, user_output_content)) {
        return 0; // Correct Answer
    } else {
        return 1; // Wrong Answer
    }
}
