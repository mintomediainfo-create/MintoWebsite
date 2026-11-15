# رفع موقع منتو ميديا على Vercel (خطوة بخطوة)

الموقع جاهز ومعاه كل محتوى الملف والفيديوهات. الخطوات دي بتتعمل مرة واحدة بس.

## قبل ما تبدأ: محتاج إيه معاك
- **حساب GitHub** يكون باسم الشركة أو باسمك.
- **حساب Vercel**: اعمله بحساب GitHub نفسه.
  - مهم: خطة **Hobby** المجانية مش مسموح بيها للمواقع التجارية. موقع الشركة لازم يكون على خطة **Pro**، وهي حوالي 20 دولار في الشهر.
- **الدخول على المكان اللي الدومين متسجل فيه** (GoDaddy أو Namecheap أو غيرهم)، عشان هنغيّر إعدادات الـ DNS.
- **حساب Cloudflare** مجاني لخدمة R2، وده لرفع الملفات من الداشبورد (تفاصيل في الخطوة 7).

---

## 1) ارفع المشروع على GitHub
من فولدر المشروع `F:\Work\minto-site\minto-site`:
```bash
git init
git add .
git commit -m "Minto Media website"
```
- بعدين على github.com اعمل **New repository**، وخليه **Private**، وسمّيه `minto-site`.
- GitHub هيديك أمرين تحت عنوان "push an existing repository"، شغّلهم:
  - `git remote add origin ...`
  - `git push -u origin main`
- الملفات اللي مش هتترفع: `.env`، و `node_modules`، والملفات التجريبية في `server/uploads`. ده متظبط في `.gitignore`.

## 2) اعمل المشروع على Vercel
- على vercel.com اختار **Add New → Project**، واختار الـ repo `minto-site`.
- **Framework Preset:** اختار **Other**.
- سيب Build و Output زي ما هما، لأنهم متظبطين في `vercel.json`.
- **متدوسش Deploy لسه.** كمّل للخطوة 3 الأول.

## 3) قاعدة البيانات (Neon)
- في مشروع Vercel ادخل على **Storage → Create Database → Neon (Postgres)**، واربطها بالمشروع.
- ده بيضيف `DATABASE_URL` لوحده.
- انسخ قيمة `DATABASE_URL`، هتحتاجها في الخطوة 5.

## 4) الإعدادات (Environment Variables)
في **Settings → Environment Variables** ضيف:

| الاسم | القيمة |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | كلام عشوائي طويل، 40 حرف أو أكتر |
| `ADMIN_EMAIL` | إيميل الأدمن الحقيقي، مثلًا `admin@الدومين` |
| `ADMIN_PASSWORD` | باسورد قوي **جديد**، مش `minto12345` |
| `SITE_URL` | `https://الدومين` |
| `R2_ACCOUNT_ID`، `R2_ACCESS_KEY_ID`، `R2_SECRET_ACCESS_KEY` | من R2 (الخطوة 7) |
| `R2_BUCKET` | `minto-media` |
| `R2_PRIVATE_BUCKET` | `minto-private` |
| `R2_PUBLIC_URL` | `https://media.mintomediaagency.com` |
| `VITE_MEDIA_URL` | **نفس** `https://media.mintomediaagency.com` (الموقع بيجيب منه الهيرو) |
| `SMTP_HOST`، `SMTP_PORT`، `SMTP_USER`، `SMTP_PASS` | من Brevo (حساب مجاني)، عشان إيميلات التنبيه بالانكويريز والأبلكيشنز والنيوزليتر |
| `MAIL_FROM` | `Minto Media <no-reply@mintomediaagency.com>` |

- **مهم:** كل الصور والفيديوهات (الهيرو، فيديوهات الأعمال، لوجوهات العملاء) **مش على GitHub**، دي على R2. يعني **R2 لازم يتعمل وتترفع عليه الميديا (الخطوة 7) قبل الـ Deploy**، وإلا الموقع هيطلع من غير صور.
- **علشان تعمل `JWT_SECRET`** شغّل الأمر ده وانسخ اللي يطلع:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- بعد ما تضيفهم، دوس **Deploy**.

## 5) املأ قاعدة البيانات (مرة واحدة)
- من الكمبيوتر بتاعك، في فولدر المشروع، افتح **PowerShell**.
- حط قيم Neon والأدمن، **نفس اللي في الخطوة 4**:
```powershell
$env:DATABASE_URL="الصق هنا DATABASE_URL بتاع Neon"
$env:ADMIN_EMAIL="نفس إيميل الأدمن"
$env:ADMIN_PASSWORD="نفس الباسورد"
$env:MEDIA_URL="https://media.mintomediaagency.com"
npm run db:seed
npm run db:content
```
- `MEDIA_URL` مهم: من غيره لينكات الفيديوهات واللوجوهات هتتكتب غلط (من غير R2).
**الأمر الأول `db:seed`:**
- بيعمل الجداول وحساب الأدمن.

**الأمر التاني `db:content`:**
- بيحط محتوى الملف: الـ 7 خدمات، و20 فيديو في صفحة الأعمال، و3 مقاطع في قسم We support، ووظيفة الجرافيك ديزاينر.
- بيخبّي الأمثلة اللي لسه مكتوبة بين أقواس [ ]: آراء العملاء، ولوجوهات العملاء، وقصتنا، والأخبار. القسم بيظهر لوحده لما تضيفوا الحقيقي من الداشبورد.

## 6) الدومين
- في Vercel ادخل على **Settings → Domains**، واكتب الدومين مرة من غير `www` ومرة بـ `www`.
- Vercel هيوريك الريكوردز اللي محتاجها. حطها عند الشركة اللي اشتريت منها الدومين، في قسم DNS. غالبًا بتبقى:
  - `A` للدومين الأساسي على `76.76.21.21`
  - `CNAME` لـ `www` على `cname.vercel-dns.com`
- استنى من 10 دقايق لساعة، لحد ما Vercel يكتب **Valid Configuration**.

## 7) Cloudflare R2: كل الميديا (اعمله قبل الخطوة 4)
- **كل** الصور والفيديوهات على R2: اللي حطيتها أنا (الهيرو، 20 فيديو، 3 مقاطع، 12 لوجو)، وأي حاجة جديدة بتترفع من الداشبورد (صور الأخبار، لوجوهات، فيديوهات، CVs).
- R2 محتاج **فيزا** عشان يتفعّل، حتى لو هتفضلوا في المجاني.
- **الطريقة:**
  - اعمل bucketين: `minto-media` و `minto-private` (الأخير متعملوش public أبدًا: فيه الـ CVs).
  - حط قاعدة **CORS** على الاتنين (موجودة في `README.md` تحت **Cloudflare R2**، وضيف فيها `https://mintomediaagency.com` و `https://www.mintomediaagency.com`).
  - اعمل **API token** (Object Read & Write على الاتنين).
  - حط القيم في ملف `.env` على جهازك (`R2_ACCOUNT_ID` و `R2_ACCESS_KEY_ID` و `R2_SECRET_ACCESS_KEY` و `R2_BUCKET=minto-media` و `R2_PUBLIC_URL=https://media.mintomediaagency.com`).
  - **ارفع الميديا** من فولدر المشروع (الملفات موجودة على اللاب في `web/public/media`):
    ```bash
    npm run media:upload
    ```
    بيرفع كل حاجة مرة واحدة، ولو شغّلته تاني بيرفع الجديد بس.
  - وحط نفس القيم في Vercel (الخطوة 4).
- **مهم للسرعة: اربط الـ bucket بدومين خاص.**
  - من R2 → `minto-media` → **Settings → Custom Domains**، وحط `media.الدومين`.
  - استخدم الدومين ده في `R2_PUBLIC_URL`، مش لينك `r2.dev`.
  - لينك `r2.dev` بطيء ومحدود، ومش معمول للمواقع الحقيقية. أما الدومين الخاص فبيخلّي فيديو الهيرو والصور يتخزنوا في الكاش بتاع Cloudflare، قريب من كل زائر.
  - ده محتاج الدومين يكون على Cloudflare، وده هنعمله كده كده عشان الإيميلات.
- R2 مجاني لحد 10 جيجا.

## 8) اتأكد إن كل حاجة شغالة
- [ ] الهوم بيفتح على الكمبيوتر والموبايل، والفيديو بيشتغل.
- [ ] صفحات About و Work و Contact و Careers شغالة، بالعربي وبالإنجليزي.
- [ ] `/admin` بيفتح، وتقدر تدخل بالإيميل والباسورد الجديد.
- [ ] تبعت رسالة تجربة من فورم Contact وتلاقيها في الداشبورد.
- [ ] `https://الدومين/sitemap.xml` و `https://الدومين/robots.txt` بيفتحوا.

---

## جوجل (عشان الموقع يظهر في البحث)
الموقع جاهز لجوجل: فيه `sitemap.xml` بيتعمل لوحده، وفيه `robots.txt`، وفيه وصف للموقع وصورة للمشاركة.

**الخطوات اللي عليك:**
1. ادخل على **search.google.com/search-console** بإيميل الشركة.
2. اختار **Add property → Domain**، واكتب الدومين من غير https.
3. جوجل هيديك ريكورد **TXT**:
   - حطه في الـ DNS، في نفس المكان اللي حطيت فيه ريكوردز Vercel.
   - ارجع دوس **Verify**. ممكن ياخد شوية.
4. من القايمة اختار **Sitemaps**، واكتب `sitemap.xml`، ودوس **Submit**.
5. من **URL Inspection**:
   - حط لينك الهوم، ودوس **Request indexing**.
   - كرر ده لصفحات About و Work.
6. **مهم جدًا للبحث المحلي:**
   - اعمل **Google Business Profile** على business.google.com لمكتب إسكندرية ومكتب دبي.
   - حط فيه لينك الموقع ونفس رقم التليفون.
   - ده اللي بيطلع الشركة على الخريطة لما حد يدوّر على "marketing agency Alexandria".

جوجل بياخد من كام يوم لكام أسبوع لحد ما الموقع يبان في البحث، وده طبيعي.

---

## حاجات لسه ناقصة من العميل (تتحط من الداشبورد بعد الرفع)
- **آراء العملاء:** الكلام الحقيقي وأسماء العملاء، وممكن فيديو.
- **لوجوهات العملاء** (Trusted by).
- **قصتنا (Our story):** السنين واللي حصل في كل سنة.
- **أسماء العملاء على الفيديوهات** في صفحة Work. لحد دلوقتي "Zapher" بس هو اللي متكتب.
- **لينكات السوشيال ميديا:** Facebook و Instagram و LinkedIn و TikTok.
- **الإيميلات:** `contact@mintomediaagency.com` و `careers@mintomediaagency.com` (بيتحولوا على Gmail الشركة بـ Cloudflare Email Routing).
