// Modern Web Portfolio - Interaction Controller

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Lucide Vector Icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }

  // 2. Dark/Light Theme Switcher
  const themeToggle = document.getElementById('theme-toggle');
  const htmlElement = document.documentElement;
  
  // Set initial icon representation
  updateThemeIcon(htmlElement.getAttribute('data-theme'));

  themeToggle.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    const iconContainer = themeToggle.querySelector('.sun-icon');
    if (iconContainer) {
      if (theme === 'light') {
        iconContainer.setAttribute('data-lucide', 'moon');
      } else {
        iconContainer.setAttribute('data-lucide', 'sun');
      }
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    }
  }

  // Check storage for theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    htmlElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  // 3. Mobile Menu Navigation Toggler
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  mobileMenuBtn.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    const menuIcon = mobileMenuBtn.querySelector('i');
    if (menuIcon && typeof lucide !== 'undefined') {
      const isOpened = navLinks.classList.contains('active');
      mobileMenuBtn.innerHTML = isOpened ? '<i data-lucide="x"></i>' : '<i data-lucide="menu"></i>';
      lucide.createIcons();
    }
  });

  // Close mobile menu when a link is clicked
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('active');
      mobileMenuBtn.innerHTML = '<i data-lucide="menu"></i>';
      if (typeof lucide !== 'undefined') {
        lucide.createIcons();
      }
    });
  });

  // 4. Scroll Spy - Highlight Active Section Navigation Link
  const sections = document.querySelectorAll('section');
  window.addEventListener('scroll', () => {
    let current = '';
    const scrollPos = window.scrollY + 100;
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    links.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // 5. Project Grid Portfolio Filter
  const filterButtons = document.querySelectorAll('.filter-btn');
  const projectCards = document.querySelectorAll('.project-card');

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      // Toggle active button status
      filterButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');

      const filterValue = button.getAttribute('data-filter');

      projectCards.forEach(card => {
        const cardCategory = card.getAttribute('data-category');
        if (filterValue === 'all' || cardCategory === filterValue) {
          card.style.display = 'flex';
          // Trigger slight animation refresh
          card.style.opacity = '0';
          setTimeout(() => {
            card.style.opacity = '1';
            card.style.transition = 'opacity 0.35s ease';
          }, 50);
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // 6. Game Arena Modal Trigger Integration
  const gameModal = document.getElementById('game-modal');
  const closeBtn = document.getElementById('game-modal-close-btn');
  const closeOverlay = document.getElementById('game-modal-close-overlay');
  
  // Game launcher trigger buttons
  const playBtnHero = document.getElementById('hero-play-game');
  const playBtnProject = document.getElementById('project-play-game');

  function openGameModal() {
    gameModal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Stop background scrolling
    
    // Call RPS Game module initialization if declared
    if (window.RPSGame && typeof window.RPSGame.openArena === 'function') {
      window.RPSGame.openArena();
    }
  }

  function closeGameModal() {
    gameModal.classList.remove('active');
    document.body.style.overflow = 'auto'; // Enable scrolling
    
    // Call RPS Game module cleanup if declared
    if (window.RPSGame && typeof window.RPSGame.closeArena === 'function') {
      window.RPSGame.closeArena();
    }
  }

  if (playBtnHero) playBtnHero.addEventListener('click', openGameModal);
  if (playBtnProject) playBtnProject.addEventListener('click', openGameModal);
  if (closeBtn) closeBtn.addEventListener('click', closeGameModal);
  if (closeOverlay) closeOverlay.addEventListener('click', closeGameModal);

  // 7. Project Video Player Modal Controllers
  const videoModal = document.getElementById('video-modal');
  const videoIframe = document.getElementById('video-modal-iframe');
  const videoTitle = document.getElementById('video-modal-title');
  const videoCloseBtn = document.getElementById('video-modal-close-btn');
  const videoCloseOverlay = document.getElementById('video-modal-close-overlay');
  const watchVideoBtns = document.querySelectorAll('.btn-watch-video');

  function openVideoModal(url, title) {
    if (videoModal && videoIframe) {
      videoIframe.src = url;
      if (videoTitle) {
        videoTitle.innerHTML = `<i data-lucide="video" style="color: hsl(var(--primary)); width: 18px; height: 18px;"></i> ${title}`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
      videoModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeVideoModal() {
    if (videoModal && videoIframe) {
      videoModal.classList.remove('active');
      videoIframe.src = '';
      document.body.style.overflow = 'auto';
    }
  }

  watchVideoBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.getAttribute('data-video-url');
      const title = btn.getAttribute('data-video-title');
      openVideoModal(url, title);
    });
  });

  if (videoCloseBtn) videoCloseBtn.addEventListener('click', closeVideoModal);
  if (videoCloseOverlay) videoCloseOverlay.addEventListener('click', closeVideoModal);

  // Esc Key to close Modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (gameModal && gameModal.classList.contains('active')) closeGameModal();
      if (videoModal && videoModal.classList.contains('active')) closeVideoModal();
    }
  });

  // 8. Projects Media Tab Swapping Logic
  const tabButtons = document.querySelectorAll('.media-tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const parentCard = btn.closest('.project-card');
      if (!parentCard) return;

      // Toggle active class on tab buttons
      const cardTabButtons = parentCard.querySelectorAll('.media-tab-btn');
      cardTabButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Hide all tabs
      const visualTabs = parentCard.querySelectorAll('.thesis-visual-tab');
      visualTabs.forEach(t => t.classList.remove('active'));
      visualTabs.forEach(t => t.style.display = 'none');

      // Show targeted tab
      const targetTabId = `thesis-tab-${btn.getAttribute('data-tab')}`;
      const targetTab = parentCard.querySelector(`#${targetTabId}`);
      if (targetTab) {
        targetTab.classList.add('active');
        targetTab.style.display = (btn.getAttribute('data-tab') === 'interactive') ? 'block' : 'flex';
      }
    });
  });

  // 9. Interactive 3D Reconstruction Scanning Simulator
  const btnRunScanner = document.getElementById('btn-run-scanner');
  const btnToggleScannerCam = document.getElementById('btn-toggle-scanner-cam');
  const scannerVideo = document.getElementById('scanner-video');
  const scannerStaticView = document.getElementById('scanner-static-view');
  const scannerMeshView = document.getElementById('scanner-mesh-view');
  const scannerLaser = document.getElementById('scanner-laser-line');
  const scannerLog = document.getElementById('scanner-log-feed');
  
  let webcamStream = null;
  let isScanning = false;

  // Toggle Webcam streaming in Simulator
  async function toggleWebcam() {
    if (webcamStream) {
      // Turn off webcam stream
      const tracks = webcamStream.getTracks();
      tracks.forEach(track => track.stop());
      webcamStream = null;
      if (scannerVideo) {
        scannerVideo.srcObject = null;
        scannerVideo.style.display = 'none';
      }
      if (scannerStaticView) scannerStaticView.style.display = 'flex';
      if (btnToggleScannerCam) btnToggleScannerCam.textContent = 'Use Webcam';
      updateScannerLog('WEBCAM DISCONNECTED');
    } else {
      // Connect webcam stream
      try {
        updateScannerLog('REQUESTING WEBCAM ACCESS...');
        webcamStream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        if (scannerVideo) {
          scannerVideo.srcObject = webcamStream;
          scannerVideo.style.display = 'block';
        }
        if (scannerStaticView) scannerStaticView.style.display = 'none';
        if (btnToggleScannerCam) btnToggleScannerCam.textContent = 'Stop Webcam';
        updateScannerLog('WEBCAM STREAM ACTIVE');
      } catch (err) {
        console.error('Camera access error:', err);
        updateScannerLog('CAMERA ERROR: PERMISSION DENIED');
      }
    }
  }

  function updateScannerLog(msg) {
    if (scannerLog) {
      scannerLog.textContent = msg;
    }
  }

  // Run Scanning Simulation Sequence
  function runScannerSimulation() {
    if (isScanning) return;
    isScanning = true;
    
    if (btnRunScanner) {
      btnRunScanner.disabled = true;
      btnRunScanner.textContent = 'Scanning...';
    }

    // Hide previous wireframe mesh
    if (scannerMeshView) scannerMeshView.style.display = 'none';
    
    // Restore stream or static feed view
    if (webcamStream) {
      if (scannerVideo) scannerVideo.style.display = 'block';
    } else {
      if (scannerStaticView) scannerStaticView.style.display = 'flex';
    }

    // Turn on scanning laser
    if (scannerLaser) scannerLaser.classList.add('active');

    // Sequential Log Updates
    const logs = [
      { delay: 0, text: 'INITIALIZING SCANNER...' },
      { delay: 800, text: 'SEARCHING FOR OBJECTS...' },
      { delay: 1600, text: 'OBJECT ACQUIRED: CITRUS RETICULATA (ORANGE)' },
      { delay: 2400, text: 'COMPUTING COORDINATE GRADIENTS (360°)...' },
      { delay: 3200, text: 'GENERATING 3D POINT CLOUD...' },
      { delay: 4000, text: 'BAKING TEXTURE MAPS...' },
      { delay: 4800, text: 'RECONSTRUCTION COMPLETED!' }
    ];

    logs.forEach(step => {
      setTimeout(() => {
        updateScannerLog(step.text);
      }, step.delay);
    });

    // Scan completion actions
    setTimeout(() => {
      if (scannerLaser) scannerLaser.classList.remove('active');
      
      // Swap feeds to show rotating 3D wireframe mesh
      if (scannerVideo) scannerVideo.style.display = 'none';
      if (scannerStaticView) scannerStaticView.style.display = 'none';
      if (scannerMeshView) scannerMeshView.style.display = 'flex';
      
      updateScannerLog('GRADE: PREMIUM | DEFECT RATE: 0.12%');
      
      if (btnRunScanner) {
        btnRunScanner.disabled = false;
        btnRunScanner.textContent = 'Scan Again';
      }
      isScanning = false;
    }, 5000);
  }

  if (btnToggleScannerCam) btnToggleScannerCam.addEventListener('click', toggleWebcam);
  if (btnRunScanner) btnRunScanner.addEventListener('click', runScannerSimulation);
});

