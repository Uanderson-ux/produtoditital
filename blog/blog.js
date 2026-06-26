// Client-side script for ProdutoDigital Blog
document.addEventListener('DOMContentLoaded', () => {
    initFaqAccordion();
    initBlogEngine();
});

/**
 * FAQ Accordion Toggles
 */
function initFaqAccordion() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            const item = question.parentElement;
            const answer = item.querySelector('.faq-answer');
            const isActive = item.classList.contains('active');
            
            // Close all other FAQ items
            document.querySelectorAll('.faq-item').forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-answer').style.maxHeight = null;
                }
            });
            
            // Toggle current item
            if (isActive) {
                item.classList.remove('active');
                answer.style.maxHeight = null;
            } else {
                item.classList.add('active');
                answer.style.maxHeight = answer.scrollHeight + 'px';
            }
        });
    });
}

/**
 * Dynamic Search, Category Filtering, and Pagination
 */
function initBlogEngine() {
    const grid = document.getElementById('articlesGrid');
    const searchInput = document.getElementById('searchInput');
    const categoryPills = document.querySelectorAll('.category-pill');
    const paginationContainer = document.getElementById('pagination');
    
    // Check if we are on the blog home page (these elements will exist)
    if (!grid || !window.blogArticles) return;

    let articles = window.blogArticles;
    let currentCategory = 'all';
    let searchQuery = '';
    let currentPage = 1;
    const itemsPerPage = 6;

    // Event listener for Search
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            currentPage = 1;
            renderBlog();
        });
    }

    // Event listeners for Category pills
    categoryPills.forEach(pill => {
        pill.addEventListener('click', () => {
            categoryPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            currentCategory = pill.getAttribute('data-category');
            currentPage = 1;
            renderBlog();
        });
    });

    /**
     * Filters, paginates, and renders the article cards
     */
    function renderBlog() {
        // 1. Filter articles
        const filtered = articles.filter(article => {
            const matchesCategory = currentCategory === 'all' || 
                                    article.category.toLowerCase() === currentCategory.toLowerCase();
            
            const matchesSearch = !searchQuery || 
                                  article.title.toLowerCase().includes(searchQuery) ||
                                  article.description.toLowerCase().includes(searchQuery) ||
                                  article.category.toLowerCase().includes(searchQuery) ||
                                  (article.tags && article.tags.some(tag => tag.toLowerCase().includes(searchQuery)));
            
            return matchesCategory && matchesSearch;
        });

        // 2. Paginate
        const totalItems = filtered.length;
        const totalPages = Math.ceil(totalItems / itemsPerPage);
        
        // Adjust current page if out of bounds
        if (currentPage > totalPages && totalPages > 0) {
            currentPage = totalPages;
        }

        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

        // 3. Render Grid
        if (totalItems === 0) {
            grid.innerHTML = `
                <div class="no-results">
                    Nenhum artigo encontrado para a sua busca ou categoria selecionada.
                </div>
            `;
        } else {
            grid.innerHTML = paginatedItems.map(article => createTaskCardHtml(article)).join('');
        }

        // 4. Render Pagination Controls
        renderPaginationControls(totalPages);
    }

    /**
     * Helper to render Pagination buttons
     */
    function renderPaginationControls(totalPages) {
        if (!paginationContainer) return;
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }

        let html = '';
        
        // Prev button
        html += `
            <button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">
                &laquo;
            </button>
        `;

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            html += `
                <button class="pagination-btn ${currentPage === i ? 'active' : ''}" data-page="${i}">
                    ${i}
                </button>
            `;
        }

        // Next button
        html += `
            <button class="pagination-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}">
                &raquo;
            </button>
        `;

        paginationContainer.innerHTML = html;

        // Add event listeners to pagination buttons
        paginationContainer.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const page = parseInt(btn.getAttribute('data-page'));
                if (page && page !== currentPage) {
                    currentPage = page;
                    renderBlog();
                    // Scroll back to top of filter section
                    const offsetElement = document.querySelector('.search-filter-section');
                    if (offsetElement) {
                        window.scrollTo({
                            top: offsetElement.offsetTop - 100,
                            behavior: 'smooth'
                        });
                    }
                }
            });
        });
    }

    /**
     * Helper to output article card HTML
     */
    function createTaskCardHtml(article) {
        // Formating Date to PT-BR (YYYY-MM-DD to DD/MM/YYYY)
        const dateParts = article.date.split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : article.date;

        return `
            <article class="article-card">
                <a href="/blog/${article.slug}/">
                    <img src="${article.image}" alt="${article.title}" class="article-card-image" loading="lazy">
                </a>
                <div class="article-card-body">
                    <div class="article-card-meta">
                        <span class="article-card-category">${article.category}</span>
                        <time class="article-card-date" datetime="${article.date}">${formattedDate}</time>
                    </div>
                    <h3 class="article-card-title">
                        <a href="/blog/${article.slug}/">${article.title}</a>
                    </h3>
                    <p class="article-card-excerpt">${article.description}</p>
                    <a href="/blog/${article.slug}/" class="read-more-btn">
                        Ler Artigo <span>&rarr;</span>
                    </a>
                </div>
            </article>
        `;
    }
}
