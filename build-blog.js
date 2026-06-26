const fs = require('fs');
const path = require('path');

// Configure Paths
const paths = {
    articlesJson: path.join(__dirname, 'blog', 'articles.json'),
    homeTemplate: path.join(__dirname, 'blog', 'templates', 'blog-home.html'),
    articleTemplate: path.join(__dirname, 'blog', 'templates', 'article.html'),
    outputBlogDir: path.join(__dirname, 'blog'),
    outputHome: path.join(__dirname, 'blog', 'index.html'),
    outputSitemap: path.join(__dirname, 'sitemap.xml'),
};

console.log('🚀 Iniciando compilação do Blog...');

try {
    // 1. Load articles database
    if (!fs.existsSync(paths.articlesJson)) {
        throw new Error(`Banco de dados de artigos não encontrado em: ${paths.articlesJson}`);
    }
    const rawArticles = JSON.parse(fs.readFileSync(paths.articlesJson, 'utf-8'));
    
    // Sort articles by date (most recent first)
    const articles = rawArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log(`📚 Carregados ${articles.length} artigos.`);

    // Load templates
    if (!fs.existsSync(paths.homeTemplate)) {
        throw new Error(`Template da home do blog não encontrado em: ${paths.homeTemplate}`);
    }
    if (!fs.existsSync(paths.articleTemplate)) {
        throw new Error(`Template do artigo não encontrado em: ${paths.articleTemplate}`);
    }
    const homeTemplateContent = fs.readFileSync(paths.homeTemplate, 'utf-8');
    const articleTemplateContent = fs.readFileSync(paths.articleTemplate, 'utf-8');

    // 2. Compile each individual article
    articles.forEach((article, index) => {
        console.log(`✍️ Compilando artigo: ${article.slug}...`);
        
        // Output directory for the friendly URL (e.g. blog/como-formatar-windows-11/)
        const articleDir = path.join(paths.outputBlogDir, article.slug);
        if (!fs.existsSync(articleDir)) {
            fs.mkdirSync(articleDir, { recursive: true });
        }

        // Build Meta SEO block
        const metaSeo = `
    <title>${article.title} | ProdutoDigital</title>
    <meta name="description" content="${article.description}">
    <link rel="canonical" href="https://produtodigital.org/blog/${article.slug}/">
    <meta property="og:title" content="${article.title} | ProdutoDigital">
    <meta property="og:description" content="${article.description}">
    <meta property="og:image" content="${article.image}">
    <meta property="og:url" content="https://produtodigital.org/blog/${article.slug}/">
    <meta property="og:type" content="article">
        `.trim();

        // Build Schema Article JSON-LD
        const schemaArticle = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": ${JSON.stringify(article.title)},
      "description": ${JSON.stringify(article.description)},
      "image": ${JSON.stringify(article.image)},
      "datePublished": "${article.date}",
      "author": {
        "@type": "Organization",
        "name": "ProdutoDigital",
        "url": "https://produtodigital.org"
      },
      "publisher": {
        "@type": "Organization",
        "name": "ProdutoDigital",
        "logo": {
          "@type": "ImageObject",
          "url": "https://produtodigital.org/assets/logo.png"
        }
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": "https://produtodigital.org/blog/${article.slug}/"
      }
    }
    </script>
        `.trim();

        // Build Schema FAQ JSON-LD (if FAQ exists)
        let schemaFaq = '';
        let faqHtml = '';
        if (article.faq && article.faq.length > 0) {
            const faqQuestions = article.faq.map(item => ({
                "@type": "Question",
                "name": item.question,
                "acceptedAnswer": {
                    "@type": "Answer",
                    "text": item.answer
                }
            }));

            schemaFaq = `
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": ${JSON.stringify(faqQuestions)}
    }
    </script>
            `.trim();

            const faqItemsHtml = article.faq.map(item => `
                <div class="faq-item">
                    <div class="faq-question">
                        <span>${item.question}</span>
                        <span class="faq-icon">+</span>
                    </div>
                    <div class="faq-answer">
                        <div class="faq-answer-content">
                            <p>${item.answer}</p>
                        </div>
                    </div>
                </div>
            `).join('').trim();

            faqHtml = `
                <section class="faq-section">
                    <h2>Perguntas Frequentes (FAQ)</h2>
                    <div class="faq-list">
                        ${faqItemsHtml}
                    </div>
                </section>
            `.trim();
        }

        // Build Breadcrumbs HTML
        const breadcrumbsHtml = `
            <a href="../../index.html">Início</a>
            <span class="separator">&gt;</span>
            <a href="../index.html">Blog</a>
            <span class="separator">&gt;</span>
            <a href="../index.html?category=${encodeURIComponent(article.category)}">${article.category}</a>
            <span class="separator">&gt;</span>
            <span class="current">${article.title}</span>
        `.trim();

        // Format Date (PT-BR: DD/MM/YYYY)
        const dateParts = article.date.split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : article.date;

        // Build CTA Section
        let ctaHtml = '';
        if (article.cta && article.cta.title) {
            ctaHtml = `
                <section class="cta-banner">
                    <h3 class="cta-title">${article.cta.title}</h3>
                    <p class="cta-text">${article.cta.text}</p>
                    <a href="${article.cta.url}" class="btn-cta" target="_blank">${article.cta.buttonText}</a>
                </section>
            `.trim();
        }

        // Build Related Articles (Select 3 related from same category, or fill with latest)
        let related = articles.filter(art => art.slug !== article.slug && art.category === article.category);
        if (related.length < 3) {
            const extra = articles.filter(art => art.slug !== article.slug && art.category !== article.category);
            related = related.concat(extra).slice(0, 3);
        }

        const relatedHtml = related.map(rel => {
            const relDateParts = rel.date.split('-');
            const relFormattedDate = relDateParts.length === 3 ? `${relDateParts[2]}/${relDateParts[1]}/${relDateParts[0]}` : rel.date;

            return `
                <article class="article-card">
                    <a href="../${rel.slug}/index.html">
                        <img src="${rel.image}" alt="${rel.title}" class="article-card-image" loading="lazy">
                    </a>
                    <div class="article-card-body">
                        <div class="article-card-meta">
                            <span class="article-card-category">${rel.category}</span>
                            <time class="article-card-date" datetime="${rel.date}">${relFormattedDate}</time>
                        </div>
                        <h4 class="article-card-title">
                            <a href="../${rel.slug}/index.html">${rel.title}</a>
                        </h4>
                        <p class="article-card-excerpt">${rel.description}</p>
                        <a href="../${rel.slug}/index.html" class="read-more-btn">
                            Ler Artigo <span>&rarr;</span>
                        </a>
                    </div>
                </article>
            `;
        }).join('').trim();

        // Compile article HTML
        let compiled = articleTemplateContent
            .replace('<!-- META_SEO_PLACEHOLDER -->', metaSeo)
            .replace('<!-- SCHEMA_ARTICLE_PLACEHOLDER -->', schemaArticle)
            .replace('<!-- SCHEMA_FAQ_PLACEHOLDER -->', schemaFaq)
            .replace('<!-- BREADCRUMBS_PLACEHOLDER -->', breadcrumbsHtml)
            .replace('<!-- ARTICLE_CATEGORY_PLACEHOLDER -->', article.category)
            .replace('<!-- ARTICLE_TITLE_PLACEHOLDER -->', article.title)
            .replace('<!-- DATE_ISO_PLACEHOLDER -->', article.date)
            .replace('<!-- ARTICLE_DATE_PLACEHOLDER -->', formattedDate)
            .replace('<!-- ARTICLE_IMAGE_PLACEHOLDER -->', article.image)
            .replace('<!-- ARTICLE_ALT_PLACEHOLDER -->', article.title)
            .replace('<!-- ARTICLE_CONTENT_PLACEHOLDER -->', article.content)
            .replace('<!-- FAQ_SECTION_PLACEHOLDER -->', faqHtml)
            .replace('<!-- CTA_SECTION_PLACEHOLDER -->', ctaHtml)
            .replace('<!-- RELATED_ARTICLES_PLACEHOLDER -->', relatedHtml);

        // Minify compiled article
        compiled = minifyHtml(compiled);

        fs.writeFileSync(path.join(articleDir, 'index.html'), compiled, 'utf-8');
    });

    // 3. Compile the Blog Homepage (/blog/index.html)
    console.log('✍️ Compilando página principal do blog...');
    
    // Build Meta SEO block for home
    const homeMetaSeo = `
    <title>Blog | ProdutoDigital - Artigos e Tutoriais</title>
    <meta name="description" content="Aprenda técnicas de formatação, dicas de Windows/Office, inteligência artificial, marketing digital e canais dark para escalar sua renda online.">
    <link rel="canonical" href="https://produtodigital.org/blog/">
    <meta property="og:title" content="Blog | ProdutoDigital - Artigos e Tutoriais">
    <meta property="og:description" content="Aprenda técnicas de formatação, dicas de Windows/Office, inteligência artificial e muito mais.">
    <meta property="og:image" content="https://produtodigital.org/assets/og-blog-home.png">
    <meta property="og:url" content="https://produtodigital.org/blog/">
    <meta property="og:type" content="website">
    `.trim();

    // Compile Static Articles Grid (Pre-render ALL articles for crawler searchability)
    const homeArticlesGridHtml = articles.map(article => {
        const dateParts = article.date.split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : article.date;

        return `
            <article class="article-card">
                <a href="${article.slug}/index.html">
                    <img src="${article.image}" alt="${article.title}" class="article-card-image" loading="lazy">
                </a>
                <div class="article-card-body">
                    <div class="article-card-meta">
                        <span class="article-card-category">${article.category}</span>
                        <time class="article-card-date" datetime="${article.date}">${formattedDate}</time>
                    </div>
                    <h3 class="article-card-title">
                        <a href="${article.slug}/index.html">${article.title}</a>
                    </h3>
                    <p class="article-card-excerpt">${article.description}</p>
                    <a href="${article.slug}/index.html" class="read-more-btn">
                        Ler Artigo <span>&rarr;</span>
                    </a>
                </div>
            </article>
        `;
    }).join('').trim();

    // Compile Sidebar Recent Posts (Up to 3)
    const recentArticlesHtml = articles.slice(0, 3).map(article => {
        const dateParts = article.date.split('-');
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : article.date;

        return `
            <div class="recent-post-item">
                <img src="${article.image}" alt="${article.title}" class="recent-post-thumb">
                <div class="recent-post-info">
                    <h4 class="recent-post-title">
                        <a href="${article.slug}/index.html">${article.title}</a>
                    </h4>
                    <span class="recent-post-date">${formattedDate}</span>
                </div>
            </div>
        `;
    }).join('').trim();

    // Create minified JSON payload (remove content/faq/cta to save bandwidth)
    const minifiedJsonData = articles.map(art => ({
        slug: art.slug,
        title: art.title,
        description: art.description,
        category: art.category,
        image: art.image,
        date: art.date,
        tags: art.tags || []
    }));

    let compiledHome = homeTemplateContent
        .replace('<!-- META_SEO_PLACEHOLDER -->', homeMetaSeo)
        .replace('<!-- ARTICLES_GRID_PLACEHOLDER -->', homeArticlesGridHtml)
        .replace('<!-- RECENT_ARTICLES_PLACEHOLDER -->', recentArticlesHtml);

    compiledHome = minifyHtml(compiledHome);
    
    // Inject JSON after minification to avoid regex stripping or JSON corruption
    compiledHome = compiledHome.replace('__ARTICLES_JSON_PLACEHOLDER__', JSON.stringify(minifiedJsonData));

    fs.writeFileSync(paths.outputHome, compiledHome, 'utf-8');
    console.log('✅ Página principal do blog compilada com sucesso.');

    // 4. Update root sitemap.xml
    console.log('🗺️ Atualizando sitemap.xml...');
    
    let sitemapUrls = `
    <!-- Homepage principal da loja -->
    <url>
        <loc>https://produtodigital.org/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <!-- Página de Achadinhos Virais -->
    <url>
        <loc>https://produtodigital.org/achadinhos/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
    <!-- Blog Homepage -->
    <url>
        <loc>https://produtodigital.org/blog/</loc>
        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
    `.trim();

    articles.forEach(article => {
        sitemapUrls += `
    <!-- Artigo: ${article.title} -->
    <url>
        <loc>https://produtodigital.org/blog/${article.slug}/</loc>
        <lastmod>${article.date}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.8</priority>
    </url>
        `;
    });

    const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.trim()}
</urlset>
`;

    fs.writeFileSync(paths.outputSitemap, sitemapContent, 'utf-8');
    console.log('✅ sitemap.xml atualizado com sucesso.');
    console.log('🎉 Compilação concluída com sucesso!');

} catch (err) {
    console.error('❌ Erro na compilação do blog:', err.message);
    process.exit(1);
}

/**
 * Helper to minify compiled HTML (DISABLED for better readability during development)
 */
function minifyHtml(html) {
    return html; // Return original readable HTML
}
