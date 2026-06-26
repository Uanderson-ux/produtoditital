/**
 * blog-carousel.js
 * Carrossel dinâmico para a seção "Conteúdo Gratuito" da página inicial.
 * Carrega artigos de blog/articles.json e exibe com autoplay, setas e dots.
 * Não interfere em nenhuma funcionalidade existente do site.
 */

(function () {
    'use strict';

    /* ------------------------------------------------------------------ */
    /* CONFIG                                                               */
    /* ------------------------------------------------------------------ */
    const ARTICLES_JSON_URL = 'blog/articles.json';
    const AUTOPLAY_INTERVAL = 5000; // ms
    const MAX_ARTICLES = 12; // carregar os 12 mais recentes

    /* ------------------------------------------------------------------ */
    /* STATE                                                               */
    /* ------------------------------------------------------------------ */
    let articles = [];
    let currentIndex = 0;
    let visibleCount = 3;     // updated on resize
    let totalGroups = 0;
    let autoplayTimer = null;
    let isUserInteracting = false;
    let interactionTimer = null;

    /* ------------------------------------------------------------------ */
    /* DOM REFS                                                             */
    /* ------------------------------------------------------------------ */
    const track     = document.getElementById('carouselTrack');
    const viewport  = document.getElementById('carouselViewport');
    const btnPrev   = document.getElementById('carouselPrev');
    const btnNext   = document.getElementById('carouselNext');
    const dotsWrap  = document.getElementById('carouselDots');

    // Bail if carousel elements don't exist on this page
    if (!track || !btnPrev || !btnNext || !dotsWrap) return;

    /* ------------------------------------------------------------------ */
    /* HELPERS                                                              */
    /* ------------------------------------------------------------------ */

    function getVisibleCount() {
        if (window.innerWidth <= 640) return 1;
        if (window.innerWidth <= 1024) return 2;
        return 3;
    }

    function formatDate(isoDate) {
        if (!isoDate) return '';
        const parts = isoDate.split('-');
        if (parts.length !== 3) return isoDate;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    /* ------------------------------------------------------------------ */
    /* RENDER                                                               */
    /* ------------------------------------------------------------------ */

    function buildCards() {
        track.innerHTML = '';

        articles.forEach(article => {
            const url = `blog/${article.slug}/index.html`;
            const formattedDate = formatDate(article.date);

            const card = document.createElement('a');
            card.className = 'carousel-card';
            card.href = url;
            card.setAttribute('aria-label', `Ler artigo: ${article.title}`);

            card.innerHTML = `
                <div class="carousel-card__image-wrap">
                    <img
                        src="${article.image || ''}"
                        alt="${article.title}"
                        loading="lazy"
                        width="400"
                        height="250"
                        onerror="this.style.display='none'"
                    >
                </div>
                <div class="carousel-card__body">
                    <div class="carousel-card__meta">
                        <span class="carousel-card__category">${article.category || ''}</span>
                        <time class="carousel-card__date" datetime="${article.date || ''}">${formattedDate}</time>
                    </div>
                    <h3 class="carousel-card__title">${article.title}</h3>
                    <p class="carousel-card__excerpt">${article.description || ''}</p>
                    <span class="carousel-card__btn">Ler Artigo <span aria-hidden="true">→</span></span>
                </div>
            `;

            track.appendChild(card);
        });
    }

    function buildDots() {
        dotsWrap.innerHTML = '';
        totalGroups = Math.ceil(articles.length / visibleCount);

        for (let i = 0; i < totalGroups; i++) {
            const dot = document.createElement('button');
            dot.className = 'carousel-dot' + (i === 0 ? ' is-active' : '');
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-label', `Grupo ${i + 1} de artigos`);
            dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
            dot.addEventListener('click', () => {
                goTo(i);
                pauseAutoplay();
            });
            dotsWrap.appendChild(dot);
        }
    }

    function updateDots() {
        const dots = dotsWrap.querySelectorAll('.carousel-dot');
        dots.forEach((dot, i) => {
            const active = i === currentIndex;
            dot.classList.toggle('is-active', active);
            dot.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    }

    function updateArrows() {
        // Infinite loop: always enabled
        btnPrev.disabled = false;
        btnNext.disabled = false;
    }

    function applyTransform() {
        // Calculate card width + gap (1.5rem = 24px)
        const cardEls = track.querySelectorAll('.carousel-card');
        if (!cardEls.length) return;

        const gap = 24; // px — matches CSS gap: 1.5rem
        const cardWidth = cardEls[0].offsetWidth;
        const offset = currentIndex * (visibleCount * (cardWidth + gap));

        track.style.transform = `translateX(-${offset}px)`;
    }

    /* ------------------------------------------------------------------ */
    /* NAVIGATION                                                           */
    /* ------------------------------------------------------------------ */

    function goTo(groupIndex) {
        totalGroups = Math.ceil(articles.length / visibleCount);
        // Clamp with wrap-around (infinite)
        if (groupIndex < 0) groupIndex = totalGroups - 1;
        if (groupIndex >= totalGroups) groupIndex = 0;

        currentIndex = groupIndex;
        applyTransform();
        updateDots();
        updateArrows();
    }

    function goNext() {
        goTo(currentIndex + 1);
    }

    function goPrev() {
        goTo(currentIndex - 1);
    }

    /* ------------------------------------------------------------------ */
    /* AUTOPLAY                                                             */
    /* ------------------------------------------------------------------ */

    function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(() => {
            if (!isUserInteracting) goNext();
        }, AUTOPLAY_INTERVAL);
    }

    function stopAutoplay() {
        if (autoplayTimer) {
            clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
    }

    function pauseAutoplay() {
        isUserInteracting = true;
        clearTimeout(interactionTimer);
        // Resume after 8s of no interaction
        interactionTimer = setTimeout(() => {
            isUserInteracting = false;
        }, 8000);
    }

    /* ------------------------------------------------------------------ */
    /* EVENTS                                                               */
    /* ------------------------------------------------------------------ */

    btnNext.addEventListener('click', () => {
        goNext();
        pauseAutoplay();
    });

    btnPrev.addEventListener('click', () => {
        goPrev();
        pauseAutoplay();
    });

    // Pause on hover over carousel
    viewport.addEventListener('mouseenter', () => { isUserInteracting = true; });
    viewport.addEventListener('mouseleave', () => { isUserInteracting = false; });

    // Touch / swipe support
    let touchStartX = 0;
    viewport.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        pauseAutoplay();
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
        const delta = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(delta) > 50) {
            delta > 0 ? goNext() : goPrev();
        }
    }, { passive: true });

    // Keyboard navigation when carousel is focused
    document.getElementById('blogCarousel').addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { goPrev(); pauseAutoplay(); }
        if (e.key === 'ArrowRight') { goNext(); pauseAutoplay(); }
    });

    // Responsive: recalculate on resize
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const newCount = getVisibleCount();
            if (newCount !== visibleCount) {
                visibleCount = newCount;
                currentIndex = 0;
                buildDots();
                applyTransform();
                updateArrows();
            }
        }, 150);
    });

    // Pause when tab not visible (perf)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoplay();
        else startAutoplay();
    });

    /* ------------------------------------------------------------------ */
    /* INIT — Use embedded data first, fallback to fetch                     */
    /* ------------------------------------------------------------------ */

    function init(data) {
        // Sort by date desc, take most recent MAX_ARTICLES
        articles = (Array.isArray(data) ? data : [])
            .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
            .slice(0, MAX_ARTICLES);

        if (!articles.length) {
            document.getElementById('free-content').style.display = 'none';
            return;
        }

        visibleCount = getVisibleCount();

        buildCards();
        buildDots();
        applyTransform();
        updateArrows();
        startAutoplay();
    }

    // 1) Try inline data first (works on file:// and server)
    if (window.featuredArticles && window.featuredArticles.length) {
        init(window.featuredArticles);
    } else {
        // 2) Fallback: fetch from server
        fetch(ARTICLES_JSON_URL)
            .then(res => {
                if (!res.ok) throw new Error('articles.json not found');
                return res.json();
            })
            .then(data => {
                const list = Array.isArray(data) ? data : (data.articles || []);
                init(list);
            })
            .catch(() => {
                // Hide section silently if no data available
                const section = document.getElementById('free-content');
                if (section) section.style.display = 'none';
            });
    }

})();
