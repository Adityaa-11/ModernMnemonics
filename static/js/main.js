// MnemonicGenerator class to handle OpenAI API interactions
class MnemonicGenerator {
    constructor() {
        this.savedMnemonics = this.loadSavedMnemonics();
        this.currentMode = 'brainrot';
        this.currentVoice = 'a';
        this.currentVideo = '';
        this.currentSong = 'pop';
        this.currentCharacter = 'friendly';
        this.chatHistory = [];
        this.apiKey = localStorage.getItem('openai_api_key') || '';
    }

    setApiKey(key) {
        this.apiKey = key;
        localStorage.setItem('openai_api_key', key);
    }

    async generateMnemonic(word) {
        switch(this.currentMode) {
            case 'brainrot':
                return this.generateBrainrotMnemonic(word);
            case 'song':
                return this.generateSongMnemonic(word);
            case 'chatbot':
                return this.initiateChatbotConversation(word);
            default:
                return this.generateBrainrotMnemonic(word);
        }
    }

    async generateBrainrotMnemonic(word) {
        const response = await this.callOpenAI([
            {
                role: "system",
                content: "You are a creative assistant that creates fun, engaging, and internet-culture inspired video scripts. Make it trendy and memorable."
            },
            {
                role: "user",
                content: `Create a short, engaging video script for learning about: ${word}. Use internet culture, memes, and trending formats to make it memorable.`
            }
        ]);
        return response;
    }

    async generateSongMnemonic(word) {
        const response = await this.callOpenAI([
            {
                role: "system",
                content: `You are a musical composer creating educational songs in ${this.currentSong} style.`
            },
            {
                role: "user",
                content: `Create memorable ${this.currentSong} style song lyrics about: ${word}. Make it catchy and educational.`
            }
        ]);
        return response;
    }

    async initiateChatbotConversation(word) {
        const characterPrompt = this.getCharacterPrompt();
        const initialMessage = await this.callOpenAI([
            {
                role: "system",
                content: characterPrompt
            },
            {
                role: "user",
                content: `I want to learn about: ${word}. Can you help me understand it better?`
            }
        ]);
        
        this.chatHistory = [
            { role: 'system', content: `Character: ${this.currentCharacter}` },
            { role: 'bot', content: initialMessage }
        ];
        
        return initialMessage;
    }

    async sendChatMessage(message) {
        this.chatHistory.push({ role: 'user', content: message });
        
        const response = await this.callOpenAI([
            {
                role: "system",
                content: this.getCharacterPrompt()
            },
            ...this.chatHistory.map(msg => ({
                role: msg.role === 'bot' ? 'assistant' : msg.role,
                content: msg.content
            }))
        ]);
        
        this.chatHistory.push({ role: 'bot', content: response });
        return response;
    }

    async callOpenAI(messages) {
        if (!this.apiKey) {
            throw new Error('Please enter your OpenAI API key first');
        }

        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: messages,
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `API request failed: ${response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    loadSavedMnemonics() {
        const saved = localStorage.getItem('savedMnemonics');
        return saved ? JSON.parse(saved) : [];
    }

    saveMnemonic(word, mnemonic) {
        const mnemonicData = {
            word,
            mnemonic,
            date: new Date().toISOString(),
            mode: this.currentMode,
            options: this.getCurrentModeOptions()
        };

        this.savedMnemonics.push(mnemonicData);
        localStorage.setItem('savedMnemonics', JSON.stringify(this.savedMnemonics));
    }

    getCurrentModeOptions() {
        switch(this.currentMode) {
            case 'brainrot':
                return { voice: this.currentVoice, video: this.currentVideo };
            case 'song':
                return { style: this.currentSong };
            case 'chatbot':
                return { character: this.currentCharacter };
            default:
                return {};
        }
    }

    getCharacterPrompt() {
        const prompts = {
            'naruto': "You are Naruto Uzumaki, the energetic ninja who never gives up! Respond with enthusiasm, use 'dattebayo' occasionally, and reference your ninja way and experiences. Help others learn while maintaining your determined and optimistic personality. Use ninja analogies when explaining concepts.",
            'lebron': "You are LeBron James, one of the greatest basketball players of all time. Share your knowledge while drawing parallels to basketball and your career experiences. Be motivational, professional, and occasionally reference your championships and career achievements. Use sports analogies to explain concepts.",
            'batman': "You are Batman, the world's greatest detective and protector of Gotham City. Respond in a deep, serious tone while drawing from your vast knowledge and experience. Use analogies related to crime-solving, justice, and your gadgets to explain concepts. Occasionally reference your experiences in Gotham."
        };
        return prompts[this.currentCharacter] || prompts['naruto'];
    }
}

// DOM interaction code
document.addEventListener('DOMContentLoaded', () => {
    const generator = new MnemonicGenerator();
    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const wordInput = document.getElementById('wordInput');
    const generateBtn = document.getElementById('generateBtn');
    const saveBtn = document.getElementById('saveBtn');
    const resultDiv = document.getElementById('result');
    const loadingSpinner = document.getElementById('loading');
    const savedList = document.getElementById('savedList');
    const chatInterface = document.getElementById('chatInterface');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessage');
    const modeButtons = document.querySelectorAll('.mode-btn');

    function showModeOptions(mode) {
        // Hide all mode options and chat interface
        document.querySelectorAll('.mode-options').forEach(option => {
            option.style.display = 'none';
        });
        chatInterface.style.display = 'none';
        resultDiv.style.display = 'block';
        
        // Show the options for the selected mode
        const optionsToShow = document.getElementById(`${mode}Options`);
        if (optionsToShow) {
            optionsToShow.style.display = 'block';
        }
    }

    function addChatMessage(message, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user-message' : 'bot-message'}`;
        messageDiv.textContent = message;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // API Key handling
    if (generator.apiKey) {
        apiKeyInput.value = generator.apiKey;
    }

    saveApiKeyBtn.addEventListener('click', () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            generator.setApiKey(key);
            alert('API Key saved successfully!');
        } else {
            alert('Please enter an API key');
        }
    });

    // Mode selection
    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            generator.currentMode = btn.dataset.mode;
            showModeOptions(btn.dataset.mode);
        });
    });

    // Chat interface handlers
    sendMessageBtn.addEventListener('click', async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        addChatMessage(message, true);
        chatInput.value = '';
        
        try {
            const response = await generator.sendChatMessage(message);
            addChatMessage(response);
        } catch (error) {
            addChatMessage('Error: Could not send message. Please try again.');
        }
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessageBtn.click();
        }
    });

    generateBtn.addEventListener('click', async () => {
        const word = wordInput.value.trim();
        if (!word) {
            alert('Please enter a word');
            return;
        }

        if (!generator.apiKey) {
            alert('Please enter your OpenAI API key first');
            return;
        }

        try {
            loadingSpinner.style.display = 'block';
            generateBtn.disabled = true;
            
            const response = await generator.generateMnemonic(word);
            
            if (generator.currentMode === 'chatbot') {
                // Show chat interface for chatbot mode
                resultDiv.style.display = 'none';
                chatInterface.style.display = 'block';
                chatMessages.innerHTML = '';
                addChatMessage(response);
            } else {
                // Show regular result for other modes
                resultDiv.innerHTML = `<p class="mnemonic">${response}</p>`;
                saveBtn.style.display = 'block';
            }
        } catch (error) {
            resultDiv.innerHTML = `<p class="error">Error: ${error.message}</p>`;
            if (error.message.includes('API key')) {
                apiKeyInput.focus();
            }
        } finally {
            loadingSpinner.style.display = 'none';
            generateBtn.disabled = false;
        }
    });

    saveBtn.addEventListener('click', () => {
        const word = wordInput.value.trim();
        const mnemonic = resultDiv.querySelector('.mnemonic')?.textContent;
        
        if (mnemonic) {
            try {
                generator.saveMnemonic(word, mnemonic);
                updateSavedList();
                alert('Mnemonic saved successfully!');
            } catch (error) {
                alert(`Error saving mnemonic: ${error.message}`);
            }
        }
    });

    function updateSavedList() {
        const mnemonics = generator.savedMnemonics;
        savedList.innerHTML = mnemonics.map(item => {
            let details = `Mode: ${item.mode}`;
            
            if (item.options) {
                switch(item.mode) {
                    case 'brainrot':
                        details += ` | Voice: ${item.options.voice}`;
                        if (item.options.video) details += ` | Video: ${item.options.video}`;
                        break;
                    case 'song':
                        details += ` | Style: ${item.options.style}`;
                        break;
                    case 'chatbot':
                        details += ` | Character: ${item.options.character}`;
                        break;
                }
            }

            return `
                <div class="saved-item">
                    <h3>${item.word}</h3>
                    <p>${item.mnemonic}</p>
                    <small>
                        Created: ${new Date(item.date).toLocaleDateString()} | 
                        ${details}
                    </small>
                </div>
            `;
        }).join('');
    }

    // Video box initialization and handlers
    const videoBoxes = document.querySelectorAll('.video-box');
    videoBoxes.forEach(box => {
        const video = box.querySelector('video');
        if (video) {
            // Set initial frame
            video.currentTime = 0;
            
            // Play on hover
            box.addEventListener('mouseenter', () => {
                video.play();
            });
            
            // Pause and reset on mouse leave
            box.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
            });
        }

        // Handle selection
        box.addEventListener('click', () => {
            if (box.dataset.video) {
                videoBoxes.forEach(b => b.classList.remove('active'));
                box.classList.add('active');
                generator.currentVideo = box.dataset.video;
            }
        });
    });

    // Initialize
    const initialMode = 'brainrot';
    document.querySelector(`[data-mode="${initialMode}"]`).classList.add('active');
    showModeOptions(initialMode);
    updateSavedList();
});
const characterDropdown = document.getElementById('character');
const chatInterface = document.getElementById('chatInterface');
const characterImage = document.querySelector('.character-image');

// Map characters to their respective assets
const characterAssets = {
    naruto: {
        background: 'static/images/naruto-background.jpg',
        image: 'static/images/naruto-character.png'
    },
    lebron: {
        background: 'static/images/lebron-background.jpg',
        image: 'static/images/lebron-character.png'
    },
    batman: {
        background: 'static/images/batman-background.jpg',
        image: 'static/images/batman-character.png'
    }
};

// Update background and character image when a new character is selected
characterDropdown.addEventListener('change', () => {
    const selectedCharacter = characterDropdown.value;
    const assets = characterAssets[selectedCharacter];

    if (assets) {
        chatInterface.style.backgroundImage = `url('${assets.background}')`;
        characterImage.src = assets.image;
        characterImage.alt = selectedCharacter;
    } else {
        // Fallback
        chatInterface.style.backgroundImage = 'none';
        characterImage.src = '';
        characterImage.alt = '';
    }
});

