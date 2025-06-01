import { window} from 'vscode';

document.getElementById('clickButton').addEventListener('click', function () {
    window.showInformationMessage('Button was clicked!');
    console.log('Button was clicked!');
});
