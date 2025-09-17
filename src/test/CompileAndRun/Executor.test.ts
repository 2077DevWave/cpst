import { exec, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { Executor } from '../../core/CompileAndRun/Executor';

jest.mock('child_process');

class MockChildProcess extends EventEmitter {
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    stdin = {
        write: jest.fn(),
        end: jest.fn(),
    };
}

describe('Executor', () => {
    let executor: Executor;
    let mockChildProcess: MockChildProcess;
    const mockedExec = exec as unknown as jest.Mock;
    const mockHrtime = jest.spyOn(process, 'hrtime');

    beforeEach(() => {
        jest.clearAllMocks();
        executor = new Executor();
        mockChildProcess = new MockChildProcess();
        mockedExec.mockReturnValue(mockChildProcess as unknown as ChildProcess);

        const startTime: [number, number] = [1000, 100000000];
        const diffTime: [number, number] = [0, 500000000]; // 500ms
        mockHrtime.mockReturnValueOnce(startTime).mockImplementation((start?: [number, number]) => {
            if (start && start[0] === startTime[0] && start[1] === startTime[1]) {
                return diffTime;
            }
            return [0, 0];
        });
    });

    describe('runWithLimits', () => {
        it('should return OK for successful execution', async () => {
            const promise = executor.runWithLimits('echo "hello"', '');
            mockChildProcess.stdout.emit('data', 'hello');
            mockChildProcess.emit('close', 0, null);
            const result = await promise;
            expect(result.status).toBe('OK');
            expect(result.stdout).toBe('hello');
        });

        it('should return TLE when killed by SIGTERM', async () => {
            const promise = executor.runWithLimits('./a.out', 'input');
            mockChildProcess.emit('close', null, 'SIGTERM');
            const result = await promise;
            expect(result.status).toBe('TLE');
        });

        it('should return RUNTIME_ERROR for non-zero exit code', async () => {
            const promise = executor.runWithLimits('./a.out', '');
            mockChildProcess.stderr.emit('data', 'segfault');
            mockChildProcess.emit('close', 139, null);
            const result = await promise;
            expect(result.status).toBe('RUNTIME_ERROR');
            expect(result.stderr).toBe('segfault');
        });

        it('should return MLE when maxBuffer is exceeded', async () => {
            const promise = executor.runWithLimits('./a.out', '');
            mockChildProcess.emit('error', new Error('stdout maxBuffer exceeded'));
            mockChildProcess.emit('close', 1, null);
            const result = await promise;
            expect(result.status).toBe('MLE');
        });
    });

    describe('runRaw', () => {
        it('should resolve with correct data on successful execution', async () => {
            const command = 'ls';
            const args = ['-la'];
            const stdout = 'total 0';
            const stderr = '';
            mockedExec.mockImplementation((fullCommand, callback) => {
                callback(null, stdout, stderr);
                return new MockChildProcess();
            });

            const result = await executor.runRaw(command, args);

            expect(result.stdout).toBe(stdout);
            expect(result.stderr).toBe(stderr);
            expect(result.code).toBe(0);
            expect(mockedExec).toHaveBeenCalledWith('ls -la', expect.any(Function));
        });

        it('should resolve with error data on failed execution', async () => {
            const command = 'cat';
            const args = ['nonexistent.txt'];
            const error = new Error('Command failed') as any;
            error.code = 1;
            const stderr = 'cat: nonexistent.txt: No such file or directory';
            mockedExec.mockImplementation((fullCommand, callback) => {
                callback(error, '', stderr);
                return new MockChildProcess();
            });

            const result = await executor.runRaw(command, args);

            expect(result.stderr).toBe(stderr);
            expect(result.code).toBe(1);
            expect(result.error).toBe(error);
        });
    });
});
