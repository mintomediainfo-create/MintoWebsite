// Puts the client's real content (from "محتوى الويب سايت.docx", Nov 2026) into the database:
// the 7 services, the work videos (files in web/public/media), the 3 intro clips, the client logos (clients.ts), the contact e-mails
// and the Graphic Designer job.
//   npm run db:content
// It OVERWRITES the services, the intro clips and the work pieces it added before, so run it on a fresh database (after db:seed),
// not after the client edited those in the dashboard. Work pieces added in the dashboard are kept.
import { pool, q, one } from './db';
import { migrate } from './migrate';
import { seedClients } from './clients';
import { env } from './env';

// the media files are on R2 (npm run media:upload first); locally MEDIA_URL is '' and web/public/media is used
const MEDIA = env.MEDIA_URL;

const t = (en: string, ar: string) => ({ en, ar });
const J = JSON.stringify;
type T = ReturnType<typeof t>;

const COLORS: [string, string][] = [['#0B4A94', '#ffffff'], ['#F68B1F', '#0E1B33'], ['#0F2C52', '#ffffff'], ['#0E5E95', '#ffffff'], ['#ffffff', '#0B4A94'], ['#1B2A40', '#ffffff'], ['#F68B1F', '#0E1B33']];

const SERVICES: { title: T; short: T; tags: T[] }[] = [
  {
    title: t('Social Media Management', 'إدارة السوشيال ميديا'),
    short: t("We build your brand's social media presence: we manage your accounts, plan the content, write engaging posts and create designs that reflect your brand's identity.",
      'بنبني حضور قوي لعلامتك على السوشيال ميديا: بندير حساباتك، ونخطط المحتوى، ونكتب بوستات بتشد، ونصمم تصميمات بتعبّر عن هوية علامتك.'),
    tags: [t('Monthly content planning', 'خطة محتوى شهرية'), t('Creative content writing', 'كتابة محتوى إبداعي'), t('Social media post design', 'تصميم بوستات السوشيال ميديا'),
      t('Post scheduling and publishing', 'جدولة ونشر البوستات'), t('Performance tracking and content improvement', 'متابعة الأداء وتطوير المحتوى')],
  },
  {
    title: t('Paid Advertising', 'الإعلانات الممولة'),
    short: t('We plan and manage targeted ad campaigns that raise brand awareness, bring in potential customers and boost sales, while we watch the results and the budget.',
      'بنخطط وندير حملات إعلانية موجّهة بتزوّد معرفة الناس بعلامتك وبتجيب عملاء محتملين وبتزوّد المبيعات، مع متابعة النتايج والميزانية.'),
    tags: [t('Reaching the right audience', 'الوصول للجمهور الصح'), t('Effective ad messages', 'رسائل إعلانية مؤثرة'), t('Budget management', 'إدارة الميزانية'), t('Tracking and improving results', 'متابعة وتحسين النتايج')],
  },
  {
    title: t('Branding & Visual Identity', 'الهوية البصرية'),
    short: t('A strong brand needs a unique identity that stands out and is easy to remember. We create a clear and consistent visual identity that represents your business.',
      'البراند القوي محتاج هوية مميزة تخليه يبان ويتفتكر بسهولة. بنعملك هوية بصرية واضحة ومتناسقة بتعبّر عن البيزنس بتاعك.'),
    tags: [t('Logo design', 'تصميم اللوجو'), t('Colors and fonts', 'الألوان والخطوط'), t('A complete visual style', 'ستايل بصري متكامل')],
  },
  {
    title: t('Content Creation & Media Production', 'صناعة المحتوى والإنتاج الإعلامي'),
    short: t('Great content grabs attention and makes your brand memorable. We create professional, creative visuals that help your brand stand out.',
      'المحتوى الحلو بيشد الانتباه وبيخلي علامتك تتفتكر. بنصنع محتوى مرئي احترافي وإبداعي يخلي علامتك تتميز.'),
    tags: [t('Product photography', 'تصوير المنتجات'), t('Commercials', 'الإعلانات المصورة'), t('Short videos and reels', 'فيديوهات قصيرة وريلز')],
  },
  {
    title: t('Website Design & Development', 'تصميم وتطوير المواقع'),
    short: t('Your website is your digital storefront. We design and build modern, easy-to-use websites that show your services and help visitors connect with your business.',
      'موقعك هو واجهة محلك على الإنترنت. بنصمم ونطوّر مواقع حديثة وسهلة الاستخدام بتعرض خدماتك وبتساعد الزوار يتواصلوا مع البيزنس بتاعك.'),
    tags: [t('Modern, user-friendly design', 'تصميم حديث وسهل'), t('Smooth user experience', 'تجربة استخدام سلسة'), t('Mobile-friendly', 'مناسب للموبايل')],
  },
  {
    title: t('Search Engine Optimization (SEO)', 'تحسين محركات البحث (SEO)'),
    short: t("We improve your website's visibility on Google, so potential customers find you more easily when they search for services like yours.",
      'بنحسّن ظهور موقعك على جوجل، عشان العملاء المحتملين يلاقوك بسهولة لما يدوروا على خدمات زي خدماتك.'),
    tags: [t('Site structure', 'هيكلة الموقع'), t('Content and keywords', 'المحتوى والكلمات المفتاحية'), t('User experience', 'تجربة المستخدم')],
  },
  {
    title: t('Marketing Strategy', 'استراتيجية التسويق'),
    short: t('Every successful campaign starts with a clear plan. We study your business, audience and competitors, then build a practical strategy with measurable results.',
      'كل حملة ناجحة بتبدأ بخطة واضحة. بندرس البيزنس بتاعك وجمهورك ومنافسينك، وبعدين بنبني استراتيجية عملية بنتايج تتقاس.'),
    tags: [t('Clear goals', 'أهداف واضحة'), t('The right marketing channels', 'قنوات التسويق المناسبة'), t('Measurable results', 'نتايج تتقاس')],
  },
];

// the client's videos (compressed, in web/public/media/work): w01 ... w20. Category = the Work page tab.
type Cat = 'social' | 'branding' | 'photography' | 'video' | 'ads' | 'web';
const WORK: { n: number; cat: Cat; client?: T }[] = [
  { n: 6, cat: 'photography' }, // first = Featured (the big card on the home page)
  { n: 1, cat: 'social', client: t('Zapher', 'زفير') },
  { n: 13, cat: 'photography' }, { n: 7, cat: 'video' }, { n: 12, cat: 'photography' }, { n: 17, cat: 'video' }, // + these 4 on the home page
  { n: 2, cat: 'photography' }, { n: 3, cat: 'photography' }, { n: 4, cat: 'photography' }, { n: 5, cat: 'video' }, { n: 8, cat: 'video' },
  { n: 9, cat: 'video' }, { n: 10, cat: 'ads' }, { n: 11, cat: 'video' }, { n: 14, cat: 'photography' }, { n: 15, cat: 'photography' },
  { n: 16, cat: 'video' }, { n: 18, cat: 'video' }, { n: 19, cat: 'social' }, { n: 20, cat: 'photography', client: t('Zapher', 'زفير') },
];

const JOB_SECTIONS = [
  {
    title: t('Requirements', 'المتطلبات'), style: 'checks', text: t('', ''),
    items: [
      t('Total mastery of Photoshop, Illustrator, and key design tools', 'إتقان تام للفوتوشوب والإليستريتور وأدوات التصميم الأساسية'),
      t('Strong portfolio showcasing brand identity, social media graphics, and creative visual concepts', 'بورتفوليو قوي بيعرض هويات بصرية وتصاميم سوشيال ميديا وأفكار بصرية إبداعية'),
      t('High attention to detail with a solid understanding of typography, color theory, and visual hierarchy', 'اهتمام عالي بالتفاصيل وفهم كويس للخطوط ونظرية الألوان والتسلسل البصري'),
      t('Ability to meet deadlines and collaborate effectively with content and video teams', 'القدرة على الالتزام بالمواعيد والتعاون بشكل فعّال مع فريقي المحتوى والفيديو'),
    ],
  },
  {
    title: t('', ''), style: 'text', items: [],
    text: t('Do you see yourself as part of our next story? Send your CV and portfolio via email to careers@mintomediaagency.com or fill out the form below.',
      'شايف نفسك جزء من قصتنا الجاية؟ ابعت سيرتك الذاتية وأعمالك على careers@mintomediaagency.com أو املأ الفورم تحت.'),
  },
];

async function main() {
  await migrate();

  await q('DELETE FROM services');
  for (const [i, s] of SERVICES.entries()) {
    const [bg, fg] = COLORS[i % COLORS.length];
    await q('INSERT INTO services (title, short, tags, bg, fg, sort) VALUES ($1,$2,$3,$4,$5,$6)', [J(s.title), J(s.short), J(s.tags), bg, fg, i]);
  }
  console.log(`services: ${SERVICES.length} saved`);

  // work: the sample pieces and the ones this script added before go; the client's videos come in
  await q("DELETE FROM work_items WHERE client_name->>'en' LIKE '[%' OR url LIKE '%/media/work/%' OR (url = '' AND poster_url = '')");
  for (const [i, w] of WORK.entries()) {
    const f = `${MEDIA}/media/work/w${String(w.n).padStart(2, '0')}`;
    await q('INSERT INTO work_items (kind, category, url, poster_url, client_name, on_home, featured, sort) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      ['reel', w.cat, f + '.mp4', f + '.jpg', J(w.client || t('', '')), i < 6, i === 0, i]);
  }
  console.log(`work: ${WORK.length} videos saved (6 on the home page)`);

  await q('DELETE FROM intro_media');
  for (let i = 1; i <= 3; i++) {
    await q('INSERT INTO intro_media (kind, url, poster_url, sort) VALUES ($1,$2,$3,$4)', ['video', `${MEDIA}/media/intro/i${i}.mp4`, `${MEDIA}/media/intro/i${i}.jpg`, i]);
  }
  console.log('intro: 3 clips saved');

  // the sample rows from db:seed ("[Client name]", "[News headline]" ...) are hidden until the real ones are typed in the dashboard;
  // a home page section with nothing in it does not show
  await q("UPDATE testimonials SET active = false WHERE quote->>'en' LIKE '[%'");
  await q("UPDATE story SET active = false WHERE text->>'en' LIKE '[%'");
  await q("UPDATE news SET status = 'draft' WHERE title->>'en' LIKE '[%'");
  console.log('samples: hidden (testimonials, story, news)');
  await seedClients(); // the real client logos (the samples are removed)

  // contact e-mails (phone / WhatsApp / addresses stay as they are, or are typed in the dashboard)
  const row = await one<{ value: any }>("SELECT value FROM settings WHERE key = 'contact'");
  const contact = { ...(row?.value || {}) };
  contact.email ||= 'contact@mintomediaagency.com';
  contact.careersEmail ||= 'careers@mintomediaagency.com';
  if (String(contact.phone || '').includes('XXXX')) contact.phone = ''; // the sample placeholder number
  await q(`INSERT INTO settings (key, value, updated_at) VALUES ('contact', $1, now()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`, [J(contact)]);
  console.log('contact: saved');

  // jobs: the Graphic Designer job; sample jobs that were never edited are removed
  await q("DELETE FROM jobs WHERE slug <> 'graphic-designer' AND summary->>'en' LIKE '[%'");
  const fields = [
    J(t('Graphic Designer', 'مصمم جرافيك')), J(t('Design', 'التصميم')), J(t('Alexandria, Egypt', 'الإسكندرية، مصر')), J(t('Full time', 'دوام كامل')), J(t('', '')),
    J(t('Join our creative team to craft brand identities, social media graphics and bold visual concepts.', 'انضم لفريقنا الإبداعي عشان تصمّم هويات بصرية وتصاميم سوشيال ميديا وأفكار بصرية جريئة.')),
    J(JOB_SECTIONS),
  ];
  const job = await one<{ id: number }>("SELECT id FROM jobs WHERE slug = 'graphic-designer'");
  if (job) {
    await q('UPDATE jobs SET title=$1, department=$2, location=$3, job_type=$4, level=$5, summary=$6, sections=$7, status = \'open\' WHERE id=$8', [...fields, job.id]);
  } else {
    await q(`INSERT INTO jobs (slug, title, department, location, job_type, level, summary, sections, questions, sort) VALUES ('graphic-designer',$1,$2,$3,$4,$5,$6,$7,'[]'::jsonb,0)`, fields);
  }
  console.log('jobs: Graphic Designer saved');
}

main().then(() => pool.end()).catch((e) => { console.error(e); process.exit(1); });
