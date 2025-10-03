class SolariBoard {
    constructor() {
        this.currentMessage = '';
        this.rotationInterval = 10000;
        this.messageDisplay = document.getElementById('messageDisplay');
        this.clockElement = document.getElementById('clock');
        this.characters = [];
        this.rotationTimer = null;
        
        this.init();
    }
    
    init() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
        this.loadAndDisplayMessage();
    }
    
    updateClock() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        this.clockElement.textContent = `${hours}:${minutes}:${seconds}`;
    }
    
    async loadAndDisplayMessage() {
        try {
            const response = await fetch('/api/current-message');
            const data = await response.json();
            
            this.rotationInterval = data.rotationInterval || 10000;
            this.displayMessage(data.text || 'NO MESSAGE');
            
            // Set up rotation
            if (this.rotationTimer) {
                clearTimeout(this.rotationTimer);
            }
            this.rotationTimer = setTimeout(() => this.rotateToNextMessage(), this.rotationInterval);
            
        } catch (error) {
            console.error('Error loading message:', error);
            this.displayMessage('CONNECTION ERROR');
        }
    }
    
    async rotateToNextMessage() {
        try {
            // Tell server to rotate to next message
            await fetch('/api/next-message', { method: 'POST' });
            // Load and display the new message
            this.loadAndDisplayMessage();
        } catch (error) {
            console.error('Error rotating message:', error);
            // Try again in a few seconds
            setTimeout(() => this.rotateToNextMessage(), 5000);
        }
    }
    
    displayMessage(message) {
        if (message === this.currentMessage) {
            return; // No change needed
        }
        
        const newMessage = message.toUpperCase().padEnd(this.currentMessage.length, ' ');
        this.currentMessage = message.toUpperCase();
        
        // If display is empty, create all characters
        if (this.characters.length === 0) {
            this.createCharacters(this.currentMessage);
        } else {
            this.updateCharacters(newMessage);
        }
    }
    
    createCharacters(message) {
        this.messageDisplay.innerHTML = '';
        this.characters = [];
        
        for (let i = 0; i < message.length; i++) {
            const char = message[i];
            const flapContainer = this.createFlapElement(char);
            this.messageDisplay.appendChild(flapContainer);
            this.characters.push({
                element: flapContainer,
                char: char
            });
        }
    }
    
    updateCharacters(newMessage) {
        // Adjust character count if needed
        while (this.characters.length < newMessage.length) {
            const flapContainer = this.createFlapElement(' ');
            this.messageDisplay.appendChild(flapContainer);
            this.characters.push({
                element: flapContainer,
                char: ' '
            });
        }
        
        // Update each character with a staggered animation
        for (let i = 0; i < newMessage.length; i++) {
            const newChar = newMessage[i];
            const oldChar = this.characters[i].char;
            
            if (newChar !== oldChar) {
                setTimeout(() => {
                    this.flipCharacter(i, newChar);
                }, i * 50); // Stagger by 50ms per character
            }
        }
        
        // Remove excess characters
        while (this.characters.length > newMessage.length) {
            const removed = this.characters.pop();
            removed.element.remove();
        }
    }
    
    flipCharacter(index, newChar) {
        const characterObj = this.characters[index];
        const flapElement = characterObj.element.querySelector('.flap');
        const topHalf = characterObj.element.querySelector('.flap-half.top span');
        const bottomHalf = characterObj.element.querySelector('.flap-half.bottom span');
        
        // Add flipping animation
        flapElement.classList.add('flipping');
        
        // Update character after animation starts
        setTimeout(() => {
            topHalf.textContent = newChar;
            bottomHalf.textContent = newChar;
            characterObj.char = newChar;
            
            // Update space class
            if (newChar === ' ') {
                characterObj.element.classList.add('space');
            } else {
                characterObj.element.classList.remove('space');
            }
        }, 300);
        
        // Remove animation class
        setTimeout(() => {
            flapElement.classList.remove('flipping');
        }, 600);
    }
    
    createFlapElement(char) {
        const container = document.createElement('div');
        container.className = 'flap-container';
        if (char === ' ') {
            container.classList.add('space');
        }
        
        container.innerHTML = `
            <div class="flap">
                <div class="flap-half top">
                    <span>${char}</span>
                </div>
                <div class="flap-half bottom">
                    <span>${char}</span>
                </div>
            </div>
        `;
        
        return container;
    }
}

// Initialize the board when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SolariBoard();
});
