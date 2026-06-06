/**
 * Knowledgepie — Main Application Script
 * Handles: navigation, hero carousel, animations, gallery, scroll effects
 */
document.addEventListener('DOMContentLoaded', () => {

  'use strict';

  // ════════════════════════════════════════════
  // DOM refs
  // ════════════════════════════════════════════
  const header = document.getElementById('siteHeader');
  const navToggle = document.getElementById('navToggle');
  const siteNav = document.getElementById('siteNav');
  const scrollTopBtn = document.getElementById('scrollTop');

  // ════════════════════════════════════════════
  // 1. MOBILE NAV TOGGLE
  // ════════════════════════════════════════════
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', () => {
      const isOpen = siteNav.classList.toggle('open');
      navToggle.classList.toggle('active');
      navToggle.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    // Close nav on link click
    siteNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        siteNav.classList.remove('open');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (siteNav.classList.contains('open') &&
          !siteNav.contains(e.target) &&
          !navToggle.contains(e.target)) {
        siteNav.classList.remove('open');
        navToggle.classList.remove('active');
        navToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  // ════════════════════════════════════════════
  // 2. HEADER SCROLL EFFECT
  // ════════════════════════════════════════════
  let lastScroll = 0;
  const onScroll = () => {
    const y = window.scrollY;
    // Header shadow
    if (header) header.classList.toggle('scrolled', y > 50);
    // Scroll to top button
    if (scrollTopBtn) scrollTopBtn.classList.toggle('visible', y > 400);
    lastScroll = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // initial

  // Scroll to top
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ════════════════════════════════════════════
  // 3. HERO CAROUSEL
  // ════════════════════════════════════════════
  const heroSlides = document.querySelectorAll('.hero-slide');
  const heroDots = document.getElementById('heroDots');
  const heroPrev = document.querySelector('.hero-prev');
  const heroNext = document.querySelector('.hero-next');

  if (heroSlides.length > 0) {
    let currentSlide = 0;
    let autoSlide;

    // Create dots
    if (heroDots) {
      heroSlides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        if (i === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(i));
        heroDots.appendChild(dot);
      });
    }

    function goToSlide(index) {
      heroSlides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
        slide.hidden = i !== index;
      });
      if (heroDots) {
        heroDots.querySelectorAll('button').forEach((dot, i) => {
          dot.classList.toggle('active', i === index);
        });
      }
      currentSlide = index;
    }

    function nextSlide() {
      goToSlide((currentSlide + 1) % heroSlides.length);
    }

    function prevSlide() {
      goToSlide((currentSlide - 1 + heroSlides.length) % heroSlides.length);
    }

    if (heroNext) heroNext.addEventListener('click', () => { nextSlide(); resetAuto(); });
    if (heroPrev) heroPrev.addEventListener('click', () => { prevSlide(); resetAuto(); });

    function startAuto() {
      autoSlide = setInterval(nextSlide, 5000);
    }
    function resetAuto() {
      clearInterval(autoSlide);
      startAuto();
    }

    // Touch swipe for hero
    let touchStartX = 0;
    const heroEl = document.querySelector('.hero');
    if (heroEl) {
      heroEl.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      heroEl.addEventListener('touchend', (e) => {
        const diff = touchStartX - e.changedTouches[0].screenX;
        if (Math.abs(diff) > 50) {
          diff > 0 ? nextSlide() : prevSlide();
          resetAuto();
        }
      }, { passive: true });
    }

    startAuto();
  }

  // ════════════════════════════════════════════
  // 4. PARTNERS CAROUSEL (scroll)
  // ════════════════════════════════════════════
  const partnersTrack = document.getElementById('partnersTrack');
  const partnersPrev = document.querySelector('.partners-carousel .carousel-prev');
  const partnersNext = document.querySelector('.partners-carousel .carousel-next');

  if (partnersTrack && partnersPrev && partnersNext) {
    const scrollAmt = 400;
    partnersPrev.addEventListener('click', () => {
      partnersTrack.scrollBy({ left: -scrollAmt, behavior: 'smooth' });
    });
    partnersNext.addEventListener('click', () => {
      partnersTrack.scrollBy({ left: scrollAmt, behavior: 'smooth' });
    });
  }

  // ════════════════════════════════════════════
  // 5. SCROLL REVEAL ANIMATIONS
  // ════════════════════════════════════════════
  const animateElements = document.querySelectorAll(
    '.mission-card, .unique-card, .usp-card, .team-card, .advisor-card, ' +
    '.intro-grid, .apps-grid, .xeuj-card, .cta-card, .gallery-item, ' +
    '.founder-section, .product-grid, .about-intro-grid, .contact-layout'
  );

  if ('IntersectionObserver' in window && animateElements.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          // Stagger delay for cards
          const delay = entry.target.closest('.mission-card, .unique-card, .team-card, .advisor-card, .usp-card, .gallery-item')
            ? Array.from(entry.target.parentElement.children).indexOf(entry.target) * 100
            : 0;
          entry.target.style.transitionDelay = `${delay}ms`;
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    animateElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
  }

  // Add revealed class style
  const style = document.createElement('style');
  style.textContent = `
    .revealed { opacity: 1 !important; transform: translateY(0) !important; }
  `;
  document.head.appendChild(style);

  // ════════════════════════════════════════════
  // 6. COUNTER ANIMATION
  // ════════════════════════════════════════════
  const statNumbers = document.querySelectorAll('.stat-num, .cta-stat-num');

  if ('IntersectionObserver' in window && statNumbers.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const text = el.textContent.replace('+', '');
          const target = parseInt(text, 10);
          if (isNaN(target)) return;

          let current = 0;
          const increment = Math.ceil(target / 30);
          const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
              current = target;
              clearInterval(timer);
            }
            el.textContent = `+${current}`;
          }, 50);

          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    statNumbers.forEach(el => counterObserver.observe(el));
  }

  // ════════════════════════════════════════════
  // 7. GALLERY — Dynamic Grid + Lightbox
  // ════════════════════════════════════════════
  const galleryGrid = document.getElementById('galleryGrid');
  const lightboxEl = document.getElementById('galleryLightbox');
  const lightboxImg = document.getElementById('lightboxImage');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxPrev = document.getElementById('lightboxPrev');
  const lightboxNext = document.getElementById('lightboxNext');

  if (galleryGrid && typeof galleryImages !== 'undefined') {
    let currentIdx = 0;

    // Render grid
    galleryImages.forEach((img, idx) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      const imgEl = document.createElement('img');
      imgEl.src = img.src;
      imgEl.alt = img.caption;
      imgEl.loading = 'lazy';
      // On image error, try loading from live site
      imgEl.onerror = function() {
        if (!this.dataset.fallback) {
          this.dataset.fallback = '1';
          this.src = 'https://www.knowledgepie.in' + img.src;
        }
      };
      const caption = document.createElement('div');
      caption.className = 'gallery-item-caption';
      caption.textContent = img.caption;
      item.appendChild(imgEl);
      item.appendChild(caption);
      item.addEventListener('click', () => openLightbox(idx));
      galleryGrid.appendChild(item);
    });

    // Remove loading text
    const loadingText = galleryGrid.querySelector('.gallery-loading');
    if (loadingText) loadingText.remove();

    // Lightbox functions
    function openLightbox(index) {
      currentIdx = index;
      updateLightbox();
      lightboxEl.hidden = false;
      lightboxEl.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
      lightboxEl.hidden = true;
      lightboxEl.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    function updateLightbox() {
      const img = galleryImages[currentIdx];
      lightboxImg.src = img.src;
      lightboxImg.alt = img.caption;
      lightboxCaption.textContent = img.caption;
    }

    function prevImage() {
      currentIdx = (currentIdx - 1 + galleryImages.length) % galleryImages.length;
      updateLightbox();
    }

    function nextImage() {
      currentIdx = (currentIdx + 1) % galleryImages.length;
      updateLightbox();
    }

    // Lightbox controls
    if (lightboxPrev) lightboxPrev.addEventListener('click', prevImage);
    if (lightboxNext) lightboxNext.addEventListener('click', nextImage);

    // Backdrop close
    const backdrop = lightboxEl.querySelector('[data-close-lightbox]');
    if (backdrop) backdrop.addEventListener('click', closeLightbox);

    // Close button
    const closeBtn = lightboxEl.querySelector('.lightbox-close');
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (lightboxEl.hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
    });

    // Touch swipe for lightbox
    let lbTouchStart = 0;
    lightboxEl.addEventListener('touchstart', (e) => {
      lbTouchStart = e.changedTouches[0].screenX;
    }, { passive: true });
    lightboxEl.addEventListener('touchend', (e) => {
      const diff = lbTouchStart - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) diff > 0 ? nextImage() : prevImage();
    }, { passive: true });
  }

  // ════════════════════════════════════════════
  // 8. SMOOTH ANCHOR SCROLLING
  // ════════════════════════════════════════════
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  console.log('⚡ Knowledgepie site initialized');
});
