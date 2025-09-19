
import { Uri } from "vscode";
import { ITestResult, IExecutablePaths, ITestRunResult, IJsonTestResult, ITestPaths, IRunId } from "./datastructures";

/**
 * Manages the creation and verification of test files (generator, checker).
 */
export interface ITestFileService {
  /**
   * Creates the generator/validator and checker files for a given solution file.
   * @param solutionFile The URI of the C++ solution file.
   */
  createTestFiles(solutionFile: Uri): Promise<void>;

  /**
   * Checks if the necessary test files exist for a given solution file.
   * @param solutionFile The URI of the C++ solution file.
   */
  testFilesExist(solutionFile: Uri): Promise<boolean>;
}

/**
 * Handles the compilation of C++ source files into executables.
 */
export interface ICompilationService {
  /**
   * Compiles the solution, generator, and checker files.
   * @param solutionPath The file path to the C++ solution.
   * @param generatorValidatorPath The file path to the generator/validator.
   * @param checkerPath The file path to the checker.
   * @returns A promise that resolves with the paths to the executables, or undefined if compilation fails.
   */
  compile(
    solutionPath: string,
    generatorValidatorPath: string,
    checkerPath: string,
  ): Promise<IExecutablePaths | undefined>;

  /**
   * Compiles the solution and checker files for re-running tests with existing inputs.
   * The generator is not needed in this case.
   * @param solutionPath The file path to the C++ solution.
   * @param checkerPath The file path to the checker.
   * @returns A promise that resolves with the paths to the executables, or undefined if compilation fails.
   */
  compileForRerun(solutionPath: string, checkerPath: string): Promise<IExecutablePaths | undefined>
}

/**
 * Executes a single stress test case and returns the result.
 */
export interface ITestRunnerService {
  /**
   * Runs a single test case using the compiled executables.
   * @param solutionExec The path to the solution executable.
   * @param generatorExec The path to the generator executable.
   * @param checkerExec The path to the checker executable.
   * @returns A promise that resolves with the test result.
   */
  runSingleTest(
    solutionExec: string,
    generatorExec: string,
    checkerExec: string
  ): Promise<ITestRunResult>;

  /**
   * Runs a single test case with a given input.
   * @param solutionExec The path to the solution executable.
   * @param checkerExec The path to the checker executable.
   * @param input The input for the test case.
   * @returns A promise that resolves with the test result.
   */
  runSingleTestWithInput(
    solutionExec: string,
    checkerExec: string,
    input: string
  ): Promise<ITestRunResult>;
}

/**
 * Manages the storage and retrieval of test results.
 */
export interface IResultService {
  /**
   * Initializes the result storage for a new test run.
   * @param solutionPath The path to the solution file, used to set up the result directories.
   * @returns An object containing all the necessary paths for the test run.
   */
  initialize(solutionPath : string): ITestPaths;

  /**
   * Saves the result of a single test case.
   * @param result The test result to save.
   * @param paths The paths object for the current test run.
   */
  saveResult(result: IJsonTestResult, paths: ITestPaths): void;

  /**
   * Updates an existing test case result.
   * @param result The updated test result object.
   * @param runId The ID of the run containing the test case.
   */
  updateResult(result: IJsonTestResult, runId: IRunId): void;
}

/**
 * The central coordinator that orchestrates the entire stress-testing workflow.
 */
export interface IOrchestrationService {
  /**
   * Runs the complete stress test suite for a given solution.
   * @param solutionPath The file path to the C++ solution.
   * @param generatorValidatorPath The file path to the generator/validator.
   * @param checkerPath The file path to the checker.
   * @param numTests The number of test cases to run.
   */
  run(
    solutionPath: string,
    generatorValidatorPath: string,
    checkerPath: string,
    numTests: number
  ): Promise<void>;

  /**
   * Re-runs a specific set of test cases with existing inputs.
   * @param solutionPath The file path to the C++ solution.
   * @param checkerPath The file path to the checker.
   * @param testCases A map of run IDs to the test cases to be re-run.
   */
  reRun(solutionPath: string, checkerPath: string, testCases: { [key: IRunId]: IJsonTestResult[] }): Promise<void>;
}

/**
 * Acts as a bridge between the webview UI (MyPanelProvider) and the application's core logic.
 */
export interface IUIService {
  /**
   * Handles the command to generate test files.
   */
  generateTestFiles(): Promise<void>;

  /**
   * Handles the command to run the stress test.
   * @param numTests The number of test cases to run.
   */
  runStressTest(numTests: number): Promise<void>;

  /**
   * Notifies the UI about the currently active solution file.
   * @param activeFileUri The URI of the active file in the editor.
   */
  updateActiveFile(activeFileUri: Uri | undefined): void;

  /**
   * Handles the command to get all runs for the active solution.
   */
  getRunsForActiveSolution(): Promise<void>;

  /**
   * Handles the command to get all test cases for a given run.
   * @param runId The ID of the run.
   */
  getTestCasesForRun(runId: string): Promise<void>;

  /**
   * Handles the command to re-run a selection of tests.
   * @param testCases A map of run IDs to the test cases to be re-run.
   */
  reRunTests(testCases: { [key: IRunId]: IJsonTestResult[] }): Promise<void>
}
