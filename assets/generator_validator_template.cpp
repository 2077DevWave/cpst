#include <iostream>
#include <string>
#include <sstream>
#include <random>
#include <chrono>

using namespace std;

// ===================================================================================
// SECTION 1: GENERATOR
// ===================================================================================
string generator(unsigned seed) {
    mt19937 rng(seed); // A random number generator seeded for reproducibility.
    uniform_int_distribution<int> dist(1, 100000);    // for generate random number in an specific range. usage: cout << dist(rng)
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

int main() {
    unsigned seed = chrono::high_resolution_clock::now().time_since_epoch().count();
    string test_case = generator(seed);
    if (!validator(test_case)) {
        cerr << "Generated test case is invalid!" << endl;
        return 1;
    }
    cout << test_case;
    return 0;
}
