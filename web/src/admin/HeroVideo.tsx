// The big video at the top of the home page. One upload makes everything: the dashboard shrinks the video in the
// browser (high quality), cuts an upright copy for phones, takes a first-frame picture for each, uploads all four.
import { useRef, useState, type DragEvent as RDragEvent } from 'react';
import { uploadFile } from '../lib/api';
import { fmtSize } from '../lib/compress';
import { media } from '../lib/media';
import { useSetting } from './Content';
import { Card, ErrorBox, Icon, PageHead, Skeleton, useUi } from './ui';

type Hero = { videoUrl: string; posterUrl: string; phoneVideoUrl: string; phonePosterUrl: string; upright?: boolean };
const BUILT_IN = { videoUrl: media('/media/hero/hero.mp4'), phoneVideoUrl: media('/media/hero/hero-mobile.mp4'),
  posterUrl: media('/media/hero/hero-poster.jpg'), phonePosterUrl: media('/media/hero/hero-poster-mobile.jpg') };
const VID_TYPES = 'video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi,.3gp,.mpeg,.mpg,.wmv,.mts';
const VIDEO_EXT = /\.(mp4|m4v|mov|qt|webm|mkv|avi|3gp|3g2|mpe?g|wmv|flv|hevc|ts|mts)$/i;
const MAX = 500 * 1024 * 1024;

export default function HeroVideo() {
  const s = useSetting<Hero>('hero');
  const { toast, fail, confirm } = useUi();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<null | { phase: 'compress' | 'upload'; p: number }>(null);
  const [drag, setDrag] = useState(false);
  const h = s.draft;
  const custom = !!h?.videoUrl;
  const shownDesk = custom ? h!.videoUrl : BUILT_IN.videoUrl;
  const shownPhone = custom ? h!.phoneVideoUrl || h!.videoUrl : BUILT_IN.phoneVideoUrl;

  async function take(file?: File | null) {
    if (!file || busy) return;
    if (!file.type.startsWith('video/') && !VIDEO_EXT.test(file.name)) { toast('Please choose a video file.', 'error'); return; }
    if (file.size > MAX) { toast(`This video is ${fmtSize(file.size)}. Please make it smaller than ${fmtSize(MAX)} first.`, 'error'); return; }
    const stop = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', stop);
    setBusy({ phase: 'compress', p: 0 });
    try {
      const { makeHeroVideos } = await import('../lib/compressVideo'); // big library, loaded only here
      const out = await makeHeroVideos(file, (p) => setBusy({ phase: 'compress', p }));
      const files = [out.video, out.poster, out.phone, out.phonePoster].filter(Boolean) as File[];
      const total = files.reduce((n, f) => n + f.size, 0);
      let doneBytes = 0;
      const urls: string[] = [];
      setBusy({ phase: 'upload', p: 0 });
      for (const f of files) {
        const r = await uploadFile(f, { path: '/admin/upload-url', body: { folder: 'hero', filename: f.name, contentType: f.type } },
          (p) => setBusy({ phase: 'upload', p: (doneBytes + p * f.size) / total }));
        doneBytes += f.size;
        urls.push(r.publicUrl || '');
      }
      const next: Hero = { videoUrl: urls[0], posterUrl: urls[1], phoneVideoUrl: out.phone ? urls[2] : '', phonePosterUrl: out.phone ? urls[3] : '', upright: out.upright };
      await s.save(next, `New video is live. ${fmtSize(file.size)} → ${fmtSize(out.video.size)} for computers` + (out.phone ? `, ${fmtSize(out.phone.size)} for phones.` : '.')
        + (out.upright ? ' Note: this video is upright, so on computers it shows in the middle with a soft blurred copy on both sides. A wide video fills the screen better.' : ''));
    } catch (e) {
      fail(e);
    } finally {
      window.removeEventListener('beforeunload', stop);
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function backToBuiltIn() {
    if (!(await confirm({ title: 'Use the built-in video again?', message: 'The uploaded video stops showing on the home page.', ok: 'Use built-in video' }))) return;
    s.save({ videoUrl: '', posterUrl: '', phoneVideoUrl: '', phonePosterUrl: '' }, 'The built-in video is back on the home page.');
  }

  const dropProps = {
    onDragOver: (e: RDragEvent) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDrag(true); } },
    onDragLeave: () => setDrag(false),
    onDrop: (e: RDragEvent) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); setDrag(false); take(e.dataTransfer.files[0]); },
  };

  return (
    <div className="adm-page">
      <PageHead title="Hero video" site="/" intro="The big video at the top of the home page. It fills the whole width of the screen, behind the orange MINTO outline." />
      <ErrorBox error={s.error} retry={s.reload} />
      {s.loading || !h ? <Skeleton rows={2} /> : (
        <>
          <Card title="Upload a new video" className="adm-mb">
            <p className="adm-hint">
              Choose any video: the dashboard makes it light for the website by itself (high quality, no sound), and makes an upright copy for phones from its middle.
              Best: a <b>wide</b> video (16:9), <b>10 to 20 seconds</b>, that loops nicely. The edges may be cut a little on some screens, so keep the important part in the middle.
            </p>
            <button type="button" className={'adm-drop' + (drag ? ' drag' : '')} onClick={() => fileRef.current?.click()} disabled={!!busy} {...dropProps}>
              <Icon name="upload" size={22} />
              <span><b>Drag a video here</b> or <u>choose one</u></span>
              <small>Any video: MP4, MOV, WebM ...</small>
            </button>
            {busy && (
              <div className="adm-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(busy.p * 100)}
                aria-label={busy.phase === 'compress' ? 'Making the video smaller' : 'Uploading'}>
                <span style={{ width: Math.max(4, busy.p * 100) + '%' }} />
                <em>{busy.phase === 'compress' ? 'Making the video light for the website (keep this page open, it can take a few minutes)…' : 'Uploading…'} {Math.round(busy.p * 100)}%</em>
              </div>
            )}
            <input ref={fileRef} type="file" accept={VID_TYPES} hidden onChange={(e) => take(e.target.files?.[0])} />
          </Card>

          <Card title={custom ? 'Showing now: your uploaded video' : 'Showing now: the built-in video'}
            actions={custom ? <button type="button" className="adm-btn ghost small" onClick={backToBuiltIn} disabled={!!busy || s.saving}>Use built-in video</button> : undefined}>
            <div className="adm-hero-prev">
              <figure>
                <video src={shownDesk} poster={custom ? h.posterUrl : BUILT_IN.posterUrl} muted loop autoPlay playsInline controls preload="metadata" />
                <figcaption>Computers</figcaption>
              </figure>
              <figure className="phone">
                <video src={shownPhone} poster={custom ? h.phonePosterUrl || h.posterUrl : BUILT_IN.phonePosterUrl} muted loop autoPlay playsInline controls preload="metadata" />
                <figcaption>Phones</figcaption>
              </figure>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
