// Modern Web Portfolio - Camera & AI Rock Paper Scissors Arena

window.RPSGame = (() => {
  // Game states and configurations
  let isCameraActive = false;
  let isMediaPipeLoaded = false;
  let handsModel = null;
  let cameraStream = null;
  let isSoundEnabled = true;
  let aiDifficulty = 'adaptive'; // 'random' or 'adaptive'
  
  // Game scores
  let playerScore = 0;
  let aiScore = 0;
  let winStreak = 0;
  let gameHistory = []; // array of { round: N, player: 'Rock', ai: 'Paper', outcome: 'lose' }
  
  // Hand tracking variables
  let currentDetectedGesture = 'Unknown';
  let activeRoundGesture = null; // Gesture locked in during SHOOT!
  let lastPredictedGesture = 'Unknown';
  let frameRequest = null;
  
  // Web Audio Context
  let audioCtx = null;

  // DOM Elements cache
  let elements = {};

  // Initialize Elements Cache
  function initElements() {
    elements = {
      modal: document.getElementById('game-modal'),
      video: document.getElementById('webcam-feed'),
      canvas: document.getElementById('hand-mesh-canvas'),
      cameraPlaceholder: document.getElementById('camera-placeholder'),
      btnEnableCamera: document.getElementById('btn-enable-camera'),
      aiPlaceholder: document.getElementById('ai-placeholder'),
      aiAvatar: document.getElementById('ai-avatar'),
      aiChoiceEmoji: document.getElementById('ai-choice-emoji'),
      aiChoiceLabel: document.getElementById('ai-choice-label'),
      gestureOverlay: document.getElementById('gesture-overlay'),
      gestureText: document.getElementById('gesture-detected-text'),
      arenaOverlay: document.getElementById('arena-overlay'),
      countdownText: document.getElementById('countdown-text'),
      resultCard: document.getElementById('result-card'),
      resultTitle: document.getElementById('result-title'),
      resultSubtitle: document.getElementById('result-subtitle'),
      btnNextRound: document.getElementById('btn-next-round'),
      scorePlayer: document.getElementById('score-player'),
      scoreAi: document.getElementById('score-ai'),
      streakNum: document.getElementById('streak-num'),
      btnStartRound: document.getElementById('btn-start-round'),
      btnToggleSound: document.getElementById('btn-toggle-sound'),
      soundIcon: document.getElementById('sound-icon'),
      btnToggleDifficulty: document.getElementById('btn-toggle-difficulty'),
      difficultyLabel: document.getElementById('difficulty-label'),
      btnResetGame: document.getElementById('btn-reset-game'),
      historyList: document.getElementById('history-list')
    };
  }

  // Audio Synthesizer Class
  const SoundEffects = {
    init() {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    },

    playBeep(frequency, duration) {
      if (!isSoundEnabled) return;
      this.init();
      
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    },

    playWin() {
      if (!isSoundEnabled) return;
      this.init();
      const now = audioCtx.currentTime;
      const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5 major chord
      
      notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + index * 0.1);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.12, now + index * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.005, now + index * 0.1 + 0.4);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now + index * 0.1);
        osc.stop(now + index * 0.1 + 0.5);
      });
    },

    playLose() {
      if (!isSoundEnabled) return;
      this.init();
      const now = audioCtx.currentTime;
      const notes = [293.66, 277.18, 261.63, 220.00]; // D4, C#4, C4, A3 sad descending
      
      notes.forEach((freq, index) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + index * 0.12);
        
        // Low pass filter to make it warmer
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + index * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.5);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now + index * 0.12);
        osc.stop(now + index * 0.12 + 0.6);
      });
    },

    playDraw() {
      if (!isSoundEnabled) return;
      this.init();
      const now = audioCtx.currentTime;
      
      const playPulse = (time) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(349.23, time); // F4 note
        
        gain.gain.setValueAtTime(0.1, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(time);
        osc.stop(time + 0.16);
      };
      
      playPulse(now);
      playPulse(now + 0.15);
    }
  };

  // Math vector distance helper (3D Coordinates)
  function getDistance(p1, p2) {
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) +
      Math.pow(p1.y - p2.y, 2) +
      Math.pow(p1.z - p2.z, 2)
    );
  }

  // Heuristic Hand Gesture Classifier
  function classifyGesture(landmarks) {
    // Reference base points (wrist = 0, knuckles = 5, 9, 13, 17)
    const wrist = landmarks[0];
    
    // Check Euclidean distance of finger tips from wrist compared to PIP joints
    // If tip distance > PIP joint distance, the finger is extended
    const isIndexExtended = getDistance(landmarks[8], wrist) > getDistance(landmarks[6], wrist) * 1.05;
    const isMiddleExtended = getDistance(landmarks[12], wrist) > getDistance(landmarks[10], wrist) * 1.05;
    const isRingExtended = getDistance(landmarks[16], wrist) > getDistance(landmarks[14], wrist) * 1.05;
    const isPinkyExtended = getDistance(landmarks[20], wrist) > getDistance(landmarks[18], wrist) * 1.05;
    
    // Thumb distance check relative to knuckles
    const isThumbExtended = getDistance(landmarks[4], landmarks[5]) > getDistance(landmarks[3], landmarks[5]) * 1.15;

    // Gesture classifications
    // 1. Paper: All four fingers extended (or index, middle, ring, pinky)
    if (isIndexExtended && isMiddleExtended && isRingExtended && isPinkyExtended) {
      return 'Paper';
    }
    // 2. Scissors: Only Index & Middle extended, Ring & Pinky curled
    if (isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return 'Scissors';
    }
    // 3. Rock: All four fingers curled/folded
    if (!isIndexExtended && !isMiddleExtended && !isRingExtended && !isPinkyExtended) {
      return 'Rock';
    }

    return 'Unknown';
  }

  // Draw hand skeleton lines & nodes on canvas overlay
  function drawSkeleton(landmarks) {
    const ctx = elements.canvas.getContext('2d');
    ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);

    const width = elements.canvas.width;
    const height = elements.canvas.height;

    // Finger paths index definitions
    const paths = [
      [0, 1, 2, 3, 4],       // Thumb
      [0, 5, 6, 7, 8],       // Index
      [9, 10, 11, 12],       // Middle (connects 0 to 9 below)
      [13, 14, 15, 16],      // Ring (connects 9 to 13 below)
      [0, 17, 18, 19, 20],   // Pinky
      [5, 9, 13, 17]         // Palm knuckles
    ];

    // Additional palm connection lines
    ctx.beginPath();
    ctx.moveTo(landmarks[0].x * width, landmarks[0].y * height);
    ctx.lineTo(landmarks[9].x * width, landmarks[9].y * height);
    ctx.moveTo(landmarks[0].x * width, landmarks[0].y * height);
    ctx.lineTo(landmarks[13].x * width, landmarks[13].y * height);
    
    // Setup premium neon glow lines styling
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#7c3aed';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Draw individual path tracks
    paths.forEach(path => {
      ctx.beginPath();
      ctx.moveTo(landmarks[path[0]].x * width, landmarks[path[0]].y * height);
      for (let i = 1; i < path.length; i++) {
        ctx.lineTo(landmarks[path[i]].x * width, landmarks[path[i]].y * height);
      }
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.7)';
      ctx.lineWidth = 4;
      ctx.stroke();
    });

    // Draw knuckles glow vertices
    landmarks.forEach(lm => {
      ctx.beginPath();
      ctx.arc(lm.x * width, lm.y * height, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#3b82f6'; // neon blue dots
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
    });
  }

  // MediaPipe Hand Pose callback tracking results
  function onHandResults(results) {
    if (!isCameraActive) return;

    const ctx = elements.canvas.getContext('2d');
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      
      // Real-time canvas drawing
      drawSkeleton(landmarks);
      
      // Classify gesture
      currentDetectedGesture = classifyGesture(landmarks);
      
      // Update UI Text Status
      elements.gestureOverlay.classList.add('active');
      if (currentDetectedGesture !== 'Unknown') {
        elements.gestureText.textContent = currentDetectedGesture;
        elements.gestureText.style.color = '#fff';
      } else {
        elements.gestureText.textContent = 'Analyzing Hand...';
        elements.gestureText.style.color = 'rgba(255,255,255,0.5)';
      }
    } else {
      ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
      currentDetectedGesture = 'Unknown';
      elements.gestureText.textContent = 'Scanning...';
      elements.gestureOverlay.classList.remove('active');
    }
  }

  // Real-time frame loop grabber
  async function processVideoFrame() {
    if (!isCameraActive) return;
    
    if (elements.video.readyState === elements.video.HAVE_ENOUGH_DATA) {
      try {
        await handsModel.send({ image: elements.video });
      } catch (err) {
        console.error("MediaPipe Processing Frame Error: ", err);
      }
    }
    
    frameRequest = requestAnimationFrame(processVideoFrame);
  }

  // Initialize MediaPipe Library
  function loadMediaPipe() {
    if (isMediaPipeLoaded) return Promise.resolve();
    
    elements.gestureText.textContent = 'Loading AI model...';
    elements.gestureOverlay.classList.add('active');

    return new Promise((resolve, reject) => {
      try {
        // Init MediaPipe Hands global
        handsModel = new Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        handsModel.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.65,
          minTrackingConfidence: 0.65
        });

        handsModel.onResults(onHandResults);
        isMediaPipeLoaded = true;
        resolve();
      } catch (err) {
        elements.gestureText.textContent = 'Model Loading Failed';
        reject(err);
      }
    });
  }

  // Webcam stream trigger activation
  async function startWebcam() {
    elements.cameraPlaceholder.style.opacity = '1';
    const enableBtn = elements.btnEnableCamera;
    enableBtn.innerHTML = 'Starting camera... <i data-lucide="loader" class="animate-spin"></i>';
    if (typeof lucide !== 'undefined') lucide.createIcons();

    try {
      await loadMediaPipe();

      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user"
        },
        audio: false
      };

      cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      elements.video.srcObject = cameraStream;
      
      // Wait for metadata to load to adjust sizing
      await new Promise((resolve) => {
        elements.video.onloadedmetadata = () => {
          elements.canvas.width = elements.video.videoWidth;
          elements.canvas.height = elements.video.videoHeight;
          resolve();
        };
      });

      isCameraActive = true;
      elements.cameraPlaceholder.style.opacity = '0';
      setTimeout(() => {
        elements.cameraPlaceholder.style.display = 'none';
      }, 500);

      // Enable the Play Round CTA
      elements.btnStartRound.removeAttribute('disabled');
      
      // Start processing loops
      processVideoFrame();
      
    } catch (err) {
      console.error("Camera setup failed: ", err);
      enableBtn.innerHTML = 'Enable Camera <i data-lucide="camera">';
      if (typeof lucide !== 'undefined') lucide.createIcons();
      alert("Could not access camera. Please check your system permissions or browser settings.");
    }
  }

  // Camera cleanup teardown
  function stopWebcam() {
    isCameraActive = false;
    if (frameRequest) {
      cancelAnimationFrame(frameRequest);
      frameRequest = null;
    }
    
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      cameraStream = null;
    }
    
    if (elements.video) {
      elements.video.srcObject = null;
    }
    
    // Clear Canvas
    if (elements.canvas) {
      const ctx = elements.canvas.getContext('2d');
      ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);
    }

    elements.cameraPlaceholder.style.display = 'flex';
    elements.cameraPlaceholder.style.opacity = '1';
    elements.btnStartRound.setAttribute('disabled', 'true');
    elements.btnEnableCamera.innerHTML = 'Enable Camera <i data-lucide="camera">';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // Adaptive AI Opponent Choice Logic
  // Predicts user move using Markov-chain transitions and tracks frequency
  function getAiChoice() {
    const choices = ['Rock', 'Paper', 'Scissors'];
    
    if (aiDifficulty === 'random' || gameHistory.length < 3) {
      return choices[Math.floor(Math.random() * 3)];
    }

    // Adaptive AI Mode (Markov chain & User profiling)
    // 1. Analyze transitions from last played user move
    const lastPlayerMove = gameHistory[gameHistory.length - 1].player;
    const transitions = { Rock: 0, Paper: 0, Scissors: 0 };
    
    for (let i = 0; i < gameHistory.length - 1; i++) {
      if (gameHistory[i].player === lastPlayerMove) {
        const nextMove = gameHistory[i + 1].player;
        transitions[nextMove]++;
      }
    }

    // Find predicted next move based on transitions
    let predictedMove = null;
    let maxTransition = -1;
    for (const move in transitions) {
      if (transitions[move] > maxTransition) {
        maxTransition = transitions[move];
        predictedMove = move;
      }
    }

    // If transition counts are equal or zero, fallback to overall user frequencies
    if (maxTransition <= 0) {
      const frequencies = { Rock: 0, Paper: 0, Scissors: 0 };
      gameHistory.forEach(h => frequencies[h.player]++);
      
      let maxFreq = -1;
      for (const move in frequencies) {
        if (frequencies[move] > maxFreq) {
          maxFreq = frequencies[move];
          predictedMove = move;
        }
      }
    }

    // AI plays the move that defeats the predicted move
    // Paper beats Rock, Scissors beats Paper, Rock beats Scissors
    if (predictedMove === 'Rock') return 'Paper';
    if (predictedMove === 'Paper') return 'Scissors';
    if (predictedMove === 'Scissors') return 'Rock';

    return choices[Math.floor(Math.random() * 3)];
  }

  // Determine game round winner
  function calculateOutcome(player, ai) {
    if (player === ai) return 'draw';
    
    if (
      (player === 'Rock' && ai === 'Scissors') ||
      (player === 'Paper' && ai === 'Rock') ||
      (player === 'Scissors' && ai === 'Paper')
    ) {
      return 'win';
    }
    
    return 'lose';
  }

  // Emojis for moves mapping
  const moveEmojis = {
    'Rock': '✊',
    'Paper': '✋',
    'Scissors': '✌️',
    'Unknown': '❓'
  };

  // Run the Round countdown and resolution state machine
  function playRound() {
    elements.btnStartRound.setAttribute('disabled', 'true');
    elements.btnResetGame.setAttribute('disabled', 'true');
    elements.btnToggleDifficulty.setAttribute('disabled', 'true');
    
    elements.arenaOverlay.classList.add('active');
    elements.countdownText.classList.remove('animate');
    elements.resultCard.classList.remove('show');
    elements.aiPlaceholder.style.opacity = '1';
    
    // Restart AI thinking animation
    elements.aiAvatar.classList.add('thinking');
    elements.aiChoiceEmoji.textContent = '🤖';
    elements.aiChoiceLabel.textContent = 'Thinking...';
    
    let countdownVal = 3;
    elements.countdownText.textContent = countdownVal;
    elements.countdownText.style.display = 'block';
    
    // Add micro delay for smooth start transition
    setTimeout(() => {
      elements.countdownText.classList.add('animate');
      SoundEffects.playBeep(440, 0.15); // pitch A4
    }, 100);

    const countdownTimer = setInterval(() => {
      countdownVal--;
      elements.countdownText.classList.remove('animate');
      
      if (countdownVal > 0) {
        setTimeout(() => {
          elements.countdownText.textContent = countdownVal;
          elements.countdownText.classList.add('animate');
          SoundEffects.playBeep(440, 0.15);
        }, 100);
      } else if (countdownVal === 0) {
        setTimeout(() => {
          elements.countdownText.textContent = "SHOOT!";
          elements.countdownText.classList.add('animate');
          SoundEffects.playBeep(880, 0.3); // higher pitch shoot beep
          
          // Lock current user gesture
          activeRoundGesture = currentDetectedGesture;
        }, 100);
      } else {
        clearInterval(countdownTimer);
        elements.countdownText.style.display = 'none';
        resolveRoundResults();
      }
    }, 1000);
  }

  // Process frozen gesture against AI choice
  function resolveRoundResults() {
    // 1. Check if user hand was successfully detected
    if (activeRoundGesture === 'Unknown') {
      elements.arenaOverlay.classList.remove('active');
      elements.btnStartRound.removeAttribute('disabled');
      elements.btnResetGame.removeAttribute('disabled');
      elements.btnToggleDifficulty.removeAttribute('disabled');
      
      // Stop AI animations
      elements.aiAvatar.classList.remove('thinking');
      elements.aiChoiceLabel.textContent = 'Ready to play';
      
      alert("We couldn't detect your hand gesture. Make sure your hand is fully visible in the camera frame!");
      return;
    }

    // 2. Select AI Choice
    const aiChoice = getAiChoice();
    
    // Reveal AI choice in UI
    elements.aiAvatar.classList.remove('thinking');
    elements.aiChoiceEmoji.textContent = moveEmojis[aiChoice];
    elements.aiChoiceLabel.textContent = aiChoice;

    // 3. Compare moves and calculate outcome
    const outcome = calculateOutcome(activeRoundGesture, aiChoice);

    // 4. Update core variables & stats
    if (outcome === 'win') {
      playerScore++;
      winStreak++;
      SoundEffects.playWin();
      
      elements.resultTitle.textContent = 'YOU WIN!';
      elements.resultTitle.className = 'round-result-title round-winner-player';
    } else if (outcome === 'lose') {
      aiScore++;
      winStreak = 0;
      SoundEffects.playLose();
      
      elements.resultTitle.textContent = 'AI WINS!';
      elements.resultTitle.className = 'round-result-title round-winner-ai';
    } else {
      winStreak = 0;
      SoundEffects.playDraw();
      
      elements.resultTitle.textContent = "IT'S A DRAW!";
      elements.resultTitle.className = 'round-result-title round-winner-draw';
    }

    // Outcome descriptive texts
    let outcomeReason = '';
    if (outcome === 'draw') {
      outcomeReason = `Both chose ${activeRoundGesture}`;
    } else {
      const winnerMove = outcome === 'win' ? activeRoundGesture : aiChoice;
      const loserMove = outcome === 'win' ? aiChoice : activeRoundGesture;
      
      if (winnerMove === 'Rock') outcomeReason = 'Rock crushes Scissors';
      if (winnerMove === 'Paper') outcomeReason = 'Paper wraps Rock';
      if (winnerMove === 'Scissors') outcomeReason = 'Scissors cuts Paper';
    }
    
    elements.resultSubtitle.textContent = outcomeReason;

    // Append to logs
    gameHistory.push({
      round: gameHistory.length + 1,
      player: activeRoundGesture,
      ai: aiChoice,
      outcome: outcome
    });

    // Update scoreboard displays
    elements.scorePlayer.textContent = playerScore;
    elements.scoreAi.textContent = aiScore;
    elements.streakNum.textContent = `${winStreak} Wins`;

    // Render outcome list log feed
    renderHistoryFeed();

    // Reveal result card modal overlay
    elements.resultCard.classList.add('show');
  }

  // Build outcomes list HTML
  function renderHistoryFeed() {
    const list = elements.historyList;
    list.innerHTML = '';
    
    if (gameHistory.length === 0) {
      list.innerHTML = '<li class="history-row" style="justify-content: center; color: var(--text-secondary);">No matches played yet.</li>';
      return;
    }

    // Reverse history sequence to show newest outcomes first
    const newestHistory = [...gameHistory].reverse().slice(0, 5); // display top 5
    
    newestHistory.forEach(round => {
      const item = document.createElement('li');
      item.className = 'history-row';
      
      const outcomeText = round.outcome.toUpperCase();
      const outcomeClass = `outcome-${round.outcome}`;
      
      item.innerHTML = `
        <span class="history-outcome ${outcomeClass}">Round ${round.round}: ${outcomeText}</span>
        <span class="history-moves">You: ${moveEmojis[round.player]} vs AI: ${moveEmojis[round.ai]}</span>
      `;
      list.appendChild(item);
    });
  }

  // Set next round idle states
  function nextRound() {
    elements.resultCard.classList.remove('show');
    elements.arenaOverlay.classList.remove('active');
    
    // Clear AI choices card
    elements.aiChoiceEmoji.textContent = '🤖';
    elements.aiChoiceLabel.textContent = 'Ready to play';
    
    // Reset inputs
    activeRoundGesture = null;
    
    elements.btnStartRound.removeAttribute('disabled');
    elements.btnResetGame.removeAttribute('disabled');
    elements.btnToggleDifficulty.removeAttribute('disabled');
  }

  // Reset entire scoreboard game state
  function resetGame() {
    playerScore = 0;
    aiScore = 0;
    winStreak = 0;
    gameHistory = [];
    
    elements.scorePlayer.textContent = '0';
    elements.scoreAi.textContent = '0';
    elements.streakNum.textContent = '0 Wins';
    
    renderHistoryFeed();
    
    // Ensure overlays are reset
    elements.resultCard.classList.remove('show');
    elements.arenaOverlay.classList.remove('active');
  }

  // Public Arena Interface methods
  return {
    openArena() {
      initElements();
      
      // Setup events listeners inside modal context
      elements.btnEnableCamera.onclick = startWebcam;
      elements.btnStartRound.onclick = playRound;
      elements.btnNextRound.onclick = nextRound;
      
      // Reset sound setting visual state
      isSoundEnabled = localStorage.getItem('rps_sound') !== 'false';
      elements.soundIcon.className = isSoundEnabled ? 'lucide lucide-volume-2' : 'lucide lucide-volume-x';
      if (typeof lucide !== 'undefined') lucide.createIcons();

      elements.btnToggleSound.onclick = () => {
        isSoundEnabled = !isSoundEnabled;
        localStorage.setItem('rps_sound', isSoundEnabled);
        elements.soundIcon.className = isSoundEnabled ? 'lucide-volume-2' : 'lucide-volume-x';
        if (typeof lucide !== 'undefined') lucide.createIcons();
      };
      
      // Difficulty Toggle Click
      elements.btnToggleDifficulty.onclick = () => {
        aiDifficulty = aiDifficulty === 'adaptive' ? 'random' : 'adaptive';
        elements.difficultyLabel.textContent = aiDifficulty.charAt(0).toUpperCase() + aiDifficulty.slice(1);
      };

      // Reset Button
      elements.btnResetGame.onclick = resetGame;

      // Start webcam automatically if permission is already active or user triggers
      // Wait, let the user click explicitly to start camera, as it is a better UX flow.
    },
    
    closeArena() {
      // Teardown camera and reset parameters
      stopWebcam();
      elements.resultCard.classList.remove('show');
      elements.arenaOverlay.classList.remove('active');
    }
  };
})();
