/**
 * Data for programmatic SEO landing pages (one per high-intent search term). Rendered by
 * app/[locale]/links/use/[slug]/page.tsx. Adding a page = adding an entry here — copy lives in
 * modules/ (outside the i18n-literal guard) so per-locale marketing copy is allowed.
 *
 * Strategy: own search before the app. Each page targets one query, gives a clear H1 + intro +
 * feature points + FAQ (FAQPage structured data), and funnels to signup. Tone is a draft — refine.
 */

export type SeoLocale = "ko" | "en" | "ja";

export type SeoContent = {
  title: string; // <title> + visible H1
  description: string; // meta description
  intro: string;
  features: { title: string; body: string }[];
  faq: { q: string; a: string }[];
  cta: string;
};

export type SeoPage = {
  slug: string;
  /** ko is the primary; en/ja fall back to en→ko when missing. */
  content: Partial<Record<SeoLocale, SeoContent>>;
};

export const SEO_PAGES: SeoPage[] = [
  {
    slug: "free-url-shortener",
    content: {
      ko: {
        title: "무료 URL 단축 — kurl",
        description:
          "긴 링크를 무료로 짧게. 클릭 통계, QR, 커스텀 코드까지 한 번에. 카드 결제·가입 없이 바로 단축하세요.",
        intro:
          "kurl은 긴 URL을 한 번에 짧게 만들고, 누가 언제 눌렀는지까지 보여주는 무료 단축 서비스입니다. 전단지·SNS·이메일 어디에 붙이든 같은 링크로 성과를 측정하세요.",
        features: [
          { title: "무료로 무제한 단축", body: "가입 없이도 바로 단축. 계정을 만들면 링크를 모아 관리할 수 있어요." },
          { title: "클릭 통계", body: "클릭 수·시간대·유입을 한눈에. 어떤 채널이 반응했는지 바로 보입니다." },
          { title: "QR 자동 생성", body: "단축과 동시에 QR이 만들어져 인쇄물·포스터에 바로 씁니다." },
          { title: "카톡 미리보기", body: "공유 시 제목·썸네일이 깨지지 않게 미리보기를 챙겨줍니다." },
        ],
        faq: [
          { q: "정말 무료인가요?", a: "네. 기본 단축과 클릭 통계는 무료입니다. 가입 없이도 단축할 수 있어요." },
          { q: "링크가 만료되나요?", a: "기본 링크는 만료되지 않습니다. 계정에서 직접 비활성화할 수 있어요." },
          { q: "커스텀 주소를 쓸 수 있나요?", a: "원하는 코드를 직접 지정해 브랜드에 맞는 짧은 주소를 만들 수 있습니다." },
        ],
        cta: "무료로 단축하기",
      },
      en: {
        title: "Free URL Shortener — kurl",
        description:
          "Shorten long links for free. Click analytics, QR codes, and custom slugs in one place. No card, no signup to start.",
        intro:
          "kurl turns long URLs into short links and shows you who clicked, when, and from where — free. Put the same link on flyers, social, or email and measure what works.",
        features: [
          { title: "Free, unlimited shortening", body: "Shorten without an account; create one to organize your links." },
          { title: "Click analytics", body: "See clicks, timing, and sources at a glance — know which channel converted." },
          { title: "Automatic QR codes", body: "A QR is generated with every link, ready for print and posters." },
          { title: "Rich link previews", body: "Titles and thumbnails stay intact when your link is shared." },
        ],
        faq: [
          { q: "Is it really free?", a: "Yes. Basic shortening and click analytics are free, and you can start without signing up." },
          { q: "Do links expire?", a: "Default links don't expire. You can disable them yourself from your account." },
          { q: "Can I use a custom slug?", a: "Yes — set your own code for a short link that matches your brand." },
        ],
        cta: "Shorten for free",
      },
      ja: {
        title: "無料URL短縮 — kurl",
        description:
          "長いリンクを無料で短く。クリック解析・QR・カスタムコードまで一度に。カード登録も会員登録もなしですぐ短縮。",
        intro:
          "kurlは長いURLを短くし、いつ誰がクリックしたかまで見せる無料の短縮サービスです。チラシ・SNS・メール、どこに貼っても同じリンクで成果を測定できます。",
        features: [
          { title: "無料で無制限に短縮", body: "登録なしですぐ短縮。アカウントを作ればリンクをまとめて管理できます。" },
          { title: "クリック解析", body: "クリック数・時間帯・流入を一目で。どのチャネルが反応したかすぐ分かります。" },
          { title: "QR自動生成", body: "短縮と同時にQRが作られ、印刷物・ポスターにそのまま使えます。" },
          { title: "リンクプレビュー", body: "共有時にタイトル・サムネイルが崩れないようプレビューを整えます。" },
        ],
        faq: [
          { q: "本当に無料ですか？", a: "はい。基本の短縮とクリック解析は無料です。登録なしでも短縮できます。" },
          { q: "リンクは期限切れになりますか？", a: "基本のリンクは期限切れになりません。アカウントから自分で無効化できます。" },
          { q: "カスタムアドレスは使えますか？", a: "好きなコードを指定して、ブランドに合った短いアドレスを作れます。" },
        ],
        cta: "無料で短縮する",
      },
    },
  },
  {
    slug: "bitly-alternative",
    content: {
      ko: {
        title: "Bitly 대체 서비스 — kurl",
        description:
          "Bitly 대신 kurl. 무료 클릭 통계, QR, 링크인바이오까지. 한국어·일본어 미리보기 최적화로 카톡·라인 공유에 강합니다.",
        intro:
          "kurl은 Bitly가 하던 단축·통계에 QR, 링크인바이오, 캠페인 분석을 더한 모바일-퍼스트 대안입니다. 카카오·라인 미리보기까지 챙겨 한국·일본 공유에 특히 강합니다.",
        features: [
          { title: "무료 통계 기본 제공", body: "유료 플랜에 가두지 않고 클릭 통계를 기본으로 줍니다." },
          { title: "QR + 캠페인 분석", body: "포스터·전단지 QR을 묶음으로 만들고 어떤 묶음이 반응했는지 측정합니다." },
          { title: "링크인바이오", body: "모든 링크를 한 페이지로. 프로필 하나로 채널을 모읍니다." },
          { title: "메신저 미리보기", body: "카톡·라인에서 썸네일이 깨지지 않게 OG를 챙깁니다." },
        ],
        faq: [
          { q: "기존 Bitly 링크를 옮길 수 있나요?", a: "새 링크를 kurl로 만들고 프로필·QR로 점진적으로 옮기는 걸 권장합니다." },
          { q: "무엇이 더 낫나요?", a: "통계를 무료로 주고, QR·링크인바이오·메신저 미리보기가 한 곳에 있습니다." },
        ],
        cta: "kurl로 시작하기",
      },
      en: {
        title: "Bitly Alternative — kurl",
        description:
          "A Bitly alternative with free click analytics, QR codes, and link-in-bio. Mobile-first, with strong KakaoTalk/LINE previews.",
        intro:
          "kurl does Bitly's shortening and analytics, plus QR codes, link-in-bio, and campaign analytics — mobile-first, with messenger previews tuned for Korea and Japan.",
        features: [
          { title: "Analytics included free", body: "Click analytics by default — not locked behind a paid tier." },
          { title: "QR + campaign analytics", body: "Make QR sets for posters/flyers and measure which set performed." },
          { title: "Link-in-bio", body: "All your links on one page — one profile for every channel." },
          { title: "Messenger previews", body: "OG tags tuned so thumbnails don't break on KakaoTalk/LINE." },
        ],
        faq: [
          { q: "Can I migrate my Bitly links?", a: "Create new links in kurl and move over gradually via your profile and QR." },
          { q: "Why kurl over Bitly?", a: "Free analytics, plus QR, link-in-bio, and messenger previews in one place." },
        ],
        cta: "Start with kurl",
      },
      ja: {
        title: "Bitlyの代替 — kurl",
        description:
          "Bitlyの代わりにkurl。無料のクリック解析・QR・リンクインバイオまで。日本語・韓国語プレビュー最適化でLINE・カカオ共有に強い。",
        intro:
          "kurlはBitlyの短縮・解析にQR、リンクインバイオ、キャンペーン分析を加えたモバイルファーストの代替サービスです。LINE・カカオのプレビューまで整え、日本・韓国での共有に特に強いです。",
        features: [
          { title: "解析を無料で標準提供", body: "有料プランに閉じ込めず、クリック解析を標準で提供します。" },
          { title: "QR＋キャンペーン分析", body: "ポスター・チラシのQRをまとめて作り、どの束が反応したかを測定します。" },
          { title: "リンクインバイオ", body: "すべてのリンクを1ページに。プロフィール1つで全チャネルをまとめます。" },
          { title: "メッセンジャープレビュー", body: "LINE・カカオでサムネイルが崩れないようOGを整えます。" },
        ],
        faq: [
          { q: "既存のBitlyリンクを移せますか？", a: "新しいリンクをkurlで作り、プロフィールやQRで段階的に移行するのがおすすめです。" },
          { q: "なぜBitlyよりkurlですか？", a: "解析が無料で、QR・リンクインバイオ・メッセンジャープレビューが1か所にそろっています。" },
        ],
        cta: "kurlで始める",
      },
    },
  },
];

SEO_PAGES.push(
  {
    slug: "link-in-bio",
    content: {
      ko: {
        title: "링크 인 바이오 만들기 — kurl",
        description: "인스타·틱톡 프로필 링크 하나에 모든 채널을. 무료 링크인바이오를 1분 만에 만들고 클릭까지 측정하세요.",
        intro: "kurl 링크인바이오는 내 모든 링크를 한 페이지로 모아줍니다. 인스타 바이오에 주소 하나만 넣고, 어떤 링크가 눌렸는지까지 확인하세요.",
        features: [
          { title: "1분 셋업", body: "가입하고 링크를 붙이면 끝. 테마로 분위기만 고르면 됩니다." },
          { title: "클릭 분석", body: "어떤 링크가 반응했는지 무료로 봅니다." },
          { title: "QR·공유 최적화", body: "프로필 QR과 메신저 미리보기까지 자동으로." },
        ],
        faq: [
          { q: "무료인가요?", a: "네, 기본 링크인바이오와 클릭 분석은 무료입니다." },
          { q: "내 주소를 쓸 수 있나요?", a: "원하는 핸들로 kurl.me/내핸들 주소를 만들 수 있어요." },
        ],
        cta: "내 링크인바이오 만들기",
      },
      en: {
        title: "Make a Link in Bio — kurl",
        description: "All your channels behind one profile link for Instagram/TikTok. Build a free link-in-bio in a minute and track clicks.",
        intro: "kurl's link-in-bio gathers all your links on one page. Put one address in your Instagram bio and see which links get clicked.",
        features: [
          { title: "Set up in a minute", body: "Sign up, paste your links, pick a theme — done." },
          { title: "Click analytics", body: "See which links convert, free." },
          { title: "QR + share-ready", body: "Profile QR and messenger previews, automatic." },
        ],
        faq: [
          { q: "Is it free?", a: "Yes — the basic link-in-bio and click analytics are free." },
          { q: "Can I use my own handle?", a: "Yes, claim kurl.me/yourhandle." },
        ],
        cta: "Build my link in bio",
      },
      ja: {
        title: "リンクインバイオを作る — kurl",
        description:
          "Instagram・TikTokのプロフィールリンク1つに全チャネルを。無料のリンクインバイオを1分で作り、クリックまで測定。",
        intro:
          "kurlのリンクインバイオは、すべてのリンクを1ページにまとめます。Instagramのバイオにアドレス1つを入れるだけで、どのリンクが押されたかまで確認できます。",
        features: [
          { title: "1分でセットアップ", body: "登録してリンクを貼るだけ。テーマで雰囲気を選ぶだけです。" },
          { title: "クリック解析", body: "どのリンクが反応したかを無料で見られます。" },
          { title: "QR・共有最適化", body: "プロフィールQRとメッセンジャープレビューまで自動で。" },
        ],
        faq: [
          { q: "無料ですか？", a: "はい、基本のリンクインバイオとクリック解析は無料です。" },
          { q: "自分のアドレスを使えますか？", a: "好きなハンドルで kurl.me/ハンドル のアドレスを作れます。" },
        ],
        cta: "リンクインバイオを作る",
      },
    },
  },
  {
    slug: "instagram-profile-link",
    content: {
      ko: {
        title: "인스타 프로필 링크 만들기 — kurl",
        description: "인스타 바이오 링크 하나로 모든 걸. 여러 링크를 한 페이지에 모으고 클릭을 추적하는 무료 인스타 프로필 링크.",
        intro: "인스타그램은 바이오에 링크 하나만 허용합니다. kurl로 그 한 자리에 모든 링크를 모은 페이지를 연결하고, 팔로워가 무엇을 누르는지 확인하세요.",
        features: [
          { title: "링크 하나로 전부", body: "유튜브·쇼핑·예약·뉴스레터를 한 페이지에." },
          { title: "스토리 공유용 QR", body: "프로필 QR로 오프라인에서도 유입을 만듭니다." },
          { title: "무료 클릭 통계", body: "어떤 링크가 반응했는지 바로 봅니다." },
        ],
        faq: [
          { q: "인스타에 어떻게 넣나요?", a: "프로필 편집 → 웹사이트에 kurl 주소를 붙이면 됩니다." },
          { q: "비용이 드나요?", a: "기본 기능은 무료입니다." },
        ],
        cta: "인스타 링크 만들기",
      },
      en: {
        title: "Instagram Profile Link — kurl",
        description: "One bio link for everything. A free Instagram profile link that gathers all your links on one page and tracks clicks.",
        intro: "Instagram allows just one link in your bio. With kurl, point that one slot at a page with all your links — and see what followers tap.",
        features: [
          { title: "One link, everything", body: "YouTube, shop, booking, newsletter on one page." },
          { title: "QR for stories", body: "A profile QR drives traffic offline too." },
          { title: "Free click stats", body: "See which links got the response." },
        ],
        faq: [
          { q: "How do I add it to Instagram?", a: "Edit profile → paste your kurl address into Website." },
          { q: "Does it cost anything?", a: "Core features are free." },
        ],
        cta: "Make my Instagram link",
      },
      ja: {
        title: "Instagramプロフィールリンクを作る — kurl",
        description:
          "Instagramのバイオリンク1つで全部。複数リンクを1ページにまとめ、クリックを追跡できる無料のInstagramプロフィールリンク。",
        intro:
          "Instagramはバイオにリンクを1つしか置けません。kurlでその1枠に全リンクをまとめたページをつなぎ、フォロワーが何を押すか確認しましょう。",
        features: [
          { title: "リンク1つで全部", body: "YouTube・ショップ・予約・ニュースレターを1ページに。" },
          { title: "ストーリー共有用QR", body: "プロフィールQRでオフラインからも流入を作ります。" },
          { title: "無料クリック解析", body: "どのリンクが反応したかをすぐ見られます。" },
        ],
        faq: [
          { q: "Instagramにどう入れますか？", a: "プロフィール編集 → ウェブサイトにkurlのアドレスを貼るだけです。" },
          { q: "費用はかかりますか？", a: "基本機能は無料です。" },
        ],
        cta: "Instagramリンクを作る",
      },
    },
  },
  {
    slug: "kakaotalk-link-preview",
    content: {
      ko: {
        title: "카톡 미리보기 되는 단축링크 — kurl",
        description: "카카오톡·라인에 붙여도 제목과 썸네일이 깨지지 않는 단축링크. 미리보기 최적화로 클릭률을 올리세요.",
        intro: "단축링크를 카톡에 붙이면 미리보기가 깨질 때가 많죠. kurl은 OG 정보를 챙겨 카카오·라인에서도 제목·썸네일이 제대로 뜨게 합니다.",
        features: [
          { title: "미리보기 보존", body: "제목·설명·썸네일이 메신저에서 그대로 보입니다." },
          { title: "캐시 이슈 대응", body: "한 번 깨진 미리보기도 다시 긁어 고칠 수 있게 안내합니다." },
          { title: "클릭 측정", body: "어느 대화방·채널에서 눌렸는지 통계로 봅니다." },
        ],
        faq: [
          { q: "왜 카톡에서 미리보기가 안 뜨나요?", a: "원본에 OG 태그가 없거나 카톡이 옛 결과를 캐시한 경우입니다. kurl 링크는 OG를 챙기고 재요청 방법도 안내합니다." },
          { q: "라인도 되나요?", a: "네, 라인·디스코드·슬랙 미리보기도 동일하게 챙깁니다." },
        ],
        cta: "미리보기 되는 링크 만들기",
      },
      en: {
        title: "Short Links with KakaoTalk Previews — kurl",
        description: "Short links whose title and thumbnail stay intact on KakaoTalk and LINE. Optimized previews to lift click-through.",
        intro: "Short links often break previews in KakaoTalk. kurl carries OG data so your title and thumbnail show correctly on Kakao and LINE.",
        features: [
          { title: "Previews preserved", body: "Title, description, and thumbnail show in messengers." },
          { title: "Cache-fix guidance", body: "If a preview broke once, we show how to force a re-scrape." },
          { title: "Click tracking", body: "See which chat or channel drove the clicks." },
        ],
        faq: [
          { q: "Why doesn't my preview show in KakaoTalk?", a: "The source lacks OG tags or Kakao cached an old result. kurl links carry OG and show how to re-request." },
          { q: "Does LINE work too?", a: "Yes — LINE, Discord, and Slack previews are covered." },
        ],
        cta: "Make a preview-ready link",
      },
      ja: {
        title: "プレビュー対応の短縮リンク — kurl",
        description:
          "LINE・カカオトークに貼ってもタイトルとサムネイルが崩れない短縮リンク。プレビュー最適化でクリック率を高めます。",
        intro:
          "短縮リンクをLINEに貼るとプレビューが崩れることがあります。kurlはOG情報を整え、LINE・カカオでもタイトル・サムネイルが正しく表示されるようにします。",
        features: [
          { title: "プレビューを保持", body: "タイトル・説明・サムネイルがメッセンジャーでそのまま表示されます。" },
          { title: "キャッシュ対策", body: "一度崩れたプレビューも再取得して直せるよう案内します。" },
          { title: "クリック測定", body: "どのトーク・チャネルで押されたかを統計で見られます。" },
        ],
        faq: [
          { q: "なぜプレビューが表示されないのですか？", a: "元のページにOGタグがない、またはメッセンジャーが古い結果をキャッシュしている場合です。kurlリンクはOGを整え、再取得の方法も案内します。" },
          { q: "LINEでも使えますか？", a: "はい。LINE・Discord・Slackのプレビューも同様に整えます。" },
        ],
        cta: "プレビュー対応リンクを作る",
      },
    },
  },
  {
    slug: "poster-qr-code",
    content: {
      ko: {
        title: "포스터 QR 코드 만들기 — kurl",
        description: "포스터·전단지에 넣을 QR 코드를 무료로. 스캔 수까지 측정되는 추적형 QR을 1분 만에 만드세요.",
        intro: "포스터에 QR을 넣고 끝내지 마세요. kurl QR은 몇 명이 언제 스캔했는지까지 보여줘서, 어느 포스터·위치가 효과적이었는지 알 수 있습니다.",
        features: [
          { title: "추적형 QR", body: "스캔 수·시간대를 측정해 성과를 봅니다." },
          { title: "고해상도 다운로드", body: "인쇄에 깨지지 않는 QR을 받아 바로 씁니다." },
          { title: "링크 교체 가능", body: "인쇄 후에도 연결 주소를 바꿀 수 있어요." },
        ],
        faq: [
          { q: "인쇄 후 링크를 바꿀 수 있나요?", a: "네, 동적 QR이라 코드 재인쇄 없이 목적지를 변경할 수 있습니다." },
          { q: "스캔 수를 볼 수 있나요?", a: "네, 스캔 통계를 무료로 제공합니다." },
        ],
        cta: "포스터 QR 만들기",
      },
      en: {
        title: "Make a Poster QR Code — kurl",
        description: "Free QR codes for posters and flyers. Build a trackable QR that measures scans in a minute.",
        intro: "Don't just slap a QR on a poster. kurl QR shows how many people scanned and when, so you learn which poster or spot performed.",
        features: [
          { title: "Trackable QR", body: "Measure scans and timing to see performance." },
          { title: "High-res download", body: "Get a print-sharp QR, ready to use." },
          { title: "Swap the link", body: "Change the destination even after printing." },
        ],
        faq: [
          { q: "Can I change the link after printing?", a: "Yes — it's a dynamic QR, so you can repoint it without reprinting." },
          { q: "Can I see scans?", a: "Yes, scan analytics are free." },
        ],
        cta: "Make a poster QR",
      },
      ja: {
        title: "ポスターQRコードを作る — kurl",
        description:
          "ポスター・チラシ用のQRコードを無料で。スキャン数まで測定できる追跡型QRを1分で作成。",
        intro:
          "ポスターにQRを載せて終わりにしないでください。kurlのQRは何人がいつスキャンしたかまで見せるので、どのポスター・場所が効果的だったか分かります。",
        features: [
          { title: "追跡型QR", body: "スキャン数・時間帯を測定して成果を見ます。" },
          { title: "高解像度ダウンロード", body: "印刷で崩れないQRを受け取ってすぐ使えます。" },
          { title: "リンク差し替え可能", body: "印刷後でもリンク先を変更できます。" },
        ],
        faq: [
          { q: "印刷後にリンクを変えられますか？", a: "はい。動的QRなので、再印刷せずに遷移先を変更できます。" },
          { q: "スキャン数は見られますか？", a: "はい、スキャン解析を無料で提供します。" },
        ],
        cta: "ポスターQRを作る",
      },
    },
  },
  {
    slug: "flyer-qr-tracking",
    content: {
      ko: {
        title: "전단지 QR 성과 측정 — kurl",
        description: "전단지에 넣은 QR이 실제로 효과가 있었는지 숫자로 확인. 배포처별 스캔을 비교하는 추적형 QR.",
        intro: "전단지를 몇 천 장 뿌려도 효과를 모르면 의미가 없죠. kurl QR은 배포처·시간대별 스캔을 보여줘, 어디서 반응이 왔는지 측정합니다.",
        features: [
          { title: "배포처별 비교", body: "묶음마다 다른 QR로 어느 지역·채널이 반응했는지 봅니다." },
          { title: "실시간 스캔", body: "뿌린 직후부터 스캔이 쌓이는 걸 확인합니다." },
          { title: "무료 시작", body: "카드·계약 없이 바로 추적형 QR을 만듭니다." },
        ],
        faq: [
          { q: "배포처별로 나눠 볼 수 있나요?", a: "네, 묶음(캠페인)마다 QR을 만들어 성과를 비교할 수 있습니다." },
          { q: "개인정보를 수집하나요?", a: "스캔 수·시간 등 집계 데이터만 보며, 개인 식별 정보는 수집하지 않습니다." },
        ],
        cta: "전단지 QR 성과 측정하기",
      },
      en: {
        title: "Flyer QR Performance Tracking — kurl",
        description: "See in numbers whether your flyer QR actually worked. Trackable QR that compares scans by distribution point.",
        intro: "Printing thousands of flyers means little if you can't tell what worked. kurl QR shows scans by location and time, so you measure response.",
        features: [
          { title: "Compare by drop", body: "Use a different QR per batch to see which area/channel responded." },
          { title: "Real-time scans", body: "Watch scans accrue from the moment you distribute." },
          { title: "Free to start", body: "Make a trackable QR with no card or contract." },
        ],
        faq: [
          { q: "Can I split by distribution point?", a: "Yes — make a QR per batch (campaign) and compare performance." },
          { q: "Do you collect personal data?", a: "Only aggregate data like scan counts and timing — no PII." },
        ],
        cta: "Track flyer QR performance",
      },
      ja: {
        title: "チラシQRの成果測定 — kurl",
        description:
          "チラシに載せたQRが本当に効果があったかを数字で確認。配布先ごとのスキャンを比較できる追跡型QR。",
        intro:
          "チラシを何千枚配っても効果が分からなければ意味がありません。kurlのQRは配布先・時間帯ごとのスキャンを見せ、どこで反応があったかを測定します。",
        features: [
          { title: "配布先ごとに比較", body: "束ごとに別のQRで、どの地域・チャネルが反応したかを見ます。" },
          { title: "リアルタイムのスキャン", body: "配った直後からスキャンが積み上がるのを確認します。" },
          { title: "無料で開始", body: "カード・契約なしで追跡型QRをすぐ作れます。" },
        ],
        faq: [
          { q: "配布先ごとに分けて見られますか？", a: "はい、束（キャンペーン）ごとにQRを作って成果を比較できます。" },
          { q: "個人情報を収集しますか？", a: "スキャン数・時間などの集計データのみで、個人を特定する情報は収集しません。" },
        ],
        cta: "チラシQRの成果を測定する",
      },
    },
  },
  {
    slug: "qr-campaign-analytics",
    content: {
      ko: {
        title: "QR 캠페인 분석 — kurl",
        description: "여러 QR을 캠페인으로 묶어 한눈에 비교. 어떤 채널·소재가 반응했는지 측정하는 QR 캠페인 분석.",
        intro: "QR을 하나씩 보지 말고 캠페인으로 묶으세요. kurl은 묶음 단위로 스캔을 비교해, 어떤 채널·소재·위치가 효과적이었는지 한 화면에서 보여줍니다.",
        features: [
          { title: "캠페인 묶음", body: "여러 QR을 하나의 캠페인으로 묶어 비교합니다." },
          { title: "채널·소재별 성과", body: "UTM 없이도 묶음별 반응을 바로 봅니다." },
          { title: "무료 통계", body: "스캔·클릭 분석을 기본으로 제공합니다." },
        ],
        faq: [
          { q: "일반 단축과 뭐가 다른가요?", a: "캠페인은 여러 링크/QR을 묶어 성과를 비교하는 모드입니다." },
          { q: "보고서를 내보낼 수 있나요?", a: "묶음별 수치를 화면에서 비교할 수 있고, 내보내기는 순차 지원합니다." },
        ],
        cta: "QR 캠페인 분석 시작",
      },
      en: {
        title: "QR Campaign Analytics — kurl",
        description: "Group multiple QRs into a campaign and compare at a glance. Measure which channel and creative responded.",
        intro: "Stop reading QRs one by one — group them into campaigns. kurl compares scans by group so you see which channel, creative, or location worked, on one screen.",
        features: [
          { title: "Campaign grouping", body: "Bundle multiple QRs into one campaign to compare." },
          { title: "Per-channel performance", body: "See response by group without wrangling UTMs." },
          { title: "Free analytics", body: "Scan and click analytics by default." },
        ],
        faq: [
          { q: "How is this different from plain shortening?", a: "A campaign groups multiple links/QRs to compare performance." },
          { q: "Can I export a report?", a: "You can compare per-group numbers on screen; export is rolling out." },
        ],
        cta: "Start QR campaign analytics",
      },
      ja: {
        title: "QRキャンペーン分析 — kurl",
        description:
          "複数のQRをキャンペーンとしてまとめ、一目で比較。どのチャネル・素材が反応したかを測定するQRキャンペーン分析。",
        intro:
          "QRを1つずつ見るのではなく、キャンペーンとしてまとめましょう。kurlは束単位でスキャンを比較し、どのチャネル・素材・場所が効果的だったかを1画面で見せます。",
        features: [
          { title: "キャンペーンの束ね", body: "複数のQRを1つのキャンペーンにまとめて比較します。" },
          { title: "チャネル・素材別の成果", body: "UTMなしでも束ごとの反応をすぐ見られます。" },
          { title: "無料の統計", body: "スキャン・クリック解析を標準で提供します。" },
        ],
        faq: [
          { q: "通常の短縮と何が違いますか？", a: "キャンペーンは複数のリンク/QRをまとめて成果を比較するモードです。" },
          { q: "レポートを書き出せますか？", a: "束ごとの数値を画面で比較でき、エクスポートは順次対応します。" },
        ],
        cta: "QRキャンペーン分析を始める",
      },
    },
  },
);

export function getSeoPage(slug: string): SeoPage | undefined {
  return SEO_PAGES.find((p) => p.slug === slug);
}

export function getSeoContent(page: SeoPage, locale: string): SeoContent {
  const l = locale as SeoLocale;
  return page.content[l] ?? page.content.en ?? (page.content.ko as SeoContent);
}
