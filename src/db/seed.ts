import bcrypt from 'bcryptjs';
import { execute, getDb, query, queryOne, saveDb } from './db.js';

export async function seedDatabase(force = false) {
  const db = await getDb();

  // Check if users already exist
  const existingUsers = await query('SELECT COUNT(*) as count FROM users');
  const count = (existingUsers[0]?.count as number) || 0;
  if (count > 0 && !force) {
    console.log(`Database already contains ${count} users. Skipping seed.`);
    return;
  }

  console.log('Seeding relational database for MOSAIC...');

  // Reset existing tables if force
  if (force) {
    db.run(`
      DELETE FROM notifications;
      DELETE FROM collection_stories;
      DELETE FROM collections;
      DELETE FROM follows;
      DELETE FROM bookmarks;
      DELETE FROM reactions;
      DELETE FROM comment_likes;
      DELETE FROM comments;
      DELETE FROM story_tags;
      DELETE FROM tags;
      DELETE FROM stories;
      DELETE FROM categories;
      DELETE FROM users;
      DELETE FROM password_reset_tokens;
    `);
  }

  // 1. Categories
  const categoriesData = [
    { name: 'Technology', slug: 'technology', description: 'Computing, artificial intelligence, hardware, and digital futures.', color: '#2C5E55' },
    { name: 'College', slug: 'college', description: 'Campus discoveries, student research, late-night labs, and campus life.', color: '#8C4329' },
    { name: 'Design', slug: 'design', description: 'Typography, tactile interfaces, human-centered systems, and aesthetics.', color: '#6A4C93' },
    { name: 'Travel', slug: 'travel', description: 'Quiet corners of the world, solo journeys, and landscape memoirs.', color: '#1F6F8B' },
    { name: 'Life', slug: 'life', description: 'Meditations on time, solitude, relationships, and the art of living.', color: '#5B7065' },
    { name: 'Science', slug: 'science', description: 'Physics, biology, cognitive neuroscience, astronomy, and curiosity.', color: '#3A506B' },
    { name: 'Business', slug: 'business', description: 'Bootstrapping, ethical entrepreneurship, strategy, and work culture.', color: '#8A5A36' },
    { name: 'Programming', slug: 'programming', description: 'Software architecture, language design, craftsmanship, and systems.', color: '#2B580C' },
    { name: 'Culture', slug: 'culture', description: 'Books, cinema, architecture, culinary traditions, and human stories.', color: '#9E3D64' },
    { name: 'Personal', slug: 'personal', description: 'Intimate essays, honest memoirs, journals, and reflections.', color: '#B3541E' }
  ];

  for (const cat of categoriesData) {
    await execute(
      'INSERT INTO categories (name, slug, description, color) VALUES (?, ?, ?, ?)',
      [cat.name, cat.slug, cat.description, cat.color]
    );
  }

  // 2. Users (8 realistic users including admin, creators, researchers, essayists)
  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  const usersData = [
    {
      name: 'Elena Rostova',
      username: 'elena',
      email: 'elena@mosaic.mag',
      password_hash: defaultPasswordHash,
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      bio: 'Editorial Director at MOSAIC. Writing about human-computer interaction, typography, and quiet design spaces.',
      role: 'admin'
    },
    {
      name: 'Julian Vance',
      username: 'julian',
      email: 'julian@mosaic.mag',
      password_hash: defaultPasswordHash,
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      bio: 'Doctoral candidate in Cognitive Science. Observing how tactile interfaces shape human memory.',
      role: 'creator'
    },
    {
      name: 'Maya Lin Chen',
      username: 'mayachen',
      email: 'maya@mosaic.mag',
      password_hash: defaultPasswordHash,
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      bio: 'Systems programmer & compiler enthusiast. Finding folk art and poetry in assembly and distributed protocols.',
      role: 'creator'
    },
    {
      name: 'Marcus Bell',
      username: 'marcusbell',
      email: 'marcus@mosaic.mag',
      password_hash: defaultPasswordHash,
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      bio: 'Bootstrapper & craft furniture maker. Exploring why small businesses with zero VC funding outlive unicorns.',
      role: 'creator'
    },
    {
      name: 'Dr. Sophia Thorne',
      username: 'sophiathorne',
      email: 'sophia@mosaic.mag',
      password_hash: defaultPasswordHash,
      avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      bio: 'Biophysicist studying protein folding and bioluminescence. Occasional landscape watercolorist.',
      role: 'creator'
    },
    {
      name: 'Liam O’Connor',
      username: 'liamoc',
      email: 'liam@mosaic.mag',
      password_hash: defaultPasswordHash,
      avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80',
      bio: 'College senior, computer science & philosophy. Writing dispatches from campus dorms and midnight hackathons.',
      role: 'user'
    },
    {
      name: 'Aria Takahashi',
      username: 'ariataka',
      email: 'aria@mosaic.mag',
      password_hash: defaultPasswordHash,
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      bio: 'Travel essayist and architectural photographer based between Kyoto and Lisbon.',
      role: 'creator'
    },
    {
      name: 'Devin Harper',
      username: 'devinharper',
      email: 'devin@mosaic.mag',
      password_hash: defaultPasswordHash,
      avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=400&q=80',
      bio: 'Curious reader, avid collector of secondhand books and thoughtful long-form essays.',
      role: 'user'
    }
  ];

  for (const u of usersData) {
    await execute(
      'INSERT INTO users (name, username, email, password_hash, avatar_url, bio, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [u.name, u.username, u.email, u.password_hash, u.avatar_url, u.bio, u.role]
    );
  }

  // 3. Tags
  const tagsList = [
    'CognitiveScience', 'Minimalism', 'Typography', 'Architecture', 'Python',
    'OpenSource', 'Neuroscience', 'Bootstrapping', 'Hardware', 'CampusLife',
    'Philosophy', 'Craftsmanship', 'DesignSystems', 'Japan'
  ];

  for (const tag of tagsList) {
    await execute(
      'INSERT INTO tags (name, slug) VALUES (?, ?)',
      [tag, tag.toLowerCase()]
    );
  }

  // 4. Stories (16 rich stories covering all categories with varied tile sizes)
  const storiesData = [
    {
      title: 'Why Small Interfaces Feel Better: The Lost Art of Subtlety',
      subtitle: 'When software stops clamoring for our attention, room appears for contemplation.',
      slug: 'why-small-interfaces-feel-better',
      category: 'Design',
      author: 'elena',
      reading_time: 6,
      tile_size: 'featured',
      cover_image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1200&q=80',
      views: 1420,
      content: `In the early days of personal computing, an interface was a polite guest in the room. It waited on your desktop, quiet as a notepad, speaking only when clicked.

Somewhere around 2014, interfaces transformed from instruments into carnivals. They gained pulsing badges, celebratory confetti on trivial tasks, floating snackbars begging for feedback, and modals masquerading as urgency. The modern web rarely allows an eye to rest without something wiggling on the periphery.

When we strip back that artificial velocity, something startling happens: the screen becomes an extension of thought rather than a rival for attention. Small interfaces do not shout their affordances. They rely on high-fidelity typographic rhythm, generous negative space, and predictable tactile physics. 

A well-crafted tile does not need a vibrant neon border to demand attention. In the same way that a gallery wall uses quiet matte borders to let paintings breathe, our digital canvases ought to honor the reader’s innate intelligence. When an application whispers, you lean in. When it screams, you reach for the tab's close button.`
    },
    {
      title: 'The Quiet Revolution Happening Inside College Labs',
      subtitle: 'Behind locked basement doors at 2 AM, undergraduate researchers are quietly rewiring the future of local machine intelligence.',
      slug: 'the-quiet-revolution-happening-inside-college-labs',
      category: 'College',
      author: 'liamoc',
      reading_time: 5,
      tile_size: 'large',
      cover_image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
      views: 980,
      content: `It is 2:14 AM on a damp Tuesday in late November. The university campus has surrendered to quiet mist, but in room B-14 of the engineering quad, three second-year students are clustered around a repurposed crypto rig with wires spilling over discarded thermal paste tubes.

Silicon Valley venture funds pour billions into massive cloud datacenters, yet here in academic basements, the counter-current is running hot: extreme quantization and edge inference. These students are running 8-billion parameter models on $80 single-board computers by pruning redundant neural pathways down to 2-bit weights.

"The cloud wants you to rent your thoughts per token forever," Liam whispered, pointing at an oscilloscope trace. "We want sovereign machines that run in a rural clinic with a solar battery and zero cell reception."

There is an electric camaraderie in university labs that no corporate open-plan office can replicate. The lack of commercial pressure fosters wild, unpragmatic tangents that inevitably become tomorrow's foundational discoveries.`
    },
    {
      title: 'Three Things I Wish I Knew Before Learning Python',
      subtitle: 'Beyond syntax and tutorial hell: what the manuals never tell you about mental models and memory overhead.',
      slug: 'three-things-i-wish-i-knew-before-learning-python',
      category: 'Programming',
      author: 'mayachen',
      reading_time: 4,
      tile_size: 'medium',
      cover_image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      views: 2150,
      content: `When newcomers are introduced to Python, the sales pitch is always its English-like readability: \`for item in collection:\`. It sounds effortless.

Yet having spent a decade profiling production services, three deceptive traps consistently trip up eager developers:

1. Everything is a pointer, and identity is not equality. Python’s pass-by-object-reference model leads to silent state mutation bugs when default parameters are mutable lists or dictionaries.
2. The Global Interpreter Lock (GIL) is not your enemy—it is a mirror. Writing multi-threaded code in Python requires understanding IO-bound vs CPU-bound bottlenecks before sprinkling threads across an event loop.
3. List comprehensions are not just syntactic sugar; they are bytecode-optimized loops that skip standard stack frames.

The beauty of Python reveals itself when you stop treating it like pseudocode and begin respecting the CPython runtime under the hood.`
    },
    {
      title: 'The Architecture of Solitude: Kyoto’s Hidden Courtyards',
      subtitle: 'How Japanese wooden temples choreograph sunlight, silence, and spatial stillness.',
      slug: 'the-architecture-of-solitude',
      category: 'Travel',
      author: 'ariataka',
      reading_time: 7,
      tile_size: 'medium',
      cover_image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
      views: 890,
      content: `Turn off the bustling Shijo-dori avenue in Kyoto, walk three blocks through an alleyway no wider than outstretched arms, and you step across a cypress threshold into Daitoku-ji. The city noise dissolves instantly into the gentle drip of bamboo fountains.

Japanese traditional architecture understands negative space (ma, 間) not as emptiness, but as a presence charged with potential. The engawa—the open wooden veranda that borders the tatami rooms—acts neither as interior nor exterior, but as an ambiguous threshold where rain is heard before it is felt.

Here, solitude is not an accident of geography; it is choreographed into sliding cedar screens and combed granite gravel that mirrors ocean swells. In an age of relentless stimulation, these ancient temples offer an antidote: spaces designed to remind you that your internal world is vast enough to hold everything.`
    },
    {
      title: 'Quantum Coherence at Room Temperature: The Physics We Missed',
      subtitle: 'How photosynthetic bacteria solved the quantum transport problem millions of years before human laboratories.',
      slug: 'quantum-coherence-at-room-temperature',
      category: 'Science',
      author: 'sophiathorne',
      reading_time: 6,
      tile_size: 'large',
      cover_image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80',
      views: 1120,
      content: `For nearly a century, quantum physicists maintained that quantum effects—such as superposition and wave-function entanglement—could only survive in meticulously shielded cryogenic chambers near absolute zero. Any contact with warm, chaotic biological molecules would instantly induce decoherence.

Then came the investigation of the Fenna-Matthews-Olson (FMO) photosynthetic complex in green sulfur bacteria.

When a photon strikes an antenna pigment in these bacteria, the excitation does not take a random walk down classical energy gradients. Instead, it tests multiple molecular pathways simultaneously as a quantum probability wave, finding the reaction center with near 100% quantum efficiency at warm environmental temperatures.

Nature solved decoherence not by eliminating environmental noise, but by tuning molecular vibrations to actively shield and assist the quantum state. Biology, it turns out, is the premier quantum engineer.`
    },
    {
      title: 'What I Learned From Building My First Product In Silence',
      subtitle: 'Why abandoning "Build in Public" gave me the courage to make something genuinely strange and durable.',
      slug: 'building-first-product-in-silence',
      category: 'Business',
      author: 'marcusbell',
      reading_time: 5,
      tile_size: 'small',
      cover_image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
      views: 740,
      content: `The modern startup gospel commands you to broadcast every commit: post your MRR on Twitter, run polls on your color palette, and let the audience steer the wheel.

After 14 months of doing the exact opposite—disconnecting my social accounts and writing code in an isolated workshop—I realized that public feedback in early stages acts like wind on wet clay. It rounds off all the sharp, peculiar edges that make a creation extraordinary.

When nobody is watching, you don't build features to gather likes or conform to investor pitch deck trends. You build the exact tool you wish existed in your hands when you wake up at dawn. The resulting product won’t please everyone, but it will be loved deeply by the right few.`
    },
    {
      title: 'Can We Design Technology to Feel More Human?',
      subtitle: 'Exploring tactile interfaces, organic rhythms, and compassionate software engineering.',
      slug: 'design-technology-feel-more-human',
      category: 'Technology',
      author: 'julian',
      reading_time: 8,
      tile_size: 'featured',
      cover_image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
      views: 1890,
      content: `Look at the object you are holding or typing upon right now. It is likely a slick slab of aluminum and Gorilla glass, frictionless and hygienic. It registers touch through capacitance, offering sterile haptic vibrations that mimic physical switches without possessing their soul.

Human sensory perception evolved to navigate rough bark, woven wool, river stone, and paper grain. When every interaction is flattened into high-gloss pixels, our nervous system experiences a subtle, chronic starvation.

What if software respected the natural cycles of dusk and daylight? What if digital archives aged gracefully like leather notebooks, gaining soft patina around frequently revisited passages? 

Designing humane technology does not mean retro-nostalgia. It means recognizing that our cognitive architecture is organic, vulnerable, and deeply attuned to physical metaphors.`
    },
    {
      title: 'The Scent of Wet Slate: Memory, Geography, and Moving Away',
      subtitle: 'A meditation on childhood towns, coastal trains, and the strange weight of leaving.',
      slug: 'the-scent-of-wet-slate',
      category: 'Personal',
      author: 'elena',
      reading_time: 5,
      tile_size: 'medium',
      cover_image: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=800&q=80',
      views: 630,
      content: `Every town has its particular sensory signature. Mine was wet slate after an autumn drizzle, mingled with peat smoke from the brick cottages down by the tidal river.

When you move three thousand miles away to a city of glass towers and air-conditioned corridors, you realize that memory does not reside in photographs. It sits dormant in olfactory receptors and the temperature of evening wind against your collarbones.

We spend our twenties trying to outrun the provincial gravity of our hometowns, only to spend our thirties reconstructing their textures in tiny rituals: the type of teapot we buy, the tempo at which we walk on Sundays, the quiet books we keep on the nightstand.`
    },
    {
      title: 'The Ceramicist’s Clock: How Slowness Teaches Precision',
      subtitle: 'On clay, kiln temperature, and unlearning the toxic rhythm of immediate digital feedback.',
      slug: 'the-ceramicists-clock-how-slowness-teaches-precision',
      category: 'Life',
      author: 'marcusbell',
      reading_time: 6,
      tile_size: 'small',
      cover_image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
      views: 520,
      content: `In code, if you make a mistake, you hit \`Cmd+Z\`. The terminal returns instantly; the error log pinpoints line 42; the reload takes 200 milliseconds.

In ceramic pottery, there is no undo. If you rush the centering on the wheel, the centrifugal force will tear the wall apart three steps later. If you fire the bisque kiln with even 1% remaining moisture trapped within the vessel, the steam expansion will shatter not only your bowl, but everything adjacent on the refractory shelf.

Working with physical media forces you to abandon the delusion of instant mastery. It requires patience that modern productivity culture pathologizes as inefficiency. Yet true craftsmanship lives exclusively in that patient expanse.`
    },
    {
      title: 'The Death of the Monolith: Reflections on Modern Engineering',
      subtitle: 'We traded simple codebases for 40-service distributed nightmares. Was it worth the latency?',
      slug: 'death-of-the-monolith-reflections',
      category: 'Programming',
      author: 'mayachen',
      reading_time: 7,
      tile_size: 'medium',
      cover_image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=800&q=80',
      views: 1650,
      content: `Between 2016 and 2021, an entire generation of engineering teams dissolved working 50,000-line monolithic applications into dozens of microservices orchestrated across Kubernetes clusters with service meshes and distributed tracing agents.

The promise was autonomous teams and independent deploys. The reality for most 15-person companies was network latency, eventual consistency headaches, broken local development environments, and five-figure cloud bills.

A cohesive, modular monolith written with clean boundaries and compiled into a single binary is one of the highest achievements of human engineering. It is fast, easy to reason about, and runs happily on modest hardware.`
    },
    {
      title: 'The Geometry of Typography: Letters That Breathe on Paper and Screen',
      subtitle: 'Examining contrast ratios, optical sizes, and why modern web typography often feels lifeless.',
      slug: 'the-geometry-of-typography',
      category: 'Design',
      author: 'elena',
      reading_time: 6,
      tile_size: 'large',
      cover_image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
      views: 1340,
      content: `A letterform is not a black stamp on a white background; it is a sculpted vessel of whitespace. The counter inside the lowercase \`e\` or the arch of an \`n\` defines the tempo of human reading far more than the black strokes framing it.

When Aldus Manutius cut the first italic types in Venice in 1501, he was solving a physical problem of space: fitting Virgil’s poetry into pocket volumes that scholars could carry on journeys.

Today, variable fonts and sub-pixel hinting allow us to recreate the delicacy of lead punchcutting on glowing retina displays. Yet too many interfaces surrender to generic sans-serif geometric clones that lack human breath. When typography sings, reading feels as effortless as breathing.`
    },
    {
      title: 'The Biology of Wonder: How Neuroscience Explains Awe',
      subtitle: 'What happens in the brain when we stand before towering redwoods or starry horizons.',
      slug: 'the-biology-of-wonder',
      category: 'Science',
      author: 'sophiathorne',
      reading_time: 5,
      tile_size: 'small',
      cover_image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80',
      views: 890,
      content: `When subjects in fMRI scanners are shown panoramas of the Grand Canyon or images captured by the James Webb Space Telescope, neuroscientists observe a dramatic downregulation in the Default Mode Network (DMN)—the neural circuit responsible for self-referential rumination, ego defense, and chronic worrying.

Simultaneously, the vagus nerve stimulates the parasympathetic nervous system, slowing heart rate and inducing chills (goosebumps or piloerection).

Awe is not a frivolous poetic sentiment. Evolutionarily, it is an essential cognitive reset: an emotion designed to break us out of narcissistic loops and bind us to the larger living tapestry of the universe.`
    },
    {
      title: 'Bootstrapping Against the Tide: Why We Rejected Venture Capital',
      subtitle: 'The freedom to make decisions based on quality rather than 100x exponential growth metrics.',
      slug: 'bootstrapping-against-the-tide',
      category: 'Business',
      author: 'marcusbell',
      reading_time: 6,
      tile_size: 'medium',
      cover_image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
      views: 1100,
      content: `When you take outside institutional capital, you are not simply receiving money; you are signing up for a specific liquidity event within a fixed 7-to-10 year fund horizon.

That mandate forces companies to maximize speed over durability. Features get rushed, customer support gets outsourced to automated chatbots, and price hikes get imposed to satisfy board room growth projections.

Bootstrapping is slower, harder, and emotionally demanding in the first two years. But on year four, when your customers love your software and your business is sustainably profitable, you realize the ultimate luxury in tech: the freedom to say 'no'.`
    },
    {
      title: 'Midnight in the Print Shop: Preserving Analog Culture',
      subtitle: 'In an era of disposable digital feeds, letterpress printers are preserving tactile history with cast iron and ink.',
      slug: 'midnight-in-the-print-shop',
      category: 'Culture',
      author: 'ariataka',
      reading_time: 7,
      tile_size: 'large',
      cover_image: 'https://images.unsplash.com/photo-1516962215378-7fa2e137ae93?auto=format&fit=crop&w=1200&q=80',
      views: 920,
      content: `The scent of linseed oil and mineral spirits hits you before you reach the bottom of the basement stairs. Here sits a 1928 Heidelberg windmill press, its cast iron flywheels gleaming under vintage task lights.

Every piece of metal type in these California cases was cast from molten lead alloys. When the platen presses into 300gsm cotton paper, it leaves a tactile deboss that light catches at an angle.

We live in a culture of ephemeral digital pixels that vanish when a server drops offline. Holding a physical broadside printed by hand connects you across centuries to the craftspeople who believed words mattered enough to be pressed into permanent matter.`
    },
    {
      title: 'Dorm Rooms & Breakthroughs: How Student Hackathons Sparked Modern AI',
      subtitle: 'Before the corporate consolidation, student hackers were training strange generative models out of curiosity.',
      slug: 'dorm-rooms-and-breakthroughs',
      category: 'College',
      author: 'liamoc',
      reading_time: 5,
      tile_size: 'small',
      cover_image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&q=80',
      views: 1250,
      content: `Everyone remembers the 36-hour hackathons: empty Red Bull cans stacked into precarious pyramids, sleeping bags rolled out beneath plastic banquet tables, and Spotify playlists alternating between synthwave and Chopin.

What got lost in the recent commercial hype was the spirit of reckless play. People didn’t build things to submit to Y-Combinator; they built interactive musical gloves, algorithmic poetry engines, and camera rigs that detected falling leaves.

When student builders stop worrying about market sizing and build purely because something feels magical, the breakthroughs happen organically.`
    },
    {
      title: 'A Field Guide to Digital Minimalism for Restless Minds',
      subtitle: 'Practical rituals for reclaiming focus, reclaiming silence, and reading uninterrupted.',
      slug: 'field-guide-to-digital-minimalism',
      category: 'Life',
      author: 'julian',
      reading_time: 6,
      tile_size: 'medium',
      cover_image: 'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=800&q=80',
      views: 1490,
      content: `The war for human attention is not waged in grand battles; it is fought in thirty-second intervals at red traffic lights, in supermarket checkout lines, and between meetings.

Whenever our mind encounters a vacuum of stimulation, the automatic reflex is to reach into our pocket for the algorithmic slot machine. Over time, our threshold for boredom drops to zero, and with it goes our capacity for sustained creative synthesis.

Digital minimalism is not about becoming a Luddite. It is about establishing sovereign zones in your day where screens are forbidden: the first hour after sunrise, dinner with friends, and the final forty minutes before sleep with a physical book in hand.`
    }
  ];

  // Map author username to ID and category slug to ID
  const users = await query('SELECT id, username FROM users');
  const userMap = new Map(users.map((u: any) => [u.username, u.id]));

  const categories = await query('SELECT id, name FROM categories');
  const catMap = new Map(categories.map((c: any) => [c.name.toLowerCase(), c.id]));

  for (const s of storiesData) {
    const authorId = userMap.get(s.author) || userMap.get('elena');
    const categoryId = catMap.get(s.category.toLowerCase()) || 1;

    await execute(
      `INSERT INTO stories 
       (title, subtitle, slug, content, cover_image, category_id, author_id, reading_time_minutes, tile_size, views_count, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published')`,
      [s.title, s.subtitle, s.slug, s.content, s.cover_image, categoryId, authorId, s.reading_time, s.tile_size, s.views]
    );
  }

  // 5. Comments & Threaded Replies (20+ comments across stories)
  const stories = await query('SELECT id, title, author_id FROM stories');
  const userList = await query('SELECT id, name, username FROM users');

  const story1 = stories[0]?.id || 1; // "Why Small Interfaces Feel Better"
  const story2 = stories[1]?.id || 2; // "The Quiet Revolution Happening Inside College Labs"
  const story3 = stories[2]?.id || 3; // "Three Things I Wish I Knew Before Learning Python"
  const story7 = stories[6]?.id || 7; // "Can We Design Technology to Feel More Human?"

  // Root comments on story 1
  const c1 = await execute(
    'INSERT INTO comments (story_id, user_id, content, likes_count) VALUES (?, ?, ?, ?)',
    [story1, userMap.get('julian'), 'This hits on something I have been feeling for years. The confetti animations in productivity apps always felt slightly condescending to me. Thank you for articulating the value of silence.', 7]
  );
  // Nested reply to c1
  const c2 = await execute(
    'INSERT INTO comments (story_id, user_id, parent_id, content, likes_count) VALUES (?, ?, ?, ?, ?)',
    [story1, userMap.get('elena'), c1.lastInsertRowid, 'Spot on, Julian. It treats users like lab rats seeking dopamine rather than craftsmen doing work.', 4]
  );
  // Nested reply to c2 (recursive level 2)
  await execute(
    'INSERT INTO comments (story_id, user_id, parent_id, content, likes_count) VALUES (?, ?, ?, ?, ?)',
    [story1, userMap.get('mayachen'), c2.lastInsertRowid, 'I actually turned off all badge counters on my OS three months ago. My resting heart rate genuinely lowered.', 5]
  );

  const c3 = await execute(
    'INSERT INTO comments (story_id, user_id, content, likes_count) VALUES (?, ?, ?, ?)',
    [story1, userMap.get('marcusbell'), 'The gallery analogy is brilliant. An art museum curator would never paint neon arrows pointing to Rembrandt.', 9]
  );
  await execute(
    'INSERT INTO comments (story_id, user_id, parent_id, content, likes_count) VALUES (?, ?, ?, ?, ?)',
    [story1, userMap.get('sophiathorne'), c3.lastInsertRowid, 'Yes! Architecture and exhibition spaces have understood this for centuries.', 3]
  );

  // Comments on Story 2 (College Labs)
  const c4 = await execute(
    'INSERT INTO comments (story_id, user_id, content, likes_count) VALUES (?, ?, ?, ?)',
    [story2, userMap.get('mayachen'), 'Quantizing down to 2-bit weights while preserving semantic perplexity is an incredible technical achievement. Are the kernels open-sourced anywhere?', 6]
  );
  await execute(
    'INSERT INTO comments (story_id, user_id, parent_id, content, likes_count) VALUES (?, ?, ?, ?, ?)',
    [story2, userMap.get('liamoc'), c4.lastInsertRowid, 'Yes, they published the C++ and CUDA kernels on GitHub last week! Check the lab repository.', 4]
  );

  // Comments on Story 3 (Python)
  const c5 = await execute(
    'INSERT INTO comments (story_id, user_id, content, likes_count) VALUES (?, ?, ?, ?)',
    [story3, userMap.get('liamoc'), 'Point #1 bit me so hard when I was a freshman building my first web scraper! Mutable default arguments should be taught in Week 1.', 8]
  );
  await execute(
    'INSERT INTO comments (story_id, user_id, parent_id, content, likes_count) VALUES (?, ?, ?, ?, ?)',
    [story3, userMap.get('devinharper'), c5.lastInsertRowid, 'The classic def append_to(item, target=[])... a rite of passage for every developer.', 5]
  );

  // Comments on Story 7 (Human Tech)
  const c6 = await execute(
    'INSERT INTO comments (story_id, user_id, content, likes_count) VALUES (?, ?, ?, ?)',
    [story7, userMap.get('ariataka'), 'The idea of software gaining a soft patina over time is breathtaking. Physical books bear our coffee rings and dog-ears; digital files remain cold.', 11]
  );
  await execute(
    'INSERT INTO comments (story_id, user_id, parent_id, content, likes_count) VALUES (?, ?, ?, ?, ?)',
    [story7, userMap.get('julian'), c6.lastInsertRowid, 'Thank you Aria! We are actually prototyping a font that subtly expands tracking based on how long you linger on a paragraph.', 6]
  );

  // More comments across diverse stories
  for (let i = 4; i <= 10; i++) {
    const sId = stories[i % stories.length]?.id;
    const commenter = userList[i % userList.length]?.id;
    if (sId && commenter) {
      await execute(
        'INSERT INTO comments (story_id, user_id, content, likes_count) VALUES (?, ?, ?, ?)',
        [sId, commenter, 'Fascinating read. Really made me stop and reconsider my own daily routine.', (i * 2) % 10 + 1]
      );
    }
  }

  // 6. Reactions (Appreciate, Interesting, Useful, Thought-provoking)
  const reactionTypes = ['appreciate', 'interesting', 'useful', 'thought_provoking'];
  for (const s of stories) {
    // Add 2-4 reactions per story from different users
    const sampleUsers = userList.slice(0, 5);
    for (let j = 0; j < sampleUsers.length; j++) {
      const u = sampleUsers[j];
      const rType = reactionTypes[(s.id + j) % reactionTypes.length];
      await execute(
        'INSERT OR IGNORE INTO reactions (story_id, user_id, type) VALUES (?, ?, ?)',
        [s.id, u.id, rType]
      );
    }
  }

  // 7. Bookmarks
  for (let k = 0; k < 6; k++) {
    const s = stories[k];
    const u = userList[k % userList.length];
    const status = k % 3 === 0 ? 'unread' : (k % 3 === 1 ? 'finished' : 'saved');
    await execute(
      'INSERT OR IGNORE INTO bookmarks (story_id, user_id, status) VALUES (?, ?, ?)',
      [s.id, u.id, status]
    );
  }

  // 8. Follows
  await execute('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)', [userMap.get('liamoc'), userMap.get('elena')]);
  await execute('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)', [userMap.get('devinharper'), userMap.get('elena')]);
  await execute('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)', [userMap.get('julian'), userMap.get('mayachen')]);
  await execute('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)', [userMap.get('marcusbell'), userMap.get('julian')]);
  await execute('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)', [userMap.get('sophiathorne'), userMap.get('ariataka')]);
  await execute('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)', [userMap.get('liamoc'), userMap.get('mayachen')]);

  // 9. Collections
  const col1 = await execute(
    'INSERT INTO collections (user_id, name, description, cover_color) VALUES (?, ?, ?, ?)',
    [userMap.get('elena'), 'The Tactile Interface', 'Essays on humane software, typography, and calm computing.', '#22382D']
  );
  await execute('INSERT INTO collection_stories (collection_id, story_id) VALUES (?, ?)', [col1.lastInsertRowid, story1]);
  await execute('INSERT INTO collection_stories (collection_id, story_id) VALUES (?, ?)', [col1.lastInsertRowid, story7]);

  const col2 = await execute(
    'INSERT INTO collections (user_id, name, description, cover_color) VALUES (?, ?, ?, ?)',
    [userMap.get('julian'), 'Late Night Reflections', 'Quiet architectural and philosophical dispatches for midnight reading.', '#6A4C93']
  );
  await execute('INSERT INTO collection_stories (collection_id, story_id) VALUES (?, ?)', [col2.lastInsertRowid, story1]);
  await execute('INSERT INTO collection_stories (collection_id, story_id) VALUES (?, ?)', [col2.lastInsertRowid, story2]);

  const col3 = await execute(
    'INSERT INTO collections (user_id, name, description, cover_color) VALUES (?, ?, ?, ?)',
    [userMap.get('liamoc'), 'Lab Notes & Hackathons', 'Dispatches from students and indie builders tinkering at the edges.', '#8C4329']
  );
  await execute('INSERT INTO collection_stories (collection_id, story_id) VALUES (?, ?)', [col3.lastInsertRowid, story2]);
  await execute('INSERT INTO collection_stories (collection_id, story_id) VALUES (?, ?)', [col3.lastInsertRowid, story3]);

  // 10. Notifications
  await execute(
    `INSERT INTO notifications (user_id, actor_id, type, story_id, message, is_read) 
     VALUES (?, ?, 'reaction', ?, 'Julian Vance reacted Thought-provoking to your story.', 0)`,
    [userMap.get('elena'), userMap.get('julian'), story1]
  );
  await execute(
    `INSERT INTO notifications (user_id, actor_id, type, story_id, message, is_read) 
     VALUES (?, ?, 'comment', ?, 'Marcus Bell commented: "The gallery analogy is brilliant..."', 0)`,
    [userMap.get('elena'), userMap.get('marcusbell'), story1]
  );
  await execute(
    `INSERT INTO notifications (user_id, actor_id, type, message, is_read) 
     VALUES (?, ?, 'follow', 'Liam O’Connor started following you.', 1)`,
    [userMap.get('elena'), userMap.get('liamoc')]
  );
  await execute(
    `INSERT INTO notifications (user_id, actor_id, type, story_id, message, is_read) 
     VALUES (?, ?, 'bookmark', ?, 'Devin Harper saved your story "Three Things I Wish I Knew Before Learning Python".', 0)`,
    [userMap.get('mayachen'), userMap.get('devinharper'), story3]
  );

  saveDb();
  console.log('MOSAIC database seeded successfully with rich editorial content!');
}

// Allow direct execution
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase(true).then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
