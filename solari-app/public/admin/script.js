class AdminPanel {
    constructor() {
        this.messages = [];
        this.settings = {};
        this.editingMessageId = null;
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadMessages();
        
        // Add enter key listener for new message input
        document.getElementById('newMessageText').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addMessage();
            }
        });
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            this.settings = await response.json();
            
            // Update UI
            document.getElementById('rotationInterval').value = this.settings.rotationInterval / 1000;
        } catch (error) {
            this.showToast('Error loading settings', 'error');
            console.error(error);
        }
    }

    async loadMessages() {
        try {
            const response = await fetch('/api/messages');
            this.messages = await response.json();
            this.renderMessages();
        } catch (error) {
            this.showToast('Error loading messages', 'error');
            console.error(error);
        }
    }

    renderMessages() {
        const container = document.getElementById('messagesList');
        
        if (this.messages.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <p>No messages yet. Add your first message above!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.messages.map(msg => `
            <div class="message-item ${msg.enabled ? '' : 'disabled'}" data-id="${msg.id}">
                <div class="message-header">
                    <span class="message-id">ID: ${msg.id}</span>
                    <span class="message-status ${msg.enabled ? 'enabled' : 'disabled'}">
                        ${msg.enabled ? '✓ Enabled' : '✗ Disabled'}
                    </span>
                </div>
                
                ${this.editingMessageId === msg.id ? `
                    <div class="message-text">
                        <input 
                            type="text" 
                            id="edit-${msg.id}" 
                            value="${this.escapeHtml(msg.text)}"
                            onkeypress="if(event.key === 'Enter') admin.saveEdit(${msg.id})"
                        >
                    </div>
                ` : `
                    <div class="message-text">${this.escapeHtml(msg.text)}</div>
                `}
                
                <div class="message-actions">
                    ${this.editingMessageId === msg.id ? `
                        <button class="btn btn-success" onclick="admin.saveEdit(${msg.id})">
                            💾 Save
                        </button>
                        <button class="btn btn-secondary" onclick="admin.cancelEdit()">
                            ✕ Cancel
                        </button>
                    ` : `
                        <button class="btn btn-primary" onclick="admin.editMessage(${msg.id})">
                            ✏️ Edit
                        </button>
                        <button class="btn btn-secondary" onclick="admin.toggleMessage(${msg.id})">
                            ${msg.enabled ? '👁️ Disable' : '👁️ Enable'}
                        </button>
                        <button class="btn btn-danger" onclick="admin.deleteMessage(${msg.id})">
                            🗑️ Delete
                        </button>
                    `}
                </div>
            </div>
        `).join('');
    }

    async addMessage() {
        const input = document.getElementById('newMessageText');
        const text = input.value.trim();

        if (!text) {
            this.showToast('Please enter a message', 'error');
            return;
        }

        try {
            const response = await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, enabled: true })
            });

            if (response.ok) {
                input.value = '';
                await this.loadMessages();
                this.showToast('Message added successfully!', 'success');
            } else {
                throw new Error('Failed to add message');
            }
        } catch (error) {
            this.showToast('Error adding message', 'error');
            console.error(error);
        }
    }

    editMessage(id) {
        this.editingMessageId = id;
        this.renderMessages();
        
        // Focus the input
        setTimeout(() => {
            const input = document.getElementById(`edit-${id}`);
            if (input) {
                input.focus();
                input.select();
            }
        }, 0);
    }

    async saveEdit(id) {
        const input = document.getElementById(`edit-${id}`);
        const text = input.value.trim();

        if (!text) {
            this.showToast('Message cannot be empty', 'error');
            return;
        }

        try {
            const response = await fetch(`/api/messages/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });

            if (response.ok) {
                this.editingMessageId = null;
                await this.loadMessages();
                this.showToast('Message updated!', 'success');
            } else {
                throw new Error('Failed to update message');
            }
        } catch (error) {
            this.showToast('Error updating message', 'error');
            console.error(error);
        }
    }

    cancelEdit() {
        this.editingMessageId = null;
        this.renderMessages();
    }

    async toggleMessage(id) {
        const message = this.messages.find(m => m.id === id);
        if (!message) return;

        try {
            const response = await fetch(`/api/messages/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !message.enabled })
            });

            if (response.ok) {
                await this.loadMessages();
                this.showToast(`Message ${message.enabled ? 'disabled' : 'enabled'}!`, 'success');
            } else {
                throw new Error('Failed to toggle message');
            }
        } catch (error) {
            this.showToast('Error toggling message', 'error');
            console.error(error);
        }
    }

    async deleteMessage(id) {
        if (!confirm('Are you sure you want to delete this message?')) {
            return;
        }

        try {
            const response = await fetch(`/api/messages/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadMessages();
                this.showToast('Message deleted!', 'success');
            } else {
                throw new Error('Failed to delete message');
            }
        } catch (error) {
            this.showToast('Error deleting message', 'error');
            console.error(error);
        }
    }

    async updateSettings() {
        const interval = document.getElementById('rotationInterval').value;
        const intervalMs = Math.max(1, parseInt(interval)) * 1000;

        try {
            const response = await fetch('/api/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rotationInterval: intervalMs })
            });

            if (response.ok) {
                await this.loadSettings();
                this.showToast('Settings updated!', 'success');
            } else {
                throw new Error('Failed to update settings');
            }
        } catch (error) {
            this.showToast('Error updating settings', 'error');
            console.error(error);
        }
    }

    async resetRotation() {
        try {
            const response = await fetch('/api/reset-rotation', {
                method: 'POST'
            });

            if (response.ok) {
                this.showToast('Rotation reset to first message!', 'success');
            } else {
                throw new Error('Failed to reset rotation');
            }
        } catch (error) {
            this.showToast('Error resetting rotation', 'error');
            console.error(error);
        }
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize admin panel
const admin = new AdminPanel();
