// Initialize VS Code API
const vscode = acquireVsCodeApi();

// Search functionality
window.addEventListener('load', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const cards = document.querySelectorAll('.card');
            cards.forEach(card => {
                const label = card.querySelector('.heads')?.textContent?.toLowerCase() || '';
                const description = card.querySelector('.top pre')?.textContent?.toLowerCase() || '';
                const isVisible = label.includes(searchTerm) || description.includes(searchTerm);
                card.style.display = isVisible ? '' : 'none';
            });
        });
    }
});
 

const enterIDButton = document.getElementById('enterId');
const modal = document.getElementById('popup-modal');
const overlay = document.getElementById('overlay');
const submitButton = document.getElementById('submit-button');
const closeButton = document.getElementById('close-button');
const responseText = document.getElementById('response-text');
const inputBox = document.getElementById('input-box');
const loader = document.getElementById('spinner');


enterIDButton.addEventListener('click', () => {
    modal.classList.add('show');
    overlay.style.display = 'block';
    responseText.textContent = '';
    inputBox.disabled = false;
    submitButton.style.display = 'inline-block';
    closeButton.textContent = 'Close';
    loader.style.display = 'none'; // Ensure spinner is hidden initially
});

closeButton.addEventListener('click', () => {
    modal.classList.remove('show');
    overlay.style.display = 'none';
    responseText.textContent = '';
});

overlay.addEventListener('click', () => {
    modal.classList.remove('show');
    overlay.style.display = 'none';
    responseText.textContent = '';
});

function copyToClipboard(text, index, mode){
    let id = '';
    let copymsg = '';
    if(mode === "code"){
        copymsg = "Copied Code Snippet to Clipboard!";
    }else{
        copymsg = "Copied Github GistId to Clipboard!"
    }
    if(text){
        navigator.clipboard.writeText(text);
        if(document.getElementById(`tooltip-${index}`).style.visibility === '' || document.getElementById(`tooltip-${index}`).style.visibility === 'hidden'){
            document.getElementById(`tooltip-${index}`).innerText = copymsg;
            document.getElementById(`tooltip-${index}`).style.visibility = 'visible';
            setTimeout(() => document.getElementById(`tooltip-${index}`).style.visibility = 'hidden', 1000);
        }
    }
}

submitButton.addEventListener('click', async () => { 
    try {
        
        const gistID = inputBox.value;
        // console.log('clicked');
        if (gistID.trim()) {
            let apiUrl = 'https://api.github.com/gists/' + gistID;

            loader.style.display = 'block'; // Show spinner
            modal.classList.remove('show');
            overlay.style.display = 'none';

            await vscode.postMessage({
                        command: 'createSnippets',
                        apiUrl
            });

            // Disable the input field after submission
            inputBox.disabled = true;

            // Hide the submit button and change the close button text
            submitButton.style.display = 'none';
            closeButton.textContent = 'Close';

        } 
        else {
            responseText.textContent = 'Please enter a valid gist ID.';
        }
        
    } catch (error) {
        responseText.textContent = 'Error : ' + (error.message || 'Unknown error');
    }
    
});

// Handle messages from backend
window.addEventListener('message', (event) => {
    const message = event.data;
    if (message.command === 'operationComplete') {
        loader.style.display = 'none'; // Hide spinner
        modal.style.display = 'none';
        overlay.style.display = 'none';
        alert('Operation completed successfully!');
    } else if (message.command === 'operationError') {
        loader.style.display = 'none'; // Hide spinner on error
        responseText.textContent = `Error: ${message.error}`;
    }
});

