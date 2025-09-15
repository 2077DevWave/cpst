
import { exec } from 'child_process';
import { promisify } from 'util';
import { ICommandExecutor } from '../Interfaces/classes';

const execAsync = promisify(exec);

export class CommandExecutor implements ICommandExecutor {
    public async execute(command: string): Promise<{ stdout: string; stderr: string }> {
        return await execAsync(command);
    }
}
