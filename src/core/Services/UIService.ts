
import * as vscode from 'vscode';
import { IFileManager, ITestReporter, ICPSTFolderManager } from '../Interfaces/classes';
import { IOrchestrationService, ITestFileService, IUIService } from '../Interfaces/services';
import { IRunId, ISolutionPath } from '../Interfaces/datastructures';

export class UIService implements IUIService {
    private _currentSolutionFile?: vscode.Uri;

    constructor(
        private readonly _fileManager: IFileManager,
        private readonly _testFileService: ITestFileService,
        private readonly _orchestrationService: IOrchestrationService,
        private readonly _reporter: ITestReporter,
        private readonly _cpstFolderManager: ICPSTFolderManager
    ) {}

    public updateActiveFile(activeFileUri: vscode.Uri | undefined): void {
        if (!activeFileUri) {
            this._currentSolutionFile = undefined;
            this._reporter.reportProgress({ command: "show-initial-state" });
            return;
        }

        let solutionUri: vscode.Uri | undefined;

        if (activeFileUri.path.endsWith(".genval.cpp") || activeFileUri.path.endsWith(".check.cpp")) {
            solutionUri = this._fileManager.getSolutionFileUri(activeFileUri);
        } else if (activeFileUri.path.endsWith(".cpp")) {
            solutionUri = activeFileUri;
        }

        if (!solutionUri) {
            this._currentSolutionFile = undefined;
            this._reporter.reportProgress({ command: "show-initial-state" });
            return;
        }

        this._currentSolutionFile = solutionUri;
        this._testFileService.testFilesExist(solutionUri).then(exists => {
            this._reporter.reportProgress({
                command: "update-view",
                testFileExists: exists,
                solutionFilename: vscode.workspace.asRelativePath(solutionUri!),
            });
        });
    }

    public async generateTestFiles(): Promise<void> {
        if (!this._currentSolutionFile) {
            this._reporter.reportError("No active C++ solution file selected.");
            return;
        }

        try {
            await this._testFileService.createTestFiles(this._currentSolutionFile);
            this.updateActiveFile(this._currentSolutionFile);
            vscode.window.showInformationMessage("Stress test files created successfully!");
        } catch (error) {
            // Error is already reported by TestFileService
        }
    }

    public async runStressTest(numTests: number): Promise<void> {
        if (!this._currentSolutionFile) {
            this._reporter.reportError("Cannot run test: Could not determine the solution file.");
            return;
        }

        this._reporter.reportHistoryCleared();
        this._reporter.reportTestRunning();

        const solutionPath = this._currentSolutionFile.fsPath;
        const genValPath = this._fileManager.getGenValFileUri(this._currentSolutionFile).fsPath;
        const checkerPath = this._fileManager.getCheckerFileUri(this._currentSolutionFile).fsPath;

        if (!this._fileManager.exists(genValPath) || !this._fileManager.exists(checkerPath)) {
            this._reporter.reportProgress({
                command: "error",
                message: "Stress test files not found. Please generate them first.",
            });
            return;
        }

        await this._orchestrationService.run(solutionPath, genValPath, checkerPath, numTests);
    }

    public async getRunsForActiveSolution(): Promise<void> {
        if (!this._currentSolutionFile) {
            this._reporter.reportError("No active C++ solution file selected.");
            return;
        }
        const solutionName = this._cpstFolderManager.getSolutionName(this._currentSolutionFile.fsPath as ISolutionPath);
        const runs = this._cpstFolderManager.getallRuns(solutionName);
        this._reporter.reportProgress({
            command: "show-runs",
            runs: runs,
        });
    }

    public async getTestCasesForRun(runId: string): Promise<void> {
        const testCases = this._cpstFolderManager.getallTestResults(runId as IRunId);
        this._reporter.reportProgress({
            command: "show-test-cases",
            testCases: testCases,
            runId: runId,
        });
    }
}
