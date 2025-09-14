
import { exec, ExecOptions } from 'child_process';
import { IExecutor } from '../Interfaces/classes';
import { IExecutionOptionsConfig, IExecutionResult, IRawExecutionResult } from '../Interfaces/datastructures';

export class Executor implements IExecutor {
    private readonly defaultOptions: IExecutionOptionsConfig = {
        timeout: 2000, // 2 seconds
        maxBuffer: 1024 * 1024 * 512, // 512 MB
    };

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

    private calculateDuration(start: [number, number]): number {
        const diff = process.hrtime(start);
        return (diff[0] * 1e9 + diff[1]) / 1e6; // convert to ms
    }

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

    private determineStatus(result: IRawExecutionResult): string {
        if (result.signal === 'SIGTERM') {
            return 'TLE';
        }

        if (result.error?.message.includes('maxBuffer')) {
            return 'MLE';
        }

        if (result.code === 0) {
            return 'OK';
        }

        return 'RUNTIME_ERROR';
    }
}
