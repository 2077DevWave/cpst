import * as path from 'path';
import { IExecutor, IFileManager } from '../../core/Interfaces/classes';
import { IRawExecutionResult } from '../../core/Interfaces/datastructures';
import { TestRunner } from '../../core/CompileAndRun/TestRunner';

jest.mock('path');

const mockExecutor: jest.Mocked<IExecutor> = {
    runWithLimits: jest.fn(),
    runRaw: jest.fn(),
};

const mockFileManager: jest.Mocked<IFileManager> = {
    writeFile: jest.fn(),
    createDirectory: jest.fn(),
    readFile: jest.fn(),
    exists: jest.fn(),
    cleanup: jest.fn(),
    listDirectory: jest.fn(),
    getSolutionFileUri: jest.fn(),
    getGenValFileUri: jest.fn(),
    getCheckerFileUri: jest.fn(),
    copyFile: jest.fn(),
};

describe('TestRunner', () => {
    let testRunner: TestRunner;
    const mockedPath = path as jest.Mocked<typeof path>;

    const tempDir = '/tmp/test';
    const solutionExec = './solution.out';
    const generatorExec = './gen.out';
    const checkerExec = './check.out';

    beforeEach(() => {
        jest.clearAllMocks();
        testRunner = new TestRunner(mockExecutor, mockFileManager);
        mockedPath.join.mockImplementation((...args) => args.join('/'));
    });

    describe('run', () => {
        const generatorResult = { stdout: 'test input', stderr: '', duration: 50, memory: 0, status: 'OK' };
        const solutionResult = { stdout: 'correct output', stderr: '', duration: 100, memory: 1024, status: 'OK' };

        it('should return OK when all stages pass', async () => {
            const checkerRawResult: IRawExecutionResult = { stdout: '', stderr: '', duration: 20, code: 0, signal: null };
            mockExecutor.runWithLimits.mockResolvedValueOnce(generatorResult).mockResolvedValueOnce(solutionResult);
            mockExecutor.runRaw.mockResolvedValueOnce(checkerRawResult);

            const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

            expect(result.status).toBe('OK');
            expect(result.input).toBe(generatorResult.stdout);
            expect(result.output).toBe(solutionResult.stdout);
            expect(mockExecutor.runWithLimits).toHaveBeenCalledTimes(2);
            expect(mockExecutor.runRaw).toHaveBeenCalledTimes(1);
            expect(mockFileManager.writeFile).toHaveBeenCalledTimes(2);
        });

        it('should return WA with a reason when the checker returns exit code 1', async () => {
            const reason = 'Expected 42, got 41';
            const checkerRawResult: IRawExecutionResult = { stdout: '', stderr: reason, duration: 22, code: 1, signal: null };
            mockExecutor.runWithLimits.mockResolvedValueOnce(generatorResult).mockResolvedValueOnce(solutionResult);
            mockExecutor.runRaw.mockResolvedValueOnce(checkerRawResult);

            const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

            expect(result.status).toBe('WA');
            expect(result.reason).toBe(reason);
            expect(result.input).toBe(generatorResult.stdout);
            expect(result.output).toBe(solutionResult.stdout);
        });

        it('should return Error when the checker returns a non-zero/non-one exit code', async () => {
            const errorMessage = 'Checker segmentation fault';
            const checkerRawResult: IRawExecutionResult = { stdout: '', stderr: errorMessage, duration: 25, code: 139, signal: null };
            mockExecutor.runWithLimits.mockResolvedValueOnce(generatorResult).mockResolvedValueOnce(solutionResult);
            mockExecutor.runRaw.mockResolvedValueOnce(checkerRawResult);

            const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

            expect(result.status).toBe('Error');
            expect(result.message).toContain(errorMessage);
        });

        it('should return Error if the generator fails', async () => {
            const genErrorResult = { stdout: '', stderr: 'gen error', duration: 10, memory: 0, status: 'RUNTIME_ERROR' };
            mockExecutor.runWithLimits.mockResolvedValueOnce(genErrorResult);

            const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

            expect(result.status).toBe('Error');
            expect(result.message).toContain('Generator error');
            expect(mockExecutor.runWithLimits).toHaveBeenCalledTimes(1);
            expect(mockExecutor.runRaw).not.toHaveBeenCalled();
        });

        it('should return solution status if solution fails (e.g., TLE)', async () => {
            const tleSolutionResult = { stdout: '', stderr: '', duration: 2001, memory: 512, status: 'TLE' };
            mockExecutor.runWithLimits.mockResolvedValueOnce(generatorResult).mockResolvedValueOnce(tleSolutionResult);

            const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

            expect(result.status).toBe('TLE');
            expect(result.input).toBe(generatorResult.stdout);
            expect(mockExecutor.runWithLimits).toHaveBeenCalledTimes(2);
            expect(mockExecutor.runRaw).not.toHaveBeenCalled();
        });

        it('should return RUNTIME_ERROR if solution produces stderr', async () => {
            const rteSolutionResult = { stdout: 'output', stderr: 'runtime error', duration: 150, memory: 512, status: 'OK' };
            mockExecutor.runWithLimits.mockResolvedValueOnce(generatorResult).mockResolvedValueOnce(rteSolutionResult);

            const result = await testRunner.run(tempDir, solutionExec, generatorExec, checkerExec);

            expect(result.status).toBe('RUNTIME_ERROR');
            expect(result.message).toContain('Solution runtime error');
            expect(mockExecutor.runWithLimits).toHaveBeenCalledTimes(2);
            expect(mockExecutor.runRaw).not.toHaveBeenCalled();
        });
    });
});
