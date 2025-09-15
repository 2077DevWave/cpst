import * as fs from 'fs';
import * as vscode from 'vscode';
import { FileManager } from '../../core/Managers/FileManager'; // Adjust the import path accordingly

// Mock the 'fs' module
jest.mock('fs');

describe('FileManager', () => {
  let fileManager: FileManager;
  const mockedFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    fileManager = new FileManager();
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('createDirectory', () => {
    it('should create a directory if it does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      fileManager.createDirectory('/test/dir');
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/test/dir', { recursive: true });
    });

    it('should not create a directory if it already exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      fileManager.createDirectory('/test/dir');
      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('writeFile', () => {
    it('should write content to a file', () => {
      fileManager.writeFile('/test/file.txt', 'hello world');
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith('/test/file.txt', 'hello world');
    });
  });

  describe('readFile', () => {
    it('should read content from a file', () => {
      mockedFs.readFileSync.mockReturnValue('file content');
      const content = fileManager.readFile('/test/file.txt');
      expect(mockedFs.readFileSync).toHaveBeenCalledWith('/test/file.txt', 'utf-8');
      expect(content).toBe('file content');
    });
  });

  describe('exists', () => {
    it('should return true if a file exists', () => {
      mockedFs.existsSync.mockReturnValue(true);
      expect(fileManager.exists('/test/file.txt')).toBe(true);
      expect(mockedFs.existsSync).toHaveBeenCalledWith('/test/file.txt');
    });

    it('should return false if a file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      expect(fileManager.exists('/test/file.txt')).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('should remove directories that exist', () => {
      mockedFs.existsSync.mockImplementation(dir => dir === '/test/dir1');
      fileManager.cleanup(['/test/dir1', '/test/dir2']);
      expect(mockedFs.rmSync).toHaveBeenCalledWith('/test/dir1', { recursive: true, force: true });
      expect(mockedFs.rmSync).not.toHaveBeenCalledWith('/test/dir2', expect.anything());
    });
  });

  describe('listDirectory', () => {
    it('should return a list of files in a directory', () => {
      mockedFs.existsSync.mockReturnValue(true);
      // FIX: Cast the mock's return value to 'any' to resolve the type error.
      mockedFs.readdirSync.mockReturnValue(['file1.txt', 'file2.txt'] as any);
      const files = fileManager.listDirectory('/test/dir');
      expect(files).toEqual(['file1.txt', 'file2.txt']);
      expect(mockedFs.readdirSync).toHaveBeenCalledWith('/test/dir');
    });

    it('should return an empty array if the directory does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      const files = fileManager.listDirectory('/test/dir');
      expect(files).toEqual([]);
      expect(mockedFs.readdirSync).not.toHaveBeenCalled();
    });
  });

  describe('getSolutionFileUri', () => {
    it('should get the correct solution file URI for a .genval.cpp file', () => {
      const testUri = vscode.Uri.file('/path/to/problem.genval.cpp');
      const solutionUri = fileManager.getSolutionFileUri(testUri);
      expect(solutionUri.fsPath).toBe('/path/to/problem.cpp');
    });

    it('should get the correct solution file URI for a .check.cpp file', () => {
      const testUri = vscode.Uri.file('/path/to/problem.check.cpp');
      const solutionUri = fileManager.getSolutionFileUri(testUri);
      expect(solutionUri.fsPath).toBe('/path/to/problem.cpp');
    });
  });

  describe('getGenValFileUri', () => {
    it('should get the correct .genval.cpp file URI', () => {
      const solutionUri = vscode.Uri.file('/path/to/problem.cpp');
      const genValUri = fileManager.getGenValFileUri(solutionUri);
      expect(genValUri.fsPath).toBe('/path/to/problem.genval.cpp');
    });
  });

  describe('getCheckerFileUri', () => {
    it('should get the correct .check.cpp file URI', () => {
      const solutionUri = vscode.Uri.file('/path/to/problem.cpp');
      const checkerUri = fileManager.getCheckerFileUri(solutionUri);
      expect(checkerUri.fsPath).toBe('/path/to/problem.check.cpp');
    });
  });

  describe('copyFile', () => {
    it('should copy a file', async () => {
      const source = vscode.Uri.file('/path/to/source.cpp');
      const destination = vscode.Uri.file('/path/to/destination.cpp');
      await fileManager.copyFile(source, destination, { overwrite: true });
      expect(vscode.workspace.fs.copy).toHaveBeenCalledWith(source, destination, { overwrite: true });
    });
  });
});