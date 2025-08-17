import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class StressTestEngine {
    private context: vscode.ExtensionContext;
    private panel: vscode.WebviewView;
    private baseDir: string;

    constructor(context: vscode.ExtensionContext, panel: vscode.WebviewView, baseDir: string) {
        this.context = context;
        this.panel = panel;
        this.baseDir = baseDir;
    }

    public async runTests(solutionPath: string, generatorValidatorPath: string, checkerPath: string) {
        const solutionExec = path.join(this.baseDir, "solution_exec");
        const generatorExec = path.join(this.baseDir, "generator_exec");
        const checkerExec = path.join(this.baseDir, "checker_exec");

        // 1. Compile all files
        if (!await this.compile(solutionPath, solutionExec)) return;
        if (!await this.compile(generatorValidatorPath, generatorExec)) return;
        if (!await this.compile(checkerPath, checkerExec)) return;

        // Setup results directory
        const cpstDir = path.join(this.baseDir, '.cpst');
        if (!fs.existsSync(cpstDir)) {
            fs.mkdirSync(cpstDir, { recursive: true });
        }

        const solutionName = path.basename(solutionPath);
        const solutionDir = path.join(cpstDir, solutionName);
        if (!fs.existsSync(solutionDir)) {
            fs.mkdirSync(solutionDir, { recursive: true });
        }
        
        const mainJsonPath = path.join(cpstDir, 'main.json');
        let mainJson: { [key: string]: string[] } = {};
        if (fs.existsSync(mainJsonPath)) {
            try {
                mainJson = JSON.parse(fs.readFileSync(mainJsonPath, 'utf-8'));
            } catch (e) {
                mainJson = {};
            }
        }

        const runFolderName = new Date().toISOString().replace(/[:.]/g, '-');
        const runFolderPath = path.join(solutionDir, runFolderName);
        fs.mkdirSync(runFolderPath, { recursive: true });

        if (!mainJson[solutionName]) {
            mainJson[solutionName] = [];
        }
        mainJson[solutionName].push(runFolderName);
        fs.writeFileSync(mainJsonPath, JSON.stringify(mainJson, null, 4));

        // 2. Loop and run tests
        const numTests = 100; // Make this configurable later
        for (let i = 1; i <= numTests; i++) {
            this.panel.webview.postMessage({ command: 'testResult', status: 'Running', testCase: i });

            // a. Generate test case
            const { stdout: testCase, stderr: genError } = await execAsync(generatorExec);
            if (genError) {
                const result = { command: 'testResult', status: 'Error', message: `Generator error: ${genError}` };
                this.panel.webview.postMessage(result);
                this.saveTestResult(runFolderPath, i, { status: result.status, message: result.message });
                break;
            }

            // b. Run solution
            const { stdout: userOutput, stderr: solError, duration, memory, status: solStatus } = await this.runWithLimits(solutionExec, testCase);
            
            if (solStatus !== 'OK') {
                const result = { command: 'testResult', status: solStatus, testCase: i, input: testCase, time: duration, memory: memory };
                this.panel.webview.postMessage(result);
                this.saveTestResult(runFolderPath, i, { status: result.status, input: result.input, exec_time: result.time, memory_used: result.memory });
                break;
            }
            
            if (solError) {
                 const result = { command: 'testResult', status: 'RUNTIME_ERROR', message: `Solution runtime error: ${solError}`, testCase: i, input: testCase, time: duration, memory: memory };
                 this.panel.webview.postMessage(result);
                 this.saveTestResult(runFolderPath, i, { status: result.status, message: result.message, input: result.input, exec_time: result.time, memory_used: result.memory });
                 break;
            }
            
            // c. Check output
            const tempDir = path.join(this.baseDir, '.cpst_temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
            const inputFile = path.join(tempDir, 'input.txt');
            const outputFile = path.join(tempDir, 'output.txt');
            fs.writeFileSync(inputFile, testCase);
            fs.writeFileSync(outputFile, userOutput);

            try {
                await execAsync(`${checkerExec} ${inputFile} ${outputFile}`);
                const result = { command: 'testResult', status: 'OK', testCase: i, time: duration, memory: memory, input: testCase, output: userOutput};
                this.panel.webview.postMessage(result);
                this.saveTestResult(runFolderPath, i, { status: result.status, exec_time: result.time, memory_used: result.memory, input: result.input, output: result.output});
            } catch (error: any) {
                if (error.code === 1) { // WA
                    const result = { command: 'testResult', status: 'WA', testCase: i, input: testCase, output: userOutput, time: duration, memory: memory };
                    this.panel.webview.postMessage(result);
                    this.saveTestResult(runFolderPath, i, { status: result.status, input: result.input, output: result.output, exec_time: result.time, memory_used: result.memory });
                    break; 
                } else { // Checker error
                    const result = { command: 'testResult', status: 'Error', message: `Checker error: ${error.stderr}` };
                    this.panel.webview.postMessage(result);
                    this.saveTestResult(runFolderPath, i, { status: result.status, message: result.message });
                    break;
                }
            }
        }
        
        // 3. Cleanup
        this.cleanup([solutionExec, generatorExec, checkerExec]);
        const tempDir = path.join(this.baseDir, '.cpst_temp');
        if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    }

    private saveTestResult(
        runFolderPath: string, 
        testCaseNumber: number, 
        result: { 
            status: string, 
            input?: string, 
            output?: string, 
            exec_time?: number, 
            memory_used?: number, 
            message?: string 
        }
    ) {
        const resultFilePath = path.join(runFolderPath, `test_${testCaseNumber}.json`);
        const resultData = {
            test_case: testCaseNumber,
            last_result: result.status,
            input: result.input || "",
            user_output: result.output || "",
            exec_time: result.exec_time || 0,
            memory_used: result.memory_used || 0,
            message: result.message || ""
        };
        fs.writeFileSync(resultFilePath, JSON.stringify(resultData, null, 4));
    }

    private async compile(filePath: string, execPath: string): Promise<boolean> {
        const command = `g++ -std=c++17 -O2 -Wall "${filePath}" -o "${execPath}"`;
        try {
            await execAsync(command);
            return true;
        } catch (error: any) {
            this.panel.webview.postMessage({ command: 'testResult', status: 'Error', message: `Compilation failed for ${path.basename(filePath)}: ${error.stderr}` });
            return false;
        }
    }
    
    private async runWithLimits(command: string, input: string): Promise<{ stdout: string, stderr: string, duration: number, memory: number, status: string }> {
        const start = process.hrtime();
        
        const execOptions: import('child_process').ExecOptions = { 
            timeout: 2000, 
            maxBuffer: 1024 * 1024 * 256, /* 256 MB */
            killSignal: 'SIGTERM'
        };

        try {
            const child = exec(command, execOptions);
            let stdout = '';
            let stderr = '';
            child.stdout?.on('data', (data) => stdout += data);
            child.stderr?.on('data', (data) => stderr += data);
            
            child.stdin?.write(input);
            child.stdin?.end();

            await new Promise<void>((resolve, reject) => {
                child.on('close', (code, signal) => {
                    if (code === 0) {
                        resolve();
                    } else {
                        reject({ code, signal, stderr });
                    }
                });
                child.on('error', reject);
            });

            const diff = process.hrtime(start);
            const duration = (diff[0] * 1e9 + diff[1]) / 1e6; // ms
            return { stdout, stderr, duration, memory: 0, status: 'OK' };

        } catch (error: any) {
            const diff = process.hrtime(start);
            const duration = (diff[0] * 1e9 + diff[1]) / 1e6;
            let status = "RUNTIME_ERROR";

            if (error.signal === 'SIGTERM') {
                status = 'TLE';
            } else if (error.code === null) {
                 if (error.message && error.message.includes('maxBuffer')) {
                    status = 'MLE';
                }
            }
            return { stdout: '', stderr: error.stderr, duration, memory: 0, status };
        }
    }

    private cleanup(files: string[]) {
        files.forEach(file => {
            if (fs.existsSync(file)) {
                fs.unlinkSync(file);
            }
        });
    }
}
