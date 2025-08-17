
import { exec, ExecOptions } from 'child_process';
import { IExecutor, IExecutionResult, IRawExecutionResult, IExecutionOptionsConfig} from './interfaces';

export class Executor implements IExecutor {
    private readonly defaultOptions: IExecutionOptionsConfig = {
        timeout: 2000, // 2 seconds
        maxBuffer: 1024 * 1024 * 512, // 512 MB
    };

    /**
     * Runs a command with specified resource limits.
     * @param command The command to execute.
     * @param input The input string to pass to the command's stdin.
     * @param options Optional configuration to override default execution limits.
     * @returns A promise that resolves to an ExecutionResult.
     */
    public async runWithLimits(command: string, input: string, options?: Partial<IExecutionOptionsConfig>): Promise<IExecutionResult> {
        const executionOptions = { ...this.defaultOptions, ...options };
        
        const rawResult = await this.executeCommand(command, input, executionOptions);
        const status = this.determineStatus(rawResult);
        
        return {
            stdout: rawResult.stdout,
            stderr: rawResult.stderr,
            duration: rawResult.duration,
            memory: 0, // Memory measurement is not implemented yet.
            status: status,
        };
    }

    /**
     * Calculates the duration in milliseconds from a process.hrtime start tuple.
     * @param start The result of a previous process.hrtime() call.
     * @returns The duration in milliseconds.
     */
    private calculateDuration(start: [number, number]): number {
        const diff = process.hrtime(start);
        return (diff[0] * 1e9 + diff[1]) / 1e6; // convert to ms
    }

    /**
     * Executes a shell command and captures its raw output.
     * This method encapsulates the logic of interacting with a child process.
     * @param command The command to execute.
     * @param input The input to pipe to the process's stdin.
     * @param options The execution options (timeout, maxBuffer).
     * @returns A promise that resolves to a RawExecutionResult.
     */
    private executeCommand(command: string, input: string, options: IExecutionOptionsConfig): Promise<IRawExecutionResult> {
        const start = process.hrtime();
        const execOptions: ExecOptions = {
            timeout: options.timeout,
            maxBuffer: options.maxBuffer,
            killSignal: 'SIGTERM'
        };

        return new Promise((resolve) => {
            const child = exec(command, execOptions);
            let stdout = '';
            let stderr = '';
            let error: Error | undefined;

            child.stdout?.on('data', (data) => stdout += data);
            child.stderr?.on('data', (data) => stderr += data);

            child.on('error', (err) => {
                // This event is triggered for errors like timeout, maxBuffer, or if the command fails to spawn.
                error = err;
            });

            child.on('close', (code, signal) => {
                const duration = this.calculateDuration(start);
                resolve({ stdout, stderr, duration, code, signal, error });
            });

            child.stdin?.write(input);
            child.stdin?.end();
        });
    }

    /**
     * Determines the execution status based on the raw result from the process.
     * This method isolates the logic for interpreting process exit signals and codes.
     * @param result The RawExecutionResult from the executed command.
     * @returns A status string (e.g., 'OK', 'TLE', 'MLE', 'RUNTIME_ERROR').
     */
    private determineStatus(result: IRawExecutionResult): string {
        // Check for Time Limit Exceeded (TLE)
        if (result.signal === 'SIGTERM') {
            // Check if the TLE was caused by exceeding the maxBuffer (MLE)
            if (result.error && result.error.message.includes('maxBuffer')) {
                return 'MLE'; // Memory Limit Exceeded
            }
            return 'TLE'; // Time Limit Exceeded
        }
        
        // Check for Memory Limit Exceeded (MLE) on its own, just in case.
        if (result.error && result.error.message.includes('maxBuffer')) {
            return 'MLE';
        }

        // Check for successful execution
        if (result.code === 0) {
            return 'OK';
        }

        // Any other non-zero exit code is considered a Runtime Error
        return 'RUNTIME_ERROR';
    }
}
