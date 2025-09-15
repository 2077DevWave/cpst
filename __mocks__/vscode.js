module.exports = {
  Uri: {
    // A simple mock for vscode.Uri.file that returns an object with an fsPath property.
    file: (path) => ({
      fsPath: path,
      with: jest.fn(),
      toJSON: jest.fn(),
    }),
  },
  workspace: {
    fs: {
      // A mock for the copy function. We can use jest.fn() to track if it's called.
      copy: jest.fn(),
    },
  },
  // Add any other parts of the vscode API that your code uses here.
  // For now, Uri and workspace.fs are all that FileManager needs.
};