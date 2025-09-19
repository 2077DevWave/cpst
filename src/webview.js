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

function getIconForStatus(status) {
    const iconProps = `width="20" height="20" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" fill="currentColor"`;
    let iconPath;

    switch (status.toLowerCase().replace(/\s/g, '')) {
        case 'accepted':
        case 'passed':
            iconPath = `<path d="M14.43 3.335L6.43 11.335L2.57 7.475L1.5 8.545L6.43 13.475L15.5 4.405L14.43 3.335Z"/>`;
            break;
        case 'wronganswer':
            iconPath = `<path d="M10.121 8l3.536-3.536-1.06-1.06L9.06 6.939 5.525 3.404l-1.061 1.06L7.999 8l-3.535 3.536 1.06 1.06L9.06 9.061l3.535 3.535 1.061-1.06L10.12 8z"/>`;
            break;
        case 'timelimitexceeded':
            iconPath = `<path fill-rule="evenodd" clip-rule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8.5-4.85v5.2l4.02 2.41l-.74 1.23l-4.78-2.86V3.15h1.5z"/>`;
            break;
        case 'runtimeerror':
            iconPath = `<path d="M14.5 9H13v2H3V9H1.5l-.5.5v3l.5.5H3v2h1.5v-2h7v2H13v-2h1.5l.5-.5v-3l-.5-.5zM12 2l-.5-.5h-7l-.5.5V3h8V2zM3 4v4h1.5V4H3zm8.5 0v4H13V4h-1.5z"/><path d="M4.5 4H6v4H4.5V4zM7 4h2v1H7V4zm0 2h2v1H7V6zm0 2h2v1H7V8zm3-4h1.5v4H10V4z"/>`;
            break;
        case 'memorylimitexceeded':
            iconPath = `<path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h9A1.5 1.5 0 0 1 14 2.5v2A1.5 1.5 0 0 1 12.5 6H11v1.5A1.5 1.5 0 0 1 9.5 9h-3A1.5 1.5 0 0 1 5 7.5V6H3.5A1.5 1.5 0 0 1 2 4.5v-2zM3.5 2a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5H5V2H3.5zM6 2v4h4V2H6zm5 0v4h1.5a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5H11zM8 3.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0zM2 11.5a1.5 1.5 0 0 1 1.5-1.5h9a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 1 12.5 15H3.5A1.5 1.5 0 0 1 2 13.5v-2zm1.5-.5a.5.5 0 0 0-.5.5v2a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5v-2a.5.5 0 0 0-.5-.5h-9zM8 12.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z"/>`;
            break;
        default:
            iconPath = `<path fill-rule="evenodd" clip-rule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-3.5a1.5 1.5 0 0 0-1.5 1.5v.253a.25.25 0 0 1-.5 0V6A2.5 2.5 0 0 1 10.5 6c0 .82-.336 1.396-.75 1.822-.42.43-.854.81-1.055 1.11a.25.25 0 0 1-.445-.22c.18-.26.58-.6.97-1.002.41-.42.83-.9.83-1.71a1.5 1.5 0 0 0-3 0zm-1 6a1 1 0 1 1 2 0 1 1 0 0 1-2 0z"/>`;
    }
    return `<div class="summary-icon"><svg ${iconProps}>${iconPath}</svg></div>`;
}

function getStatusClass(status) {
    switch (status.toLowerCase().replace(/\s/g, '')) {
        case 'accepted':
        case 'passed':
            return 'status-success';
        case 'wronganswer':
        case 'runtimeerror':
            return 'status-error';
        case 'timelimitexceeded':
        case 'memorylimitexceeded':
            return 'status-warning';
        default:
            return 'status-info';
    }
}

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
    if (rerunTotalCount === 0) {return;}

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
            let summaryHtml = '<div class="summary-grid">';
            for (const [status, count] of Object.entries(message.results)) {
                const statusClass = getStatusClass(status);
                summaryHtml += `<div class="summary-item ${statusClass}" title="${status}">
                                    ${getIconForStatus(status)}
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
