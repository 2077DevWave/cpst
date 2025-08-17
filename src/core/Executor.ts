
import { exec } from 'child_process';
import { IExecutor } from './interfaces';

export class Executor implements IExecutor {
    public async runWithLimits(command: string, input: string): Promise<{ stdout: string, stderr: string, duration: number, memory: number, status: string }> {
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
}
