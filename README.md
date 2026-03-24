# EngFluence - English Tutor Micro SaaS

A modern Web Application Micro-SaaS designed to help students learn and perfect their English, based on an 8-level syllabus structure.

## Features

- **Text Correction**: Type any English phrase. The AI acts as a native tutor, identifies mistakes, and explains the correction in Portuguese.
- **Micro-SaaS Syllabus Tracking**: The AI maps your errors against the official syllabus (Inglês 1 to Inglês 8) to accurately determine which grammatical rule you stumbled upon.
- **Estimated User Level**: The AI observes your vocabulary and sentence structure to guess your overall English proficiency (e.g. Inglês 5).
- **Study Recommendations**: Based exclusively on the "Inglês 1-8" curriculum.
- **Voice Interactions**: 
  - **Speech-To-Text (STT)**: Click the microphone icon or hold it to speak your sentence.
  - **Text-To-Speech (TTS)**: The app automatically pronounces the corrected sentence for you, ensuring listening and speaking practice.

## How to Run

This is a complete, client-side Vanilla web application. No complex server setups needed!

1. Navigate to the `english-saas` folder.
2. Open `index.html` in your web browser (Chrome or Edge recommended for best Web Speech API compatibility).
   - Alternatively, use a local server like `npx serve` or Live Server in VS Code for a better experience.
3. Upon first launch, click the settings gear (⚙️) on the top right.
4. Insert your **OpenAI API Key** and save. (It is stored entirely locally on your browser).
5. Start learning! Type or speak your phrases.

## Tech Stack
- **HTML5 & CSS3**: Vanilla architecture, designed with a premium, aesthetic, glassmorphic UI.
- **Vanilla JavaScript**: Lightweight and blazing fast.
- **OpenAI API**: `gpt-4o-mini` with structured JSON Object mode to guarantee reliable parsing.
- **Web Speech API**: Uses native browser capabilities for Voice Recognition (STT) and Synthesis (TTS), enabling the conversing features.
- **Lucide Icons**: Crisp, modern typography icons.

## Process and Decisions
- **Why Vanilla JS?** For a straightforward application that does not rely on a complex build process, allowing immediate local use directly off the file system or a basic web server.
- **Why ChatGPT?** A purely programmatic syllabus tracker would require thousands of regex rules. Utilizing an LLM guarantees dynamic learning and contextual understanding of mistakes across exactly 8 tiers of grammatical progression.
