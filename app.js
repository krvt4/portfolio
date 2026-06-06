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

  // Esc Key to close Modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameModal.classList.contains('active')) {
      closeGameModal();
    }
  });
});
