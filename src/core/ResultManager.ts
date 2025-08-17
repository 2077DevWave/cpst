import * as path from 'path';
import { IFileManager, ITestRunResult, IResultManager, IJsonTestResult} from './interfaces';

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

    public save(result : IJsonTestResult): void {
        const resultFilePath = path.join(this._runFolderPath, `test_${result.test_case}.json`);
        this._fileManager.writeFile(resultFilePath, JSON.stringify(result, null, 4));
    }
}
