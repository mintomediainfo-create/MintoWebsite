// First-time setup: creates the admin account and fills the site with the placeholder content from the design.
// npm run db:seed        (safe to run again: it only fills empty tables)
import crypto from 'crypto';
import { pool, q, one } from './db';
import { env } from './env';
import { hashPassword } from './lib/auth';
import { migrate } from './migrate';

const t = (en: string, ar: string) => ({ en, ar });
const J = (v: unknown) => JSON.stringify(v);

async function empty(table: string) {
  const r = await one<{ n: string }>(`SELECT count(*) AS n FROM ${table}`);
  return Number(r?.n || 0) === 0;
}

async function main() {
  await migrate();

  // ---- admin ----
  if (await empty('admins')) {
    const password = env.ADMIN_PASSWORD || crypto.randomBytes(9).toString('base64url');
    await q('INSERT INTO admins (email, name, password_hash) VALUES ($1, $2, $3)', [env.ADMIN_EMAIL.toLowerCase(), 'Minto Admin', await hashPassword(password)]);
    console.log('\n  Admin account created');
    console.log('  email:   ', env.ADMIN_EMAIL);
    console.log('  password:', env.ADMIN_PASSWORD ? '(the ADMIN_PASSWORD you set)' : password, '\n');
  }

  // ---- settings ----
  const settings: Record<string, any> = {
    hero: { videoUrl: '', posterUrl: '' },
    contact: { email: 'hello@mintomediaagency.com', phone: '+20 1X XXXX XXXX', whatsapp: '', address: t('[Address]', '[العنوان]'), mapUrl: '' },
    social: { facebook: '#', instagram: '#', linkedin: '#', tiktok: '#', youtube: '', x: '', behance: '' },
    testimonials_display: { desktop: 'both', mobile: 'both' },
  };
  for (const [k, v] of Object.entries(settings)) {
    await q('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [k, J(v)]);
  }

  if (await empty('intro_media')) {
    const items = [t('[Team clip]', '[مقطع الفريق]'), t('[Behind the scenes clip]', '[مقطع من الكواليس]'), t('[Client work clip]', '[مقطع من أعمال العملاء]')];
    for (const [i, c] of items.entries()) await q('INSERT INTO intro_media (kind, caption, sort) VALUES ($1,$2,$3)', ['image', J(c), i]);
  }

  if (await empty('services')) {
    const s = [
      [t('Digital marketing', 'التسويق الرقمي'), t('Clear plans that bring the right people to your brand.', 'خطط واضحة توصل علامتك إلى الناس المناسبين.'), [t('Strategy', 'الاستراتيجية'), t('Market research', 'أبحاث السوق'), t('Campaign plans', 'خطط الحملات')], '#0B4A94', '#ffffff'],
      [t('Paid advertising', 'الإعلانات الممولة'), t('Ads on Meta, Google and TikTok, watched every day.', 'إعلانات على ميتا وجوجل وتيك توك يشاهدها الناس كل يوم.'), [t('Meta ads', 'إعلانات ميتا'), t('Google ads', 'إعلانات جوجل'), t('TikTok ads', 'إعلانات تيك توك')], '#F68B1F', '#0E1B33'],
      [t('Page management', 'إدارة الصفحات'), t('We run your pages: posts, replies and community.', 'ندير صفحاتك: المنشورات والردود والمجتمع.'), [t('Posting', 'النشر'), t('Replies & community', 'الردود والمجتمع'), t('Content calendar', 'خطة المحتوى')], '#0F2C52', '#ffffff'],
      [t('Content & video', 'المحتوى والفيديو'), t('Reels, photos and motion made to stop the scroll.', 'ريلز وصور وموشن جرافيك توقف التمرير.'), [t('Reels', 'ريلز'), t('Photography', 'التصوير'), t('Motion graphics', 'موشن جرافيك')], '#0E5E95', '#ffffff'],
      [t('Branding & design', 'الهوية والتصميم'), t('Logos and identity that make you easy to remember.', 'شعارات وهوية بصرية تجعل علامتك سهلة التذكر.'), [t('Logo', 'الشعار'), t('Visual identity', 'الهوية البصرية'), t('Social designs', 'تصاميم التواصل')], '#ffffff', '#0B4A94'],
      [t('Reports & results', 'التقارير والنتائج'), t('Simple monthly reports and clear next steps.', 'تقارير شهرية بسيطة وخطوات واضحة لما هو قادم.'), [t('Monthly reports', 'تقارير شهرية'), t('Insights', 'رؤى'), t('Next steps', 'الخطوات التالية')], '#1B2A40', '#ffffff'],
    ] as const;
    for (const [i, [title, short, tags, bg, fg]] of s.entries()) {
      await q('INSERT INTO services (title, short, tags, bg, fg, sort) VALUES ($1,$2,$3,$4,$5,$6)', [J(title), J(short), J(tags), bg, fg, i]);
    }
  }

  if (await empty('work_items')) {
    const kinds = ['photo', 'video', 'reel', 'photo', 'photo', 'video', 'photo', 'reel', 'photo', 'video', 'photo', 'photo', 'photo', 'video', 'photo', 'reel', 'photo', 'photo'];
    for (const [i, k] of kinds.entries()) {
      await q('INSERT INTO work_items (kind, title, client_name, caption, tags, on_home, featured, sort) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [
        k,
        J(i === 0 ? t('[Campaign name]', '[اسم الحملة]') : t('[Project name]', '[اسم المشروع]')),
        J(t(`[Client ${(i % 8) + 1}]`, `[العميل ${(i % 8) + 1}]`)),
        J(t('[One short line about this piece.]', '[سطر قصير عن هذا العمل.]')),
        J(t('Social media · Paid ads', 'وسائل التواصل · إعلانات ممولة')),
        i < 6, i === 0, i,
      ]);
    }
  }

  if (await empty('clients')) {
    for (let i = 1; i <= 8; i++) await q('INSERT INTO clients (name, sort) VALUES ($1,$2)', [`[Client ${i}]`, i]);
  }

  if (await empty('testimonials')) {
    for (let i = 1; i <= 4; i++) {
      await q('INSERT INTO testimonials (quote, name, role, sort) VALUES ($1,$2,$3,$4)', [
        J(t(`[Client testimonial ${i} — one or two sentences in their own words.]`, `[رأي العميل ${i} — جملة أو جملتان بكلماته.]`)),
        J(t('[Client name]', '[اسم العميل]')),
        J(t('[Role], [Company]', '[المنصب]، [الشركة]')),
        i,
      ]);
    }
  }

  if (await empty('story')) {
    const st = [
      [t('Minto is born', 'انطلاق منتو'), t('[How the agency started.]', '[كيف بدأت الوكالة.]')],
      [t('First big clients', 'أول عملاء كبار'), t('[A key early project.]', '[مشروع مهم في البداية.]')],
      [t('A bigger team', 'فريق أكبر'), t('[New services and people.]', '[خدمات وأشخاص جدد.]')],
      [t('Today', 'اليوم'), t('[Where Minto is going next.]', '[إلى أين تتجه منتو.]')],
    ];
    for (const [i, [title, text]] of st.entries()) await q('INSERT INTO story (year, title, text, sort) VALUES ($1,$2,$3,$4)', [String(2019 + i * 2), J(title), J(text), i]);
  }

  if (await empty('news')) {
    const types = ['news', 'announcement', 'event', 'news', 'announcement', 'news'];
    for (const [i, ty] of types.entries()) {
      const title = ty === 'announcement' ? t('[Announcement headline goes here]', '[عنوان الإعلان هنا]') : ty === 'event' ? t('[Event headline goes here]', '[عنوان الفعالية هنا]') : t('[News headline goes here]', '[عنوان الخبر هنا]');
      await q(`INSERT INTO news (slug, type, title, summary, body, featured, published_at) VALUES ($1,$2,$3,$4,$5,$6, now() - ($7 || ' days')::interval)`, [
        `sample-${ty}-${i + 1}`, ty, J(title),
        J(t('[Short summary of the post.]', '[ملخص قصير للخبر.]')),
        J(t('[The full text of the post goes here. It can be a few paragraphs.]\n\n[Second paragraph.]', '[النص الكامل للخبر هنا. يمكن أن يكون عدة فقرات.]\n\n[الفقرة الثانية.]')),
        i === 0, String(i * 6),
      ]);
    }
  }

  if (await empty('jobs')) {
    const sections = [
      { title: t('About the role', 'عن الوظيفة'), style: 'text', text: t('[Two or three lines about the job, the team, and why it matters at Minto.]', '[سطران أو ثلاثة عن الوظيفة والفريق وأهميتها في منتو.]'), items: [] },
      { title: t('What you will do', 'ماذا ستفعل'), style: 'bullets', text: t('', ''), items: [t('[Main task of the job]', '[المهمة الأساسية]'), t('[Second task]', '[المهمة الثانية]'), t('[Third task]', '[المهمة الثالثة]')] },
      { title: t('What you need', 'ماذا نحتاج منك'), style: 'checks', text: t('', ''), items: [t('[Years of experience needed]', '[سنوات الخبرة المطلوبة]'), t('[Main skill or tool]', '[المهارة الأساسية]')] },
      { title: t('What we offer', 'ماذا نقدم لك'), style: 'cards', text: t('', ''), items: [t('[Salary range or benefit]', '[نطاق الراتب أو ميزة]'), t('[Working hours / hybrid]', '[ساعات العمل / مختلط]'), t('[Training and growth]', '[تدريب وتطور]')] },
    ];
    const questions = [
      { id: 'years', label: t('Years of experience', 'سنوات الخبرة'), type: 'single', required: true, options: [t('Less than 1 year', 'أقل من سنة'), t('1–2 years', '1–2 سنة'), t('3–5 years', '3–5 سنوات'), t('More than 5 years', 'أكثر من 5 سنوات')] },
      { id: 'about', label: t('Tell us about yourself', 'حدثنا عن نفسك'), type: 'textarea', required: true, options: [] },
      { id: 'tools', label: t('Main tools and skills', 'أهم الأدوات والمهارات'), type: 'text', required: false, options: [] },
      { id: 'mode', label: t('How do you prefer to work?', 'كيف تفضل أن تعمل؟'), type: 'single', required: false, options: [t('At the office', 'من المكتب'), t('Hybrid', 'مختلط'), t('Remote', 'عن بعد')] },
    ];
    const roles = [['Graphic designer', 'مصمم جرافيك', 'Creative', 'الإبداع'], ['Media buyer', 'متخصص شراء إعلانات', 'Media', 'الإعلام'], ['Account manager', 'مدير حسابات', 'Accounts', 'الحسابات']];
    for (const [i, [en, ar, den, dar]] of roles.entries()) {
      await q(
        `INSERT INTO jobs (slug, title, department, location, job_type, level, summary, sections, questions, sort) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [en.toLowerCase().replace(/ /g, '-'), J(t(en, ar)), J(t(den, dar)), J(t('[City / Remote]', '[المدينة / عن بعد]')), J(t('Full time', 'دوام كامل')), J(t('[Experience level]', '[مستوى الخبرة]')),
         J(t('[Short description of the role and what the person will do day to day.]', '[وصف قصير للوظيفة وما سيقوم به الشخص يوميًا.]')), J(sections), J(questions), i]
      );
    }
  }
  console.log('Seed done.');
}

main().then(() => pool.end()).catch((e) => { console.error(e); process.exit(1); });
