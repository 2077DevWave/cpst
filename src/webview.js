const vscode = acquireVsCodeApi();
const initialView = document.getElementById('initial-view');
const actionsView = document.getElementById('actions-view');
const generateView = document.getElementById('generate-view');
const runView = document.getElementById('run-view');
const fileInfo = document.getElementById('file-info');
const summaryView = document.getElementById('summary-view');
const resultsView = document.getElementById('results-view');
const numTestsInput = document.getElementById('num-tests-input');
const runsView = document.getElementById('runs-view');
const testCasesView = document.getElementById('test-cases-view');
const rerunContainer = document.getElementById('rerun-container');
const rerunButton = document.getElementById('rerun-selected-button');
const rerunCount = document.getElementById('rerun-count');

let selectedTestsByRun = {};
let isReRunning = false;

function getTestCaseDetailsHtml(result) {
    const status = result.status || result.lastResult;
    const time = result.time || result.execTime;
    const memory = result.memory || result.memoryUsed;
    const input = result.input;
    const output = result.output || result.userOutput;
    const reason = result.reason;
    const message = result.message;

    return `
        <p>Result: ${status}</p>
        <p>Time: ${time} ms</p>
        <p>Memory: ${memory} KB</p>
        <details>
            <summary>Details</summary>
            <p><strong>Input:</strong></p><pre>${input || ''}</pre>
            <p><strong>Output:</strong></p><pre>${output || ''}</pre>
            ${reason ? `<p><strong>Reason:</strong></p><pre>${reason}</pre>` : ''}
            ${message ? `<p><strong>Message:</strong></p><pre>${message}</pre>` : ''}
        </details>
    `;
}

function getResultMarkup(result) {
    return `<h3>Latest Result:</h3><div class="test-case-item">${getTestCaseDetailsHtml(result)}</div>`;
}

function updateRerunButton() {
    const totalSelected = Object.values(selectedTestsByRun).reduce((sum, tcs) => sum + tcs.length, 0);
    rerunCount.textContent = totalSelected;
    rerunContainer.classList.toggle('hidden', totalSelected === 0);
}

function resetRerunState() {
    isReRunning = false;
    rerunButton.disabled = false;
    const originalText = `Re-run Selected Tests (<span id="rerun-count">${rerunCount.textContent}</span>)`;
    rerunButton.innerHTML = originalText;
}

document.getElementById('generate-button').addEventListener('click', () => {
    vscode.postMessage({ command: 'generate' });
});

document.getElementById('run-button').addEventListener('click', () => {
    const numTests = parseInt(numTestsInput.value, 10);
    if (isNaN(numTests) || numTests <= 0) {
        numTestsInput.style.borderColor = 'red';
        return;
    }
    numTestsInput.style.borderColor = 'var(--vscode-input-border)';
    vscode.postMessage({ command: 'run', numTests: numTests });
});

document.getElementById('view-runs-button').addEventListener('click', () => {
    vscode.postMessage({ command: 'get-runs' });
});

rerunButton.addEventListener('click', () => {
    const rerunTotalCount = Object.values(selectedTestsByRun).reduce((sum, tcs) => sum + tcs.length, 0);
    if (rerunTotalCount === 0) return;

    isReRunning = true;
    rerunButton.disabled = true;
    rerunButton.textContent = 'Re-running...';
    summaryView.innerHTML = '';
    resultsView.innerHTML = '';

    vscode.postMessage({ command: 'rerun-tests', testCases: selectedTestsByRun });
});

testCasesView.addEventListener('change', event => {
    if (event.target.classList.contains('test-case-checkbox')) {
        const checkbox = event.target;
        const runId = checkbox.dataset.runId;
        const testCaseData = JSON.parse(decodeURIComponent(checkbox.dataset.testCase));

        if (!selectedTestsByRun[runId]) {
            selectedTestsByRun[runId] = [];
        }

        if (checkbox.checked) {
            if (!selectedTestsByRun[runId].some(tc => tc.testCase === testCaseData.testCase)) {
                selectedTestsByRun[runId].push(testCaseData);
            }
        } else {
            selectedTestsByRun[runId] = selectedTestsByRun[runId].filter(tc => tc.testCase !== testCaseData.testCase);
            if (selectedTestsByRun[runId].length === 0) {
                delete selectedTestsByRun[runId];
            }
        }
        updateRerunButton();
    }
});


window.addEventListener('message', event => {
    const message = event.data;
    switch (message.command) {
        case 'show-initial-state':
            initialView.classList.remove('hidden');
            actionsView.classList.add('hidden');
            break;
        case 'update-view':
            initialView.classList.add('hidden');
            actionsView.classList.remove('hidden');
            fileInfo.innerHTML = 'Testing: <code>' + message.solutionFilename + '</code>';
            generateView.classList.toggle('hidden', message.testFileExists);
            runView.classList.toggle('hidden', !message.testFileExists);
            break;
        case 'test-running':
            resultsView.innerHTML = '<p>Running tests...</p>';
            summaryView.innerHTML = '';
            runsView.innerHTML = '';
            testCasesView.innerHTML = '';
            selectedTestsByRun = {};
            updateRerunButton();
            break;
        case 'testResult':
            if (isReRunning) {
                const testCaseItem = document.getElementById(`test-case-item-${message.runId}-${message.testCase}`);
                if (testCaseItem) {
                    const detailsContainer = testCaseItem.querySelector('.test-case-details');
                    if (detailsContainer) {
                        if (message.status === 'Running') {
                            detailsContainer.innerHTML = `<p>Result: Re-running...</p>`;
                        } else {
                            detailsContainer.innerHTML = getTestCaseDetailsHtml(message);
                        }
                    }
                }
            } else {
                if (message.status === 'Running') {
                    resultsView.innerHTML = `<p>Running test #${message.testCase}...</p>`;
                } else {
                    resultsView.innerHTML = getResultMarkup(message);
                }
            }
            break;
        case 'summary':
            let summaryHtml = '<h3>Test Summary</h3><div class="summary-grid">';
            for (const [status, count] of Object.entries(message.results)) {
                summaryHtml += `<div class="summary-item">
                                            <span class="summary-status">${status}</span>
                                            <span class="summary-count">${count}</span>
                                       </div>`;
            }
            summaryHtml += '</div>';
            summaryView.innerHTML = summaryHtml;
            if (isReRunning) {
                resultsView.innerHTML = '';
                resetRerunState();
            }
            break;
        case 'show-runs':
            resultsView.innerHTML = '';
            testCasesView.innerHTML = '';
            let runsHtml = '<h3>Past Runs:</h3>';
            if (message.runs.length === 0) {
                runsHtml += '<p>No runs found for this solution.</p>';
            } else {
                message.runs.forEach(runId => {
                    runsHtml += `<div class="run-item" data-run-id="${runId}">${runId}</div>`;
                });
            }
            runsView.innerHTML = runsHtml;
            document.querySelectorAll('.run-item').forEach(item => {
                item.addEventListener('click', event => {
                    const runId = event.target.getAttribute('data-run-id');
                    vscode.postMessage({ command: 'get-test-cases', runId: runId });
                });
            });
            break;
        case 'show-test-cases':
            let testCasesHtml = `<h3>Test Cases for Run: ${message.runId}</h3>`;
            if (message.testCases.length === 0) {
                testCasesHtml += '<p>No test cases found for this run.</p>';
            } else {
                message.testCases.forEach(tc => {
                    const testCaseData = encodeURIComponent(JSON.stringify(tc));
                    const isChecked = selectedTestsByRun[message.runId]?.some(selectedTc => selectedTc.testCase === tc.testCase);
                    testCasesHtml += `<div class="test-case-item" id="test-case-item-${message.runId}-${tc.testCase}">
                        <p>
                            <input 
                                type="checkbox" 
                                class="test-case-checkbox" 
                                data-test-case='${testCaseData}'
                                data-run-id="${message.runId}"
                                ${isChecked ? 'checked' : ''}
                            >
                            <strong>Test Case #${tc.testCase}</strong>
                        </p>
                        <div class="test-case-details">
                            ${getTestCaseDetailsHtml(tc)}
                        </div>
                    </div>`;
                });
            }
            testCasesView.innerHTML = testCasesHtml;
            break;
    }
});

vscode.postMessage({ command: 'webview-ready' });
