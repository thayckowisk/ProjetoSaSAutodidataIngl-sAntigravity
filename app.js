document.addEventListener('DOMContentLoaded', () => {
    
    // --- STATE ---
    let apiKey = localStorage.getItem('engfluence_api_key') || '';
    let gameScore = { correct: 0, wrong: 0 };
    let currentGameState = null;

    // --- DOM Elements ---
    const appLayout = document.getElementById('appLayout');
    const loginScreen = document.getElementById('loginScreen');
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const hamburgerBtns = document.querySelectorAll('.hamburger-btn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    const navChatBtn = document.getElementById('navChatBtn');
    const navGameBtn = document.getElementById('navGameBtn');
    const chatView = document.getElementById('chatView');
    const gameView = document.getElementById('gameView');
    const sidebarInfoText = document.getElementById('sidebarInfoText');

    const settingsBtn = document.getElementById('settingsBtn');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const apiKeyModal = document.getElementById('apiKeyModal');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveKeyBtn = document.getElementById('saveKeyBtn');
    const keyStatusIndicator = document.getElementById('keyStatusIndicator');

    // Chat Elements
    const userInput = document.getElementById('userInput');
    const submitBtn = document.getElementById('submitBtn');
    const recordBtn = document.getElementById('recordBtn');
    const chatMessages = document.getElementById('chatMessages');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // Game Elements
    const gameLevelSelect = document.getElementById('gameLevelSelect');
    const startGameBtn = document.getElementById('startGameBtn');
    const gameStartSect = document.getElementById('gameStartSect');
    const gameRunningContent = document.getElementById('gameRunning');
    const gameLoading = document.getElementById('gameLoading');
    const targetWord = document.getElementById('targetWord');
    const opt1 = document.getElementById('opt1');
    const opt2 = document.getElementById('opt2');
    const gameFeedback = document.getElementById('gameFeedback');
    const feedbackText = document.getElementById('feedbackText');
    const nextRoundBtn = document.getElementById('nextRoundBtn');
    const scoreCorrect = document.getElementById('scoreCorrect');
    const scoreWrong = document.getElementById('scoreWrong');
    const playTargetAudioBtn = document.getElementById('playTargetAudioBtn');

    // --- INIT ---
    if (localStorage.getItem('engfluence_logged_in') === 'true') {
        loginScreen.classList.add('hidden');
        appLayout.classList.remove('hidden');
    }
    updateKeyStatus();
    gameRunningContent.classList.add('hidden'); // hidden initially

    // --- ROUTING / NAV ---
    function switchView(view) {
        if (view === 'chat') {
            chatView.classList.remove('hidden');
            gameView.classList.add('hidden');
            navChatBtn.classList.add('active');
            navGameBtn.classList.remove('active');
            sidebarInfoText.innerHTML = '<i data-lucide="lightbulb" class="info-icon"></i><p>A IA atua como seu professor nativo, identificando seu nível de 1 a 8.</p>';
        } else {
            chatView.classList.add('hidden');
            gameView.classList.remove('hidden');
            navChatBtn.classList.remove('active');
            navGameBtn.classList.add('active');
            sidebarInfoText.innerHTML = '<i data-lucide="gamepad-2" class="info-icon text-orange"></i><p>Neste modo, o LLM gera palavras infinitas dinamicamente baseadas no seu Nível.</p>';
        }
        lucide.createIcons();
        if (window.innerWidth <= 768) toggleSidebar();
    }

    navChatBtn.addEventListener('click', () => switchView('chat'));
    navGameBtn.addEventListener('click', () => switchView('game'));

    function toggleSidebar() {
        sidebar.classList.toggle('open');
        sidebarBackdrop.classList.toggle('hidden');
    }
    hamburgerBtns.forEach(btn => btn.addEventListener('click', toggleSidebar));
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);

    // --- AUTH LOGIN ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        localStorage.setItem('engfluence_logged_in', 'true');
        loginScreen.classList.add('hidden');
        appLayout.classList.remove('hidden');
    });

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('engfluence_logged_in');
            appLayout.classList.add('hidden');
            loginScreen.classList.remove('hidden');
        });
    }

    // --- API SECRETS ---
    settingsBtn.addEventListener('click', () => {
        apiKeyModal.classList.remove('hidden');
        if (window.innerWidth <= 768) sidebar.classList.remove('open');
        sidebarBackdrop.classList.add('hidden');
    });
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

    // --- GAME MODULE ---
    startGameBtn.addEventListener('click', generateGameRound);
    nextRoundBtn.addEventListener('click', generateGameRound);
    
    // Play Audio Target Word
    playTargetAudioBtn.addEventListener('click', () => {
        if (currentGameState && currentGameState.word) window.playAudioTTS(currentGameState.word);
    });

    async function generateGameRound() {
        if (!apiKey) { alert("API Key necessária!"); apiKeyModal.classList.remove('hidden'); return; }

        gameStartSect.classList.add('hidden');
        gameRunningContent.classList.add('hidden');
        gameFeedback.classList.add('hidden');
        gameLoading.classList.remove('hidden');

        // Reset Buttons
        opt1.className = 'game-btn glass-panel';
        opt2.className = 'game-btn glass-panel';
        opt1.disabled = false;
        opt2.disabled = false;

        const level = gameLevelSelect.value;
        const promptParams = `
Como gerador de Quiz, produza um desafio de múltipla escolha para um aluno do "${level}".
Consulte as regras do "${level}" na mente da nossa ementa e gere expressões, verbos modais avançados ou phrasal verbs, não apenas palavras simples.
A resposta DEVE ser um objeto JSON exato com as seguintes chaves sem formatação extra:
{
  "word": "A palavra ou expressão em inglês",
  "correct_trans": "A tradução fiel ao português",
  "wrong_trans": "Uma tradução plausível mas totalmente enganosa em português"
}`;

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [{ role: 'system', content: promptParams }],
                    response_format: { type: "json_object" },
                    temperature: 0.8  // High temp for variety
                })
            });

            if (!response.ok) throw new Error("Erro na API");

            const data = await response.json();
            const roundData = JSON.parse(data.choices[0].message.content);
            currentGameState = roundData;

            // Update UI
            targetWord.textContent = roundData.word;

            // Shuffle Options
            const opts = [
                { text: roundData.correct_trans, isCorrect: true },
                { text: roundData.wrong_trans, isCorrect: false }
            ];
            opts.sort(() => Math.random() - 0.5);

            opt1.textContent = opts[0].text;
            opt1.onclick = () => handleGameAnswer(opt1, opts[0].isCorrect, opt2);
            
            opt2.textContent = opts[1].text;
            opt2.onclick = () => handleGameAnswer(opt2, opts[1].isCorrect, opt1);

            gameLoading.classList.add('hidden');
            gameRunningContent.classList.remove('hidden');

            // Auto Play Word
            window.playAudioTTS(roundData.word);

        } catch (error) {
            console.error(error);
            alert("Erro ao gerar jogo. Tente novamente.");
            gameLoading.classList.add('hidden');
            gameStartSect.classList.remove('hidden');
        }
    }

    function handleGameAnswer(clickedBtn, isCorrect, otherBtn) {
        // Disable both
        clickedBtn.disabled = true;
        otherBtn.disabled = true;

        if (isCorrect) {
            clickedBtn.classList.add('correct');
            feedbackText.textContent = "Excelente! Correto! 🎉";
            feedbackText.className = 'feedback-correct';
            gameScore.correct++;
            scoreCorrect.textContent = gameScore.correct;
            // Add a small celebration TTS or logic here
        } else {
            clickedBtn.classList.add('wrong');
            otherBtn.classList.add('correct'); // Reveal truth
            feedbackText.textContent = `Errou. A correta era: ${currentGameState.correct_trans} 🔴`;
            feedbackText.className = 'feedback-wrong';
            gameScore.wrong++;
            scoreWrong.textContent = gameScore.wrong;
        }

        gameFeedback.classList.remove('hidden');
    }

    // --- TEXT TO SPEECH (TTS) GLOBALS ---
    window.playAudioTTS = function(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        } else {
            alert("Seu navegador não suporta leitura de voz.");
        }
    };

    // --- CHAT MODULE ---
    clearChatBtn.addEventListener('click', () => {
        const messages = Array.from(chatMessages.children);
        for (let i = 1; i < messages.length; i++) chatMessages.removeChild(messages[i]);
    });

    submitBtn.addEventListener('click', processChatInput);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            processChatInput();
        }
    });

    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 100) + 'px';
    });

    async function processChatInput() {
        const text = userInput.value.trim();
        if (!text) return;
        
        if (!apiKey) {
            alert("Acesse as 'Configurações API' no menu para adicionar sua chave OpenAI.");
            return;
        }

        appendUserMessage(text);
        userInput.value = '';
        userInput.style.height = 'auto';
        loadingIndicator.classList.remove('hidden');
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });

        try {
            const systemPrompt = typeof EngFluenceCurriculum !== 'undefined' ? EngFluenceCurriculum.generateSystemPrompt() : generateSystemPrompt();
            
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
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

            if (!response.ok) throw new Error("Erro na API.");
            const data = await response.json();
            const aiResponse = JSON.parse(data.choices[0].message.content);
            
            loadingIndicator.classList.add('hidden');
            appendAIMessageWithCorrection(aiResponse);
            if (aiResponse.correctedText) window.playAudioTTS(aiResponse.correctedText);

        } catch (error) {
            console.error(error);
            loadingIndicator.classList.add('hidden');
            const errDiv = document.createElement('div');
            errDiv.className = 'message ai-message';
            errDiv.innerHTML = `<div class="avatar"><i data-lucide="bot"></i></div><div class="message-content glass-panel" style="color: #ef4444;">Erro: ${error.message}</div>`;
            chatMessages.appendChild(errDiv);
            chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
        }
    }

    function appendUserMessage(text) {
        const div = document.createElement('div');
        div.className = 'message user-message';
        div.innerHTML = `<div class="avatar"><i data-lucide="user"></i></div><div class="message-content">${text}</div>`;
        chatMessages.appendChild(div);
        lucide.createIcons();
    }

    function appendAIMessageWithCorrection(aiResponse) {
        const div = document.createElement('div');
        div.className = 'message ai-message';
        
        let extraCards = '';
        if (aiResponse.correctedText) {
            extraCards = `
                <div class="correction-card">
                    <div class="correction-header">
                        <span>${aiResponse.isCorrect ? '✅ Certo' : '🔧 Correção Encontrada'}</span>
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

        div.innerHTML = `<div class="avatar"><i data-lucide="bot"></i></div><div class="message-content glass-panel"><p>${aiResponse.chatReply}</p>${extraCards}</div>`;
        chatMessages.appendChild(div);
        lucide.createIcons();
        chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
    }
});
