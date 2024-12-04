document.addEventListener('DOMContentLoaded', () => {
  const mobileMenuButton = document.getElementById('mobile-menu-button');
  const navbar = document.getElementById('navbar');

  mobileMenuButton.addEventListener('click', () => {
    navbar.classList.toggle('active');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!mobileMenuButton.contains(e.target) && !navbar.contains(e.target)) {
      navbar.classList.remove('active');
    }
  });

  // Close menu when window is resized
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      navbar.classList.remove('active');
    }
  });
}); 