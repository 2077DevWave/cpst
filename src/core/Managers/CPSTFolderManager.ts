import * as path from 'path';
import { IFileManager, ICPSTFolderManager } from '../Interfaces/classes';
import { ITestPaths, IJsonTestResult, ITempDirPath, IResultDirPath, IRunDirPath, ISolutionName, IRunId, IMainJson, IMainJsonPath, ITestCaseJsonPath, ISolutionPath} from '../Interfaces/datastructures';
import { FileManager } from './FileManager';

export class CPSTFolderManager implements ICPSTFolderManager {
    constructor(
        private readonly _fileManager: IFileManager,
        private readonly _baseDir: string
    ) {
        this.createTempDir();
        this.createResultDir();
    }

    public getSolutionName(solutionPath: ISolutionPath): ISolutionName {
        return path.basename(solutionPath) as ISolutionName;
    }

    public getRunId(runFolderPath: IRunDirPath): IRunId {
        return path.basename(runFolderPath) as IRunId;
    }

    public getTempDirPath(): ITempDirPath {
        const tempPath = path.join(this._baseDir, 'temp');
        if(!this._fileManager.exists(tempPath)){
            this._fileManager.createDirectory(tempPath);
        }
        return tempPath as ITempDirPath;
    }

    public getResultDirPath(): IResultDirPath{
        const resultPath = path.join(this._baseDir, 'results');
        if(!this._fileManager.exists(resultPath)){
            this._fileManager.createDirectory(resultPath);
        }
        return resultPath as IResultDirPath;
    }

    public getMainJsonPath(): IMainJsonPath{
        return path.join(this.getResultDirPath(), 'main.json') as IMainJsonPath;
    }

    public getRunResultDirPath(runId: IRunId): IRunDirPath{
        return path.join(this.getResultDirPath(), runId) as IRunDirPath;
    }

    public getTestCaseResultPath(runId: IRunId, testCaseNo: number): ITestCaseJsonPath{
        return path.join(this.getRunResultDirPath(runId), `test_${testCaseNo}.json`) as ITestCaseJsonPath;
    }

    public getTestCaseNo(testCasePath: ITestCaseJsonPath): number{
        return Number.parseInt(path.basename(testCasePath).replace("test_", "").replace(".json", ""));
    }

    public getTestCaseResultData(testCasePath: ITestCaseJsonPath): IJsonTestResult {
        let testResult: IJsonTestResult = {testCase: this.getTestCaseNo(testCasePath)};
        if (this._fileManager.exists(testCasePath)) {
            try {
                testResult = JSON.parse(this._fileManager.readFile(testCasePath));
            } catch (e) {
                testResult = {testCase: this.getTestCaseNo(testCasePath)};
            }
        }
        return testResult;
    }

    public getTestPaths(solutionPath: ISolutionPath, runId: IRunId): ITestPaths{
        return {tempDir: this.getTempDirPath(), resultsDir: this.getResultDirPath(), solutionPath: solutionPath, runFolderPath: this.getRunResultDirPath(runId), mainJsonPath: this.getMainJsonPath()};
    }

    public generateNonce(){
        return new Date().toISOString().replace(/[:.]/g, '-');
    }

    public createTempDir(): void{
        this._fileManager.createDirectory(this.getTempDirPath());
    }

    public createResultDir(): void{
        this._fileManager.createDirectory(this.getResultDirPath());
    }

    public createRunFolder(runId: IRunId): void{
        this._fileManager.createDirectory(this.getRunResultDirPath(runId));
    }

    public addSolutionToMainJson(solutionName: ISolutionName): void{
        let mainJson = this.readMainJson();
        if (!mainJson[solutionName]) {
            mainJson[solutionName] = [];
        }
        this._fileManager.writeFile(this.getMainJsonPath(), JSON.stringify(mainJson, null, 4));
    }

    public addRunToMainJson(solutionName: ISolutionName, runId: IRunId): void{
        this.addSolutionToMainJson(solutionName); // to ensure solution exist
        let mainJson = this.readMainJson();
        mainJson[solutionName].push(runId);
        this._fileManager.writeFile(this.getMainJsonPath(), JSON.stringify(mainJson, null, 4));
    }

    public addSolution(solutionPath : ISolutionPath): void{
        this.addSolutionToMainJson(this.getSolutionName(solutionPath));
    }

    public addRun(solutionName: ISolutionName, runId: IRunId): void{
        this.createRunFolder(runId);
        this.addRunToMainJson(solutionName, runId);
    }

    public readMainJson(): IMainJson{
        let mainJsonPath = this.getMainJsonPath();
        let mainJson: IMainJson = {};
        if (this._fileManager.exists(mainJsonPath)) {
            try {
                mainJson = JSON.parse(this._fileManager.readFile(mainJsonPath));
            } catch (e) {
                mainJson = {};
            }
        }
        return mainJson;
    }

    public initializeTestRun(solutionName: ISolutionName, runId: IRunId): void {
        this.addRun(solutionName,runId);
    }

    public saveResult(runFolderPath: IRunDirPath, result: IJsonTestResult): void {
        const resultFilePath = this.getTestCaseResultPath(this.getRunId(runFolderPath), result.testCase);
        this._fileManager.writeFile(resultFilePath, JSON.stringify(result, null, 4));
    }

    public getAllSolutions(): ISolutionName[] {
        try {
            const mainJson = this.readMainJson();
            return Object.keys(mainJson) as ISolutionName[];
        } catch (e) {
            return [];
        }
    }

    public getAllRuns(solutionName: ISolutionName): IRunId[] {
        try {
            const mainJson = this.readMainJson();
            return mainJson[solutionName] || [];
        } catch (e) {
            return [];
        }
    }

    public getAllTestResults(runId: IRunId): IJsonTestResult[] {
        const runFolderPath = this.getRunResultDirPath(runId);
        if (!this._fileManager.exists(runFolderPath)) {
            return [];
        }

        const testFiles = this._fileManager.listDirectory(runFolderPath)
            .filter(file => file.startsWith('test_') && file.endsWith('.json'));

        const results: IJsonTestResult[] = [];
        for (const file of testFiles) {
            const filePath = path.join(runFolderPath, file);
            try {
                const content = this._fileManager.readFile(filePath);
                results.push(JSON.parse(content));
            } catch (e) {
                console.error(`Failed to parse test result file: ${filePath}`, e);
            }
        }
        return results;
    }

    public deleteSolution(solutionName: ISolutionName): void {
        let mainJson = this.readMainJson();
        if (mainJson[solutionName]) {
            const runsToDelete = mainJson[solutionName];

            for (const runId of runsToDelete) {
                this.deleteRun(runId);
            }

            delete mainJson[solutionName];
            this._fileManager.writeFile(this.getMainJsonPath(), JSON.stringify(mainJson, null, 4));
        }
    }

    public deleteRun(runId: IRunId): void {
        const runFolderPath = this.getRunResultDirPath(runId);
        if (this._fileManager.exists(runFolderPath)) {
            this._fileManager.deleteDirectory(runFolderPath);
        }

        let mainJson = this.readMainJson();
        const solutionsNames = this.getAllSolutions();
        for(const solutionName of solutionsNames){
            if (mainJson[solutionName]) {
                mainJson[solutionName] = mainJson[solutionName].filter(id => id !== runId);
            }
        }
        this._fileManager.writeFile(this.getMainJsonPath(), JSON.stringify(mainJson, null, 4));
    }

    public deleteTestResult(runId: IRunId, testCaseNo: number): void {
        const testCasePath = this.getTestCaseResultPath(runId, testCaseNo);
        if (this._fileManager.exists(testCasePath)) {
            this._fileManager.deleteFile(testCasePath);
        }
    }

    public updateTestResult(runId: IRunId, newJsonResult: IJsonTestResult): void {
        const testCasePath = this.getTestCaseResultPath(runId, newJsonResult.testCase);
        if (this._fileManager.exists(testCasePath)) {
            this._fileManager.writeFile(testCasePath, JSON.stringify(newJsonResult, null, 4));
        }
    }

    public cleanup(paths: string[]): void {
        this._fileManager.cleanup(paths);
    }
}
