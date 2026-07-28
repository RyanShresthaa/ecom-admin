-- Blog posts (admin-managed journal) + seed of existing storefront content.

CREATE TABLE IF NOT EXISTS blog_posts (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(200) NOT NULL UNIQUE,
    title VARCHAR(500) NOT NULL,
    subtitle TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    category VARCHAR(120) NOT NULL DEFAULT '',
    image VARCHAR(500) NOT NULL DEFAULT '',
    learn_section_title VARCHAR(255) NOT NULL DEFAULT '',
    learn_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    conclusion TEXT NOT NULL DEFAULT '',
    published BOOLEAN NOT NULL DEFAULT true,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at
    ON blog_posts (published, published_at DESC);

INSERT INTO blog_posts (
    slug, title, subtitle, content, category, image,
    learn_section_title, learn_items, conclusion, published, published_at
) VALUES
(
    'empowering-entrepreneurs-success-unveiled',
    'Empowering Entrepreneurs Success Unveiled',
    'The blueprint for entrepreneurial growth',
    'Starting a business is a thrilling venture, but scaling it requires a strategic mindset and operational excellence. In today''s competitive landscape, entrepreneurs must leverage modern tools and build a strong foundation to navigate challenges and achieve sustainable growth.',
    'Entrepreneurs',
    '/images/about/team/team-1.png',
    'Key Strategies for Success:',
    '[
      {"title":"Mindset Shift","description":"Transitioning from a solo creator to a strategic leader who delegates and focuses on high-impact goals."},
      {"title":"Digital Leverage","description":"Implementing the latest cloud platforms and automated workflows to streamline operations."},
      {"title":"Financial Hygiene","description":"Developing robust cash flow management habits and regular financial audits to ensure stability."},
      {"title":"Network Building","description":"Connecting with mentors and industry peers to unlock new opportunities and partnerships."}
    ]'::jsonb,
    'By embracing these strategies, modern entrepreneurs can transform their visions into thriving enterprises. Success is not a matter of chance, but a deliberate sequence of smart decisions and continuous learning.',
    true,
    '2023-11-21T12:00:00Z'
),
(
    'thriving-in-a-dynamic-startup-landscape',
    'Thriving in a Dynamic Startup Landscape',
    'Adapting and winning in fast moving markets',
    'The startup ecosystem is known for rapid shifts and intense competition. To survive and thrive, startup founders need to remain agile, listen closely to customer feedback, and build a culture of rapid experimentation.',
    'Startups',
    '/images/about/team/team-2.png',
    'How to Build a Resilient Startup',
    '[
      {"title":"Agile Methodology","description":"Structuring teams to adapt quickly to changing customer needs and market dynamics."},
      {"title":"Customer Centric Feedback","description":"Setting up channels to receive direct input and iterate on products in real-time."},
      {"title":"Culture of Innovation","description":"Encouraging team members to take calculated risks and learn from failures."},
      {"title":"Resource Allocation","description":"Budgeting efficiently to extend runway and optimize product-market fit."}
    ]'::jsonb,
    'Thriving in a dynamic startup landscape requires a balance of resilience, flexibility, and razor-sharp execution. Founders who focus on customer value will lead the market.',
    true,
    '2023-12-08T12:00:00Z'
),
(
    'strategies-propelling-tech-startups-to-success',
    'Strategies Propelling Tech Startups to Success',
    'Scaling tech innovations effectively',
    'Tech startups face unique challenges, from selecting the right tech stack to managing product scale and cybersecurity. Leveraging scalable architectures and clear development roadmaps is key to unlocking explosive growth.',
    'Tech Industry',
    '/images/about/team/team-3.png',
    'Core Pillars of Tech Scalability:',
    '[
      {"title":"Scalable Infrastructure","description":"Adopting cloud-native technologies that grow seamlessly with your user base."},
      {"title":"Technical Debt Management","description":"Balancing speed of feature delivery with clean, maintainable code architectures."},
      {"title":"Security and Compliance","description":"Implementing top-tier encryption and standard security guidelines from day one."},
      {"title":"Talent Acquisition","description":"Recruiting and retaining diverse, high-performing engineering and product teams."}
    ]'::jsonb,
    'Scaling a technology startup demands a robust combination of engineering discipline and product focus. Build for the future while delivering value today.',
    true,
    '2023-12-08T14:00:00Z'
),
(
    'pioneering-the-future-in-our-startup-showcase',
    'Pioneering the Future in Our Startup Showcase',
    'Spotlighting the disruptors of tomorrow',
    'In our latest startup showcase, we highlight the visionaries who are redefining industries through cutting-edge technology and creative business models. These startups are bridging gaps and solving real-world problems with unique solutions.',
    'Innovation',
    '/images/about/team/team-4.png',
    'Key Themes in Modern Innovation:',
    '[
      {"title":"Sustainable Solutions","description":"Startups integrating green practices and climate tech into their core offerings."},
      {"title":"Decentralized Services","description":"How decentralized architectures are shifting power back to creators and end-users."},
      {"title":"Creative Business Models","description":"Moving beyond traditional SaaS to community-driven and usage-based pricing."},
      {"title":"Global Expansion","description":"Leveraging remote work and digital channels to serve international markets from inception."}
    ]'::jsonb,
    'The future is being built by those bold enough to challenge the status quo. Our startup showcase celebrates the persistence and creativity of these modern pioneers.',
    true,
    '2023-12-08T16:00:00Z'
),
(
    'artificial-intelligence-impact-on-modern-industries',
    'Artificial Intelligence Impact on Modern Industries',
    'Navigating the AI revolution in business',
    'Artificial intelligence is no longer a concept of the future. From automated customer support to advanced predictive analytics, AI is actively reshaping how businesses operate, innovate, and connect with customers.',
    'Artificial Intelligence',
    '/images/about/team/team-1.png',
    'Key Areas of AI Transformation:',
    '[
      {"title":"Generative AI Workflows","description":"Harnessing language models and image generators to speed up creative and administrative tasks."},
      {"title":"Data-Driven Decisions","description":"Using machine learning to uncover hidden trends and forecast customer behavior accurately."},
      {"title":"Customer Experience","description":"Implementing smart chatbots and recommendation engines to personalize user interactions."},
      {"title":"Ethics and Security","description":"Balancing rapid AI adoption with data privacy, transparency, and fairness."}
    ]'::jsonb,
    'Embracing AI is essential for staying competitive in today''s digital economy. Businesses that build a strong AI roadmap today will be the leaders of tomorrow.',
    true,
    '2023-12-11T12:00:00Z'
),
(
    'healthy-eating-habits-for-a-busy-lifestyle',
    'Healthy Eating Habits for a Busy Lifestyle',
    'Nourishing your body amidst a hectic schedule',
    'Maintaining a healthy diet can feel like an uphill battle when juggling meetings, family responsibilities, and personal goals. However, with simple meal prepping and mindful food choices, eating well can become second nature.',
    'Lifestyle & Wellness',
    '/images/about/team/team-2.png',
    'Practical Tips for Healthy Living:',
    '[
      {"title":"Meal Prep Strategies","description":"Spending just two hours on Sunday to prep nutritious ingredients for the busy week ahead."},
      {"title":"Smart Snacking","description":"Keeping whole foods like nuts, fruits, and yogurt nearby to avoid reaching for processed options."},
      {"title":"Mindful Hydration","description":"Ensuring adequate water intake to boost energy levels, digestion, and cognitive focus."},
      {"title":"Intuitive Eating","description":"Listening to your body''s true hunger cues rather than eating out of stress or boredom."}
    ]'::jsonb,
    'Prioritizing your nutrition doesn''t require hours in the kitchen every day. Simple, consistent adjustments will yield high energy and long-term wellness.',
    true,
    '2023-12-11T14:00:00Z'
)
ON CONFLICT (slug) DO NOTHING;
