const vscode = acquireVsCodeApi();

const projectDropdown = document.getElementById('project-dropdown');
const selectedProject = document.getElementById('selected-project');

projectDropdown.addEventListener('change', () => {
    selectedProject.textContent = `You selected: ${projectDropdown.value}`;
    vscode.postMessage({ command: 'selectionChanged', value: projectDropdown.value });
});
