// Using vanilla Global Script since ES6 modules cause CORS in local file://
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveKeyBtn = document.getElementById('saveKeyBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const apiKeyModal = document.getElementById('apiKeyModal');
    const keyStatusIndicator = document.getElementById('keyStatusIndicator');
    
    const userInput = document.getElementById('userInput');
    const submitBtn = document.getElementById('submitBtn');
    const recordBtn = document.getElementById('recordBtn');
    const recordingStatus = document.getElementById('recordingStatus');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const chatMessages = document.getElementById('chatMessages');
    const clearChatBtn = document.getElementById('clearChatBtn');

    // App State
    let apiKey = localStorage.getItem('engfluence_api_key') || '';
    let globalAudioPlayer = null;
    
    // Initialize
    updateKeyStatus();
    if (!apiKey) {
        apiKeyModal.classList.remove('hidden');
    }

    // Event Listeners
    settingsBtn.addEventListener('click', () => apiKeyModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => apiKeyModal.classList.add('hidden'));
    
    saveKeyBtn.addEventListener('click', () => {
        apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            localStorage.setItem('engfluence_api_key', apiKey);
            updateKeyStatus();
            apiKeyModal.classList.add('hidden');
        } else {
            alert('Por favor, insira uma chave válida.');
        }
    });

    submitBtn.addEventListener('click', processInput);
    
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            processInput();
        }
    });

    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });

    clearChatBtn.addEventListener('click', () => {
        // Keep only first welcome message
        const messages = Array.from(chatMessages.children);
        for (let i = 1; i < messages.length; i++) {
            chatMessages.removeChild(messages[i]);
        }
    });

    // Speech Recognition Setup
    let recognition;
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        
        let finalTranscript = '';

        recognition.onstart = function() {
            recordBtn.classList.add('recording');
            recordingStatus.classList.remove('hidden');
            finalTranscript = '';
            userInput.value = '';
        };

        recognition.onresult = function(event) {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            userInput.value = finalTranscript + interimTranscript;
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            stopRecordingUI();
            if (event.error === 'not-allowed') {
                alert('Acesso ao microfone bloqueado.');
            }
        };

        recognition.onend = function() {
            stopRecordingUI();
            if (userInput.value.trim() !== "") {
                processInput();
            }
        };

        let isRecording = false;
        recordBtn.addEventListener('click', () => {
            if (isRecording) {
                recognition.stop();
            } else {
                recognition.start();
                isRecording = true;
            }
        });

        function stopRecordingUI() {
            isRecording = false;
            recordBtn.classList.remove('recording');
            recordingStatus.classList.add('hidden');
        }
    } else {
        recordBtn.style.display = 'none';
        console.warn("Speech Recognition API not supported in this browser.");
    }

    // TTS Global Function (attached to window to work on dynamically generated buttons)
    window.playAudioTTS = function(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop current playing
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Seu navegador não suporta leitura de texto (TTS).");
        }
    };

    function updateKeyStatus() {
        if (apiKey) {
            keyStatusIndicator.classList.remove('red');
            keyStatusIndicator.classList.add('green');
            apiKeyInput.value = apiKey;
        } else {
            keyStatusIndicator.classList.add('red');
            keyStatusIndicator.classList.remove('green');
        }
    }

    function appendUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'message user-message';
        div.innerHTML = `
            <div class="avatar"><i data-lucide="user"></i></div>
            <div class="message-content">${text}</div>
        `;
        chatMessages.appendChild(div);
        lucide.createIcons();
        scrollToBottom();
    }

    function appendAIMessageWithCorrection(aiResponse) {
        const div = document.createElement('div');
        div.className = 'message ai-message';
        
        let extraCards = '';
        if (aiResponse.correctedText) {
            const btnId = 'ttsBtn_' + Date.now();
            extraCards = `
                <div class="correction-card">
                    <div class="correction-header">
                        <span>${aiResponse.isCorrect ? '✅ Frase Correta' : '🔧 Correção Encontrada'}</span>
                        <button class="icon-btn play-correction-btn" onclick="window.playAudioTTS('${aiResponse.correctedText.replace(/'/g, "\\'")}')" title="Ouvir Frase">
                            <i data-lucide="volume-2"></i>
                        </button>
                    </div>
                    <div class="correction-text">${aiResponse.correctedText}</div>
                    ${!aiResponse.isCorrect ? `<div class="correction-explanation">${aiResponse.explanation}</div>` : ''}
                    <div class="correction-badges">
                        <span class="badge badge-purple">${aiResponse.errorLevel}</span>
                        <span class="badge badge-orange">${aiResponse.studyRecommendation}</span>
                    </div>
                </div>
            `;
        }

        div.innerHTML = `
            <div class="avatar"><i data-lucide="bot"></i></div>
            <div class="message-content glass-panel">
                <p>${aiResponse.chatReply}</p>
                ${extraCards}
            </div>
        `;
        
        chatMessages.appendChild(div);
        lucide.createIcons();
        scrollToBottom();

        // Update global sidebar badge if returned
        if (aiResponse.userLevel && aiResponse.userLevel !== "N/A") {
            const badge = document.getElementById('globalLevelBadge');
            if (badge) badge.textContent = aiResponse.userLevel;
        }
    }

    function scrollToBottom() {
        chatMessages.scrollTo({
            top: chatMessages.scrollHeight,
            behavior: 'smooth'
        });
    }

    async function processInput() {
        const text = userInput.value.trim();
        if (!text) return;
        
        if (!apiKey) {
            apiKeyModal.classList.remove('hidden');
            return;
        }

        appendUserMessage(text);
        userInput.value = '';
        userInput.style.height = 'auto';
        
        loadingIndicator.classList.remove('hidden');
        scrollToBottom();

        try {
            const systemPrompt = typeof EngFluenceCurriculum !== 'undefined' ? EngFluenceCurriculum.generateSystemPrompt() : generateSystemPrompt(); // Fallback
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: text }
                    ],
                    response_format: { type: "json_object" },
                    temperature: 0.3
                })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error?.message || "Erro na API da OpenAI.");
            }

            const data = await response.json();
            const aiResponse = JSON.parse(data.choices[0].message.content);
            
            loadingIndicator.classList.add('hidden');
            appendAIMessageWithCorrection(aiResponse);
            
            // Auto-play the text in English!
            if (aiResponse.correctedText) {
                window.playAudioTTS(aiResponse.correctedText);
            }

        } catch (error) {
            console.error(error);
            loadingIndicator.classList.add('hidden');
            
            const errDiv = document.createElement('div');
            errDiv.className = 'message ai-message';
            errDiv.innerHTML = `
                <div class="avatar"><i data-lucide="bot"></i></div>
                <div class="message-content glass-panel" style="color: #ef4444;">
                    Erro: ${error.message}
                </div>
            `;
            chatMessages.appendChild(errDiv);
            lucide.createIcons();
            scrollToBottom();
        }
    }
});
