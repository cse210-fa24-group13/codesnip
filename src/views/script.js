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

// Search functionality
function initializeSearch() {
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
}


// Modal functionality
function initializeModal() {
    const joinRoomButton = document.getElementById('join-room');
    const modal = document.getElementById('popup-modal');
    const overlay = document.getElementById('overlay');
    const submitButton = document.getElementById('submit-button');
    const closeButton = document.getElementById('close-button');
    const responseText = document.getElementById('response-text');
    const inputBox = document.getElementById('input-box');

    if (!joinRoomButton || !modal || !overlay || !submitButton || 
        !closeButton || !responseText || !inputBox) {
        return;
    }

    joinRoomButton.addEventListener('click', () => {
        modal.classList.add('show');
        overlay.style.display = 'block';
        responseText.textContent = '';
        inputBox.disabled = false;
        submitButton.style.display = 'inline-block';
        closeButton.textContent = 'Close';
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

    submitButton.addEventListener('click', async () => {
        const roomCode = inputBox.value;
        if (roomCode.trim()) {
            try {
                let url = 'https://api.github.com/gists/' + roomCode;
                let gistInfo = await axios.get(url, {
                    headers: { Authorization: 'Bearer' }
                });

                responseText.textContent = 'You have joined the room with code: ' + gistInfo.data.description;

                for (const fileName in gistInfo.data.files) {
                    await vscode.postMessage({
                        command: 'createSnippet',
                        fileName: fileName,
                        content: gistInfo.data.files[fileName].content,
                        description: gistInfo.data.description,
                        visibility: 'Public',
                    });
                }

                // Refresh snippets after creation
                vscode.postMessage({
                    command: 'fetch'
                });

                inputBox.disabled = true;
                submitButton.style.display = 'none';
                closeButton.textContent = 'Close';

                setTimeout(() => {
                    modal.classList.remove('show');
                    overlay.style.display = 'none';
                }, 3000);
            } catch (error) {
                responseText.textContent = 'Error joining room: ' + (error.message || 'Unknown error');
            }
        } else {
            responseText.textContent = 'Please enter a valid room code.';
        }
    });
}

// Initialize when DOM is ready
window.addEventListener('load', () => {
    initializeSearch();
    initializeModal();
});
