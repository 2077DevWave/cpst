import * as path from 'path';
import { IFileManager, ITestRunResult, IResultManager } from './interfaces';

export class ResultManager implements IResultManager {
    constructor(
        private readonly _fileManager: IFileManager,
        private readonly _runFolderPath: string,
        private readonly _mainJsonPath: string,
        private readonly _solutionName: string,
        private readonly _runFolderName: string
    ) {}

    public initialize(): void {
        let mainJson: { [key: string]: string[] } = {};
        if (this._fileManager.exists(this._mainJsonPath)) {
            try {
                mainJson = JSON.parse(this._fileManager.readFile(this._mainJsonPath));
            } catch (e) {
                mainJson = {};
            }
        }

        if (!mainJson[this._solutionName]) {
            mainJson[this._solutionName] = [];
        }
        mainJson[this._solutionName].push(this._runFolderName);
        this._fileManager.writeFile(this._mainJsonPath, JSON.stringify(mainJson, null, 4));
    }

    public save(testCaseNumber: number, result: ITestRunResult): void {
        const resultFilePath = path.join(this._runFolderPath, `test_${testCaseNumber}.json`);
        const resultData = {
            test_case: testCaseNumber,
            last_result: result.status,
            input: result.input || "",
            user_output: result.output || "",
            exec_time: result.duration || 0,
            memory_used: result.memory || 0,
            message: result.message || ""
        };
        this._fileManager.writeFile(resultFilePath, JSON.stringify(resultData, null, 4));
    }
}
