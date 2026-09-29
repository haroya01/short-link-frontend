/**
 * Data for programmatic SEO landing pages (one per high-intent search term). Rendered by
 * app/[locale]/links/use/[slug]/page.tsx. Adding a page = adding an entry here — copy lives in
 * modules/ (outside the i18n-literal guard) so per-locale marketing copy is allowed.
 *
 * Strategy: own search before the app. Each page targets one query, gives a clear H1 + intro +
 * feature points + FAQ (FAQPage structured data), and funnels to the shortener.
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
        title: "무료 URL 단축과 클릭 통계 · kurl",
        description:
          "긴 주소를 kurl.me 단축 링크로 무료로 줄이고 QR 코드도 받아요. 로그인하면 링크마다 누가 언제 어디서 눌렀는지 통계로 볼 수 있어요.",
        intro:
          "kurl은 긴 주소를 kurl.me로 시작하는 짧은 주소로 바꿔 주는 URL 단축 서비스예요. 로그인하지 않아도 줄일 수 있고, 로그인하면 링크마다 클릭 통계를 볼 수 있어요. 지금은 모든 기능이 무료이고 광고가 없어요.",
        features: [
          {
            title: "로그인 없이 줄이기",
            body: "주소를 붙여 넣으면 단축 링크가 만들어져요. 로그인하지 않고 만든 링크는 24시간 뒤 만료되는데, 그 전에 같은 브라우저에서 로그인하면 내 계정으로 옮겨져 계속 남아요.",
          },
          {
            title: "클릭 통계",
            body: "로그인하면 링크마다 기기, 브라우저, 나라, 도시, 유입 경로, UTM별로 클릭을 나눠 보여 줘요. 봇 클릭은 사람 클릭과 따로 세요.",
          },
          {
            title: "링크마다 QR 코드",
            body: "단축 링크를 만들면 QR 코드를 PNG로 받을 수 있어요. 그 QR로 들어온 방문은 통계에서 다른 클릭과 나눠 세요.",
          },
          {
            title: "카카오톡 미리보기",
            body: "카카오톡이나 슬랙에 붙이면 목적지 페이지의 제목과 이미지로 미리보기 카드가 떠요. 로그인하면 카드 문구와 이미지를 직접 바꿀 수 있어요.",
          },
        ],
        faq: [
          {
            q: "정말 무료인가요?",
            a: "네. 지금은 모든 기능이 무료이고 광고가 없어요. 줄이기는 로그인 없이도 되고, 클릭 통계는 로그인하면 볼 수 있어요.",
          },
          {
            q: "링크가 만료되나요?",
            a: "로그인하지 않고 만든 링크는 24시간 뒤 만료돼요. 로그인하고 만든 링크는 만료 일시나 조회수 한도를 정해 두지 않으면 지우기 전까지 계속 열려요.",
          },
          {
            q: "주소를 원하는 대로 정할 수 있나요?",
            a: "로그인하면 kurl.me/ 뒤에 붙는 코드를 영문과 숫자 3~16자로 직접 정할 수 있어요. 이미 쓰이고 있는 코드는 고를 수 없어요.",
          },
        ],
        cta: "URL 줄이기",
      },
      en: {
        title: "Free URL shortener with click stats · kurl",
        description:
          "Shorten long URLs into kurl.me short links for free and get a QR code for each. Sign in to see who clicked each link, when, and from where.",
        intro:
          "kurl turns long URLs into short addresses that start with kurl.me. You can shorten without signing in, and signing in lets you see click stats for every link. All features are free right now, and there are no ads.",
        features: [
          {
            title: "Shorten without signing in",
            body: "Paste a URL and you get a short link. Links made without signing in expire after 24 hours; if you sign in on the same browser before then, they move to your account and stay.",
          },
          {
            title: "Click stats",
            body: "Sign in to see each link's clicks broken down by device, browser, country, city, referrer, and UTM. Bot clicks are counted apart from human clicks.",
          },
          {
            title: "A QR code for every link",
            body: "Every short link comes with a QR code you can download as a PNG. Visits through that QR are counted apart from other clicks in your stats.",
          },
          {
            title: "KakaoTalk previews",
            body: "Paste a link into KakaoTalk or Slack and the preview card shows the destination page's title and image. Sign in to change the card's text and image yourself.",
          },
        ],
        faq: [
          {
            q: "Is it really free?",
            a: "Yes. All features are free right now, and there are no ads. Shortening works without signing in, and click stats are there once you sign in.",
          },
          {
            q: "Do links expire?",
            a: "Links made without signing in expire after 24 hours. Links you make while signed in stay open until you delete them, unless you set an expiry date or a view limit.",
          },
          {
            q: "Can I choose the address?",
            a: "Once signed in, you can set the code after kurl.me/ yourself, using 3 to 16 letters and numbers. Codes already in use can't be picked.",
          },
        ],
        cta: "Shorten a URL",
      },
      ja: {
        title: "無料URL短縮とクリック統計 · kurl",
        description:
          "長いURLをkurl.meの短縮リンクに無料で短くして、QRコードも受け取れます。ログインすると、リンクごとに誰がいつどこから押したかを統計で見られます。",
        intro:
          "kurlは、長いURLをkurl.meで始まる短いアドレスに変えるURL短縮サービスです。ログインしなくても短縮でき、ログインするとリンクごとのクリック統計を見られます。いまはすべての機能が無料で、広告もありません。",
        features: [
          {
            title: "ログインなしで短縮",
            body: "URLを貼り付けると短縮リンクができます。ログインせずに作ったリンクは24時間後に失効しますが、それまでに同じブラウザでログインすると、アカウントに移ってそのまま残ります。",
          },
          {
            title: "クリック統計",
            body: "ログインすると、リンクごとのクリックを端末、ブラウザ、国、都市、流入元、UTMごとに分けて表示します。ボットのクリックは人のクリックと分けて数えます。",
          },
          {
            title: "リンクごとのQRコード",
            body: "短縮リンクを作ると、QRコードをPNGで受け取れます。そのQRから開かれた訪問は、統計でほかのクリックと分けて数えます。",
          },
          {
            title: "カカオトークのプレビュー",
            body: "カカオトークやSlackに貼ると、遷移先ページのタイトルと画像でプレビューカードが出ます。ログインすると、カードの文言と画像を自分で変えられます。",
          },
        ],
        faq: [
          {
            q: "本当に無料ですか？",
            a: "はい。いまはすべての機能が無料で、広告もありません。短縮はログインなしでもでき、クリック統計はログインすると見られます。",
          },
          {
            q: "リンクは失効しますか？",
            a: "ログインせずに作ったリンクは24時間後に失効します。ログインして作ったリンクは、有効期限や閲覧回数の上限を決めない限り、削除するまで開けます。",
          },
          {
            q: "アドレスを自分で決められますか？",
            a: "ログインすると、kurl.me/ の後ろに付くコードを英数字3〜16文字で自分で決められます。すでに使われているコードは選べません。",
          },
        ],
        cta: "URLを短縮する",
      },
    },
  },
  {
    slug: "bitly-alternative",
    content: {
      ko: {
        title: "Bitly 대안 · 무료 단축 링크와 클릭 통계 · kurl",
        description:
          "Bitly 대안을 찾는 분을 위해 kurl로 할 수 있는 일을 정리했어요. 단축 링크, 클릭 통계, QR 캠페인, 공개 프로필을 지금은 모두 무료로 쓸 수 있어요.",
        intro:
          "kurl은 단축 링크와 클릭 통계, QR 캠페인, 공개 프로필을 한 계정에서 쓰는 서비스예요. 지금은 모든 기능이 무료이고 광고가 없어요. 비교할 때는 Bitly의 현재 요금 안내도 함께 확인해 보세요.",
        features: [
          {
            title: "클릭 통계",
            body: "링크마다 사람 클릭과 봇 클릭을 나누고, 기기, 나라, 도시, 유입 경로, UTM별로 보여 줘요. 클릭이 들어오는 대로 쌓이는 실시간 목록이 있고, 클릭 기록은 CSV로 내보낼 수 있어요.",
          },
          {
            title: "QR과 QR 캠페인",
            body: "모든 단축 링크에서 QR 코드를 받을 수 있어요. 전단지를 여러 곳에 나눠 뿌릴 때는 배포 묶음마다 QR을 따로 만들어 100장당 클릭으로 비교해요.",
          },
          {
            title: "공개 프로필",
            body: "사용자 이름을 정하면 사용자이름.kurl.me 주소에 내 링크를 모은 페이지가 생겨요. SNS 프로필에는 그 주소 하나만 넣으면 돼요.",
          },
          {
            title: "카카오톡 공유",
            body: "카카오톡에 붙였을 때 보이는 미리보기 카드를 링크마다 바꿀 수 있어요. 카카오톡이나 LINE 안에서 링크를 누른 사람을 기본 브라우저로 보내는 옵션도 있어요.",
          },
        ],
        faq: [
          {
            q: "쓰던 Bitly 링크를 옮길 수 있나요?",
            a: "이미 공유한 bit.ly 주소는 Bitly의 주소라서 kurl로 가져올 수 없어요. 앞으로 쓸 링크는 kurl에서 새로 만들면 되고, 로그인하면 원래 주소 목록을 CSV로 올려 한 번에 100개까지 만들 수 있어요.",
          },
          {
            q: "요금은 어떻게 되나요?",
            a: "지금은 모든 기능이 무료이고 유료 플랜과 광고가 없어요. 계정마다 만들 수 있는 링크 수에는 한도가 있어요.",
          },
          {
            q: "API가 있나요?",
            a: "네. 로그인한 뒤 설정에서 API 키를 발급하면 스크립트에서 링크를 만들고 통계를 가져올 수 있어요.",
          },
        ],
        cta: "kurl 써 보기",
      },
      en: {
        title: "Bitly alternative · free short links and click stats · kurl",
        description:
          "For anyone looking for a Bitly alternative, here's what kurl does. Short links, click stats, QR campaigns, and public profiles are all free for now.",
        intro:
          "kurl is one account for short links, click stats, QR campaigns, and a public profile. All features are free right now, and there are no ads. When you compare, check Bitly's current pricing page as well.",
        features: [
          {
            title: "Click stats",
            body: "Each link separates human clicks from bot clicks and breaks them down by device, country, city, referrer, and UTM. A live list shows clicks as they arrive, and the click log can be exported as CSV.",
          },
          {
            title: "QR codes and QR campaigns",
            body: "Every short link has a QR code. When you hand out flyers in several places, make a separate QR for each distribution batch and compare clicks per 100 flyers.",
          },
          {
            title: "Public profile",
            body: "Pick a username and you get a page at username.kurl.me that collects your links. Your social profiles only need that one address.",
          },
          {
            title: "KakaoTalk sharing",
            body: "Change the preview card people see when a link is pasted into KakaoTalk, link by link. An option also sends people who tap the link inside KakaoTalk or LINE to their default browser.",
          },
        ],
        faq: [
          {
            q: "Can I move my Bitly links?",
            a: "bit.ly addresses you've already shared are Bitly's addresses, so kurl can't bring them over. Make the links you'll use from now on in kurl; once signed in, you can upload your original URLs as a CSV and create up to 100 links at a time.",
          },
          {
            q: "What does it cost?",
            a: "All features are free right now, with no paid plan and no ads. There is a limit on how many links each account can create.",
          },
          {
            q: "Is there an API?",
            a: "Yes. Sign in, create an API key in Settings, and your scripts can create links and fetch stats.",
          },
        ],
        cta: "Try kurl",
      },
      ja: {
        title: "Bitlyの代替 · 無料の短縮リンクとクリック統計 · kurl",
        description:
          "Bitlyの代わりを探している方に向けて、kurlでできることをまとめました。短縮リンク、クリック統計、QRキャンペーン、公開プロフィールを、いまはすべて無料で使えます。",
        intro:
          "kurlは、短縮リンク、クリック統計、QRキャンペーン、公開プロフィールをひとつのアカウントで使えるサービスです。いまはすべての機能が無料で、広告もありません。比べるときは、Bitlyの最新の料金案内もあわせて確認してください。",
        features: [
          {
            title: "クリック統計",
            body: "リンクごとに人のクリックとボットのクリックを分け、端末、国、都市、流入元、UTMごとに表示します。クリックが入るたびに増えていくリアルタイムの一覧があり、クリックの記録はCSVで書き出せます。",
          },
          {
            title: "QRとQRキャンペーン",
            body: "すべての短縮リンクでQRコードを受け取れます。チラシを何か所かに分けて配るときは、配布バッチごとに別のQRを作り、100枚あたりのクリックで比べます。",
          },
          {
            title: "公開プロフィール",
            body: "ユーザー名を決めると、ユーザー名.kurl.me のアドレスに自分のリンクをまとめたページができます。SNSのプロフィールには、そのアドレスをひとつ載せるだけです。",
          },
          {
            title: "カカオトークでの共有",
            body: "カカオトークに貼ったときのプレビューカードを、リンクごとに変えられます。カカオトークやLINEの中でリンクをタップした人を標準ブラウザに移すオプションもあります。",
          },
        ],
        faq: [
          {
            q: "今使っているBitlyのリンクを移せますか？",
            a: "すでに共有したbit.lyのアドレスはBitlyのアドレスなので、kurlに移すことはできません。これから使うリンクはkurlで新しく作ってください。ログインすると、元のURLの一覧をCSVでアップロードして、1回に100件まで作れます。",
          },
          {
            q: "料金はいくらですか？",
            a: "いまはすべての機能が無料で、有料プランも広告もありません。アカウントごとに作れるリンクの数には上限があります。",
          },
          {
            q: "APIはありますか？",
            a: "はい。ログインして設定でAPIキーを発行すると、スクリプトからリンクを作ったり統計を取得したりできます。",
          },
        ],
        cta: "kurlを試す",
      },
    },
  },
];

SEO_PAGES.push(
  {
    slug: "link-in-bio",
    content: {
      ko: {
        title: "링크 인 바이오 만들기 · kurl",
        description:
          "여러 링크를 한 페이지에 모으는 링크 인 바이오를 kurl 공개 프로필로 무료로 만들어요. 사용자이름.kurl.me 주소를 SNS 프로필에 넣고, 어떤 링크가 눌렸는지 통계로 봐요.",
        intro:
          "링크 인 바이오는 내 링크를 한 페이지에 모아 두고, SNS 프로필에는 그 페이지 주소 하나만 넣는 방식이에요. kurl에서는 공개 프로필이 그 페이지예요. 로그인하고 사용자 이름을 정하면 사용자이름.kurl.me 주소가 생기고, 거기에 링크를 하나씩 더하면 돼요.",
        features: [
          {
            title: "내 이름이 들어간 주소",
            body: "사용자 이름이 그대로 주소가 돼요. 사용자 이름이 mina라면 프로필 주소는 mina.kurl.me예요.",
          },
          {
            title: "링크 말고도 담을 수 있는 블록",
            body: "사진, 갤러리, 연락처 카드, 상품 카드, 예약, 이메일 수집 폼 같은 블록을 골라 넣어요.",
          },
          {
            title: "링크별 클릭 수",
            body: "프로필에 올린 링크는 kurl 단축 링크로 만들어져서 링크마다 몇 번 눌렸는지 통계로 봐요. 프로필 방문 수는 오늘, 7일, 30일, 누적으로 나눠 보여 줘요.",
          },
          {
            title: "테마와 QR 코드",
            body: "테마를 골라 페이지 분위기를 바꿀 수 있어요. 프로필 주소의 QR 코드도 받아서 명함이나 매장에 붙일 수 있어요.",
          },
        ],
        faq: [
          {
            q: "무료인가요?",
            a: "네. 지금은 공개 프로필과 통계를 포함해 모든 기능이 무료이고 광고가 없어요.",
          },
          {
            q: "로그인해야 만들 수 있나요?",
            a: "네. 공개 프로필은 로그인하고 사용자 이름을 정한 뒤에 만들 수 있어요. 방문하는 사람은 로그인하지 않아도 페이지를 볼 수 있어요.",
          },
        ],
        cta: "kurl 시작하기",
      },
      en: {
        title: "Make a link in bio page · kurl",
        description:
          "Make a free link in bio page that gathers your links with a kurl public profile. Put username.kurl.me in your social bios and see which links get clicked.",
        intro:
          "A link in bio page gathers your links in one place, and your social profiles carry just that page's address. On kurl, that page is your public profile. Sign in and pick a username to get a username.kurl.me address, then add links one at a time.",
        features: [
          {
            title: "An address with your name",
            body: "Your username becomes the address. If your username is mina, your profile lives at mina.kurl.me.",
          },
          {
            title: "Blocks beyond links",
            body: "Add blocks such as photos, a gallery, a contact card, product cards, bookings, and a form that collects email addresses.",
          },
          {
            title: "Clicks per link",
            body: "Links on your profile are created as kurl short links, so stats show how many times each one was clicked. Profile visits are shown for today, 7 days, 30 days, and all time.",
          },
          {
            title: "Themes and a QR code",
            body: "Pick a theme to change how the page looks. You can also download a QR code of your profile address for business cards or your shop.",
          },
        ],
        faq: [
          {
            q: "Is it free?",
            a: "Yes. All features are free right now, public profiles and stats included, and there are no ads.",
          },
          {
            q: "Do I need to sign in to make one?",
            a: "Yes. You can make a public profile after signing in and picking a username. Visitors can see the page without signing in.",
          },
        ],
        cta: "Get started with kurl",
      },
      ja: {
        title: "リンクインバイオを作る · kurl",
        description:
          "複数のリンクを1ページにまとめるリンクインバイオを、kurlの公開プロフィールで無料で作れます。ユーザー名.kurl.meのアドレスをSNSのプロフィールに載せ、どのリンクが押されたかを統計で確認できます。",
        intro:
          "リンクインバイオは、自分のリンクを1ページにまとめ、SNSのプロフィールにはそのページのアドレスだけを載せる方法です。kurlでは公開プロフィールがそのページです。ログインしてユーザー名を決めると ユーザー名.kurl.me のアドレスができ、そこにリンクを1つずつ足していきます。",
        features: [
          {
            title: "名前が入ったアドレス",
            body: "ユーザー名がそのままアドレスになります。ユーザー名がminaなら、プロフィールのアドレスは mina.kurl.me です。",
          },
          {
            title: "リンク以外のブロック",
            body: "写真、ギャラリー、連絡先カード、商品カード、予約、メール登録フォームなどのブロックを選んで追加できます。",
          },
          {
            title: "リンクごとのクリック数",
            body: "プロフィールに載せたリンクはkurlの短縮リンクとして作られるので、リンクごとに何回押されたかを統計で見られます。プロフィールの訪問数は、今日、7日、30日、累計に分けて表示します。",
          },
          {
            title: "テーマとQRコード",
            body: "テーマを選んでページの雰囲気を変えられます。プロフィールのアドレスのQRコードも受け取れるので、名刺やお店に貼れます。",
          },
        ],
        faq: [
          {
            q: "無料ですか？",
            a: "はい。いまは公開プロフィールと統計を含め、すべての機能が無料で、広告もありません。",
          },
          {
            q: "作るにはログインが必要ですか？",
            a: "はい。公開プロフィールは、ログインしてユーザー名を決めると作れます。訪れる人はログインしなくてもページを見られます。",
          },
        ],
        cta: "kurlをはじめる",
      },
    },
  },
  {
    slug: "instagram-profile-link",
    content: {
      ko: {
        title: "인스타그램 프로필 링크 만들기 · kurl",
        description:
          "인스타그램 프로필의 링크에 kurl 공개 프로필 주소를 넣으면 유튜브, 쇼핑몰, 예약 페이지 같은 여러 링크를 한 페이지로 보여 줄 수 있어요. 링크마다 몇 번 눌렸는지도 봐요.",
        intro:
          "인스타그램 프로필의 링크 항목에 kurl 공개 프로필 주소를 넣으면, 프로필을 본 사람이 그 주소 하나로 내 링크를 모두 볼 수 있어요. 어떤 링크를 언제 눌렀는지는 kurl 통계에서 확인해요.",
        features: [
          {
            title: "여러 링크를 한 페이지에",
            body: "유튜브 채널, 온라인 쇼핑몰, 예약 페이지, 블로그처럼 흩어져 있는 링크를 공개 프로필 한 곳에 모아요.",
          },
          {
            title: "무엇을 눌렀는지",
            body: "프로필의 링크는 kurl 단축 링크라서 링크마다 클릭 수와 시간대를 보여 줘요. 인스타그램 앱 안에서 열린 클릭도 따로 세요.",
          },
          {
            title: "매장과 명함에는 QR",
            body: "프로필 주소의 QR 코드를 받아 명함이나 매장 안내문에 붙이면, 오프라인에서도 같은 페이지로 들어올 수 있어요.",
          },
        ],
        faq: [
          {
            q: "인스타그램에는 어떻게 넣나요?",
            a: "인스타그램 앱에서 프로필 편집을 열고, 링크 항목에 사용자이름.kurl.me 주소를 붙여 넣으면 돼요.",
          },
          {
            q: "비용이 드나요?",
            a: "아니요. 지금은 모든 기능이 무료이고 광고가 없어요.",
          },
        ],
        cta: "kurl 시작하기",
      },
      en: {
        title: "Make an Instagram profile link · kurl",
        description:
          "Put your kurl public profile in your Instagram profile link to show YouTube, your shop, a booking page, and more on one page. See how often each link is tapped.",
        intro:
          "Put your kurl public profile address in the link field of your Instagram profile, and anyone who views your profile can reach all your links through that one address. See which links people tapped, and when, in your kurl stats.",
        features: [
          {
            title: "Many links on one page",
            body: "Gather scattered links, such as your YouTube channel, online shop, booking page, and blog, in one public profile.",
          },
          {
            title: "What people tap",
            body: "Links on your profile are kurl short links, so each one shows its click count and the hours clicks came in. Clicks opened inside the Instagram app are counted separately.",
          },
          {
            title: "A QR code for offline",
            body: "Download a QR code of your profile address and put it on business cards or signs in your shop, so people offline reach the same page.",
          },
        ],
        faq: [
          {
            q: "How do I add it to Instagram?",
            a: "In the Instagram app, open Edit profile and paste your username.kurl.me address into the link field.",
          },
          {
            q: "Does it cost anything?",
            a: "No. All features are free right now, and there are no ads.",
          },
        ],
        cta: "Get started with kurl",
      },
      ja: {
        title: "Instagramのプロフィールリンクを作る · kurl",
        description:
          "Instagramのプロフィールのリンクにkurlの公開プロフィールのアドレスを入れると、YouTube、ショップ、予約ページなどのリンクを1ページで見せられます。リンクごとに何回押されたかも見られます。",
        intro:
          "Instagramのプロフィールのリンク欄にkurlの公開プロフィールのアドレスを入れると、プロフィールを見た人がそのアドレスひとつから自分のリンクをすべて見られます。どのリンクがいつ押されたかは、kurlの統計で確認します。",
        features: [
          {
            title: "複数のリンクを1ページに",
            body: "YouTubeチャンネル、オンラインショップ、予約ページ、ブログなど、ばらばらのリンクを公開プロフィールにまとめます。",
          },
          {
            title: "何が押されたか",
            body: "プロフィールのリンクはkurlの短縮リンクなので、リンクごとにクリック数と時間帯を表示します。Instagramアプリの中で開かれたクリックも別に数えます。",
          },
          {
            title: "オフラインにはQR",
            body: "プロフィールのアドレスのQRコードを受け取って名刺やお店の案内に貼れば、オフラインからも同じページに来てもらえます。",
          },
        ],
        faq: [
          {
            q: "Instagramにはどう入れますか？",
            a: "Instagramアプリでプロフィール編集を開き、リンクの項目に ユーザー名.kurl.me のアドレスを貼り付けます。",
          },
          {
            q: "費用はかかりますか？",
            a: "いいえ。いまはすべての機能が無料で、広告もありません。",
          },
        ],
        cta: "kurlをはじめる",
      },
    },
  },
  {
    slug: "kakaotalk-link-preview",
    content: {
      ko: {
        title: "카카오톡 링크 미리보기 설정 · kurl",
        description:
          "kurl 단축 링크를 카카오톡에 붙이면 목적지 페이지의 제목과 이미지로 미리보기 카드가 떠요. 로그인하면 카드 문구와 이미지를 링크마다 직접 정할 수 있어요.",
        intro:
          "카카오톡은 대화방에 링크가 올라오면 그 주소에서 제목과 이미지를 가져와 미리보기 카드를 만들어요. kurl 단축 링크는 이때 목적지 페이지의 제목, 설명, 이미지를 담은 정보를 따로 돌려줘서, 짧은 주소로 공유해도 원래 페이지의 카드가 떠요.",
        features: [
          {
            title: "목적지 페이지의 카드",
            body: "카카오톡이나 슬랙에 붙여도 목적지 페이지의 제목과 이미지로 미리보기를 보여 줘요.",
          },
          {
            title: "공유 카드 직접 정하기",
            body: "로그인하면 링크 편집의 '공유 카드'에서 제목, 설명, 이미지를 링크마다 바꿀 수 있어요. 비워 두면 목적지 페이지의 값을 써요.",
          },
          {
            title: "이미지가 없는 페이지",
            body: "목적지 페이지에 대표 이미지가 없으면 kurl이 만든 카드 이미지를 대신 넣어요.",
          },
          {
            title: "기본 브라우저로 열기",
            body: "카카오톡이나 LINE 안에서 링크를 누른 사람을 휴대폰의 기본 브라우저로 보내는 옵션이 있어요. 앱 안 브라우저에서는 로그인이나 결제가 막힐 때가 있어서, 그런 페이지로 보내는 링크에 켜 두면 돼요.",
          },
        ],
        faq: [
          {
            q: "공유 카드를 바꿨는데 카카오톡에는 예전 미리보기가 보여요.",
            a: "카카오톡은 한 번 가져간 미리보기를 한동안 다시 쓸 때가 있어요. 그래서 공유 카드는 링크를 처음 공유하기 전에 정해 두는 게 좋아요.",
          },
          {
            q: "미리보기 때문에 클릭 수가 늘어나나요?",
            a: "아니요. 카카오톡이 카드를 만들려고 링크를 가져간 요청은 봇으로 분류돼서 사람 클릭 수에 들어가지 않아요.",
          },
          {
            q: "카카오톡에서 연 클릭만 따로 볼 수 있나요?",
            a: "네. 링크 통계의 '앱에서 열림'에 카카오톡, 인스타그램, LINE 같은 앱 안 브라우저로 열린 클릭이 따로 나와요.",
          },
        ],
        cta: "단축 링크 만들기",
      },
      en: {
        title: "KakaoTalk link preview settings · kurl",
        description:
          "Paste a kurl short link into KakaoTalk and the preview card shows the destination page's title and image. Sign in to set the card's text and image per link.",
        intro:
          "When a link is posted in a KakaoTalk chat, KakaoTalk fetches a title and image from that address to build a preview card. kurl short links answer that request with the destination page's title, description, and image, so the original page's card shows even when you share a short address.",
        features: [
          {
            title: "The destination page's card",
            body: "Whether you paste the link into KakaoTalk or Slack, the preview uses the destination page's title and image.",
          },
          {
            title: "Set the share card yourself",
            body: "Sign in and open 'Share card' under Edit link to change the title, description, and image for each link. Leave a field blank to use the destination page's value.",
          },
          {
            title: "Pages without an image",
            body: "If the destination page has no main image, kurl puts in a card image it makes instead.",
          },
          {
            title: "Open in the default browser",
            body: "An option sends people who tap the link inside KakaoTalk or LINE to their phone's default browser. Sign-in or payment sometimes fails in in-app browsers, so turn it on for links to those pages.",
          },
        ],
        faq: [
          {
            q: "I changed the share card, but KakaoTalk still shows the old preview.",
            a: "KakaoTalk sometimes keeps using a preview it has already fetched for a while. It's best to set the share card before you share the link for the first time.",
          },
          {
            q: "Do previews add to my click count?",
            a: "No. The requests KakaoTalk makes to build the card are classified as bots, so they don't count as human clicks.",
          },
          {
            q: "Can I see only the clicks opened in KakaoTalk?",
            a: "Yes. The 'Opened in an app' section of your link stats splits out clicks opened in in-app browsers such as KakaoTalk, Instagram, and LINE.",
          },
        ],
        cta: "Make a short link",
      },
      ja: {
        title: "カカオトークのリンクプレビュー設定 · kurl",
        description:
          "kurlの短縮リンクをカカオトークに貼ると、遷移先ページのタイトルと画像でプレビューカードが出ます。ログインすると、カードの文言と画像をリンクごとに決められます。",
        intro:
          "カカオトークはトークにリンクが投稿されると、そのアドレスからタイトルと画像を取りに行ってプレビューカードを作ります。kurlの短縮リンクはそのとき、遷移先ページのタイトル、説明、画像を入れた情報を返すので、短いアドレスで共有しても元のページのカードが出ます。",
        features: [
          {
            title: "遷移先ページのカード",
            body: "カカオトークやSlackに貼っても、遷移先ページのタイトルと画像でプレビューを表示します。",
          },
          {
            title: "共有カードを自分で決める",
            body: "ログインすると、リンク編集の「共有カード」で、タイトル、説明、画像をリンクごとに変えられます。空欄にすると遷移先ページの値を使います。",
          },
          {
            title: "画像がないページ",
            body: "遷移先ページに代表画像がないときは、kurlが作ったカード画像を代わりに入れます。",
          },
          {
            title: "標準ブラウザで開く",
            body: "カカオトークやLINEの中でリンクをタップした人を、スマートフォンの標準ブラウザに移すオプションがあります。アプリ内ブラウザではログインや決済がうまくいかないことがあるので、そうしたページへのリンクでオンにしてください。",
          },
        ],
        faq: [
          {
            q: "共有カードを変えたのに、カカオトークでは前のプレビューが出ます。",
            a: "カカオトークは一度取得したプレビューをしばらく使い続けることがあります。共有カードは、リンクを最初に共有する前に決めておくのがおすすめです。",
          },
          {
            q: "プレビューのせいでクリック数が増えますか？",
            a: "いいえ。カカオトークがカードを作るためにリンクを取りに来たリクエストはボットに分類され、人のクリック数には入りません。",
          },
          {
            q: "カカオトークで開かれたクリックだけを見られますか？",
            a: "はい。リンク統計の「アプリ内で開かれた」で、カカオトーク、Instagram、LINEなどのアプリ内ブラウザで開かれたクリックを分けて表示します。",
          },
        ],
        cta: "短縮リンクを作る",
      },
    },
  },
  {
    slug: "poster-qr-code",
    content: {
      ko: {
        title: "포스터 QR 코드 만들기 · kurl",
        description:
          "포스터에 넣을 QR 코드를 kurl 단축 링크로 무료로 만들어요. 로그인하고 만들면 QR로 몇 번 들어왔는지 보고, 인쇄한 뒤에도 목적지를 바꿀 수 있어요.",
        intro:
          "kurl에서 만든 QR 코드에는 단축 링크가 들어가요. 그래서 로그인하고 만든 링크라면 포스터를 붙인 뒤에도 QR로 몇 번 들어왔는지 볼 수 있고, 목적지를 바꿔도 QR을 다시 인쇄하지 않아도 돼요.",
        features: [
          {
            title: "PNG로 받는 QR",
            body: "단축 링크마다 QR 코드를 PNG로 받아요. 색을 고를 수 있고, 가운데에 목적지 사이트의 아이콘을 넣을 수도 있어요.",
          },
          {
            title: "QR로 들어온 방문",
            body: "단축 링크의 QR로 들어온 방문은 통계에서 다른 클릭과 나눠 세요. QR마다 poster 같은 추적 태그를 달면 포스터별로도 나눠 볼 수 있어요.",
          },
          {
            title: "큰 포스터용 QR",
            body: "여러 곳에 나눠 붙일 때 쓰는 QR 캠페인에서는 QR을 2048px까지 받을 수 있어요. 야외처럼 더러워지기 쉬운 곳에 맞춰 손상 허용 수준도 고를 수 있어요.",
          },
        ],
        faq: [
          {
            q: "인쇄한 뒤에 목적지를 바꿀 수 있나요?",
            a: "네. QR에는 단축 링크가 들어 있어서 링크 편집에서 목적지를 바꾸면 인쇄한 QR도 새 페이지로 이어져요. 로그인하고 만든 링크에서 쓸 수 있어요.",
          },
          {
            q: "로그인하지 않고 만든 QR도 오래 쓸 수 있나요?",
            a: "아니요. 로그인하지 않고 만든 단축 링크는 24시간 뒤 만료되고, 그 뒤로는 QR을 찍어도 목적지로 가지 않아요. 만든 지 24시간 안에 같은 브라우저에서 로그인하면 내 계정으로 옮겨져 만료되지 않아요.",
          },
          {
            q: "스캔 수를 볼 수 있나요?",
            a: "로그인하면 링크 통계에서 QR로 들어온 방문 수를 따로 볼 수 있어요. QR을 찍고 링크를 연 경우만 세요.",
          },
        ],
        cta: "단축 링크와 QR 만들기",
      },
      en: {
        title: "Make a poster QR code · kurl",
        description:
          "Make a free poster QR code from a kurl short link. Sign in first to see how many visits came through the QR and to change the destination after printing.",
        intro:
          "A QR code from kurl holds the short link. So if you made the link while signed in, you can see how many visits came through the QR after the poster goes up, and changing the destination doesn't mean reprinting the QR.",
        features: [
          {
            title: "A QR code as a PNG",
            body: "Download a PNG QR code for any short link. You can pick a color and put the destination site's icon in the middle.",
          },
          {
            title: "Visits through the QR",
            body: "Visits through a short link's QR are counted apart from other clicks in your stats. Add a tracking tag such as poster to each QR and you can split visits by poster too.",
          },
          {
            title: "QR codes for large posters",
            body: "QR campaigns, for putting up copies in many places, let you download QR codes up to 2048 px. You can also choose a higher damage tolerance for outdoor spots where the code may get dirty.",
          },
        ],
        faq: [
          {
            q: "Can I change the destination after printing?",
            a: "Yes. The QR holds the short link, so when you change the destination under Edit link, the printed QR leads to the new page. This works for links made while signed in.",
          },
          {
            q: "Will a QR made without signing in keep working?",
            a: "No. Short links made without signing in expire after 24 hours, and after that the QR no longer leads to the destination. If you sign in on the same browser within 24 hours of making it, the link moves to your account and won't expire.",
          },
          {
            q: "Can I see how many people scanned it?",
            a: "Sign in and your link stats show visits through the QR separately. Only scans that open the link are counted.",
          },
        ],
        cta: "Make a short link and QR",
      },
      ja: {
        title: "ポスター用QRコードを作る · kurl",
        description:
          "ポスターに載せるQRコードを、kurlの短縮リンクから無料で作れます。ログインして作ると、QRから何回開かれたかを確認でき、印刷した後でも遷移先を変えられます。",
        intro:
          "kurlで作るQRコードには短縮リンクが入ります。そのため、ログインして作ったリンクなら、ポスターを貼った後もQRから何回開かれたかを確認でき、遷移先を変えてもQRを刷り直す必要はありません。",
        features: [
          {
            title: "PNGで受け取るQR",
            body: "短縮リンクごとにQRコードをPNGで受け取れます。色を選べて、中央に遷移先サイトのアイコンを入れることもできます。",
          },
          {
            title: "QRから開かれた訪問",
            body: "短縮リンクのQRから開かれた訪問は、統計でほかのクリックと分けて数えます。QRごとにposterのようなトラッキングタグを付ければ、ポスター別にも分けて見られます。",
          },
          {
            title: "大きなポスター用のQR",
            body: "何か所にも分けて貼るときに使うQRキャンペーンでは、QRを2048pxまで受け取れます。屋外のように汚れやすい場所に合わせて、破損許容のレベルも選べます。",
          },
        ],
        faq: [
          {
            q: "印刷した後に遷移先を変えられますか？",
            a: "はい。QRには短縮リンクが入っているので、リンク編集で遷移先を変えると、印刷済みのQRも新しいページにつながります。ログインして作ったリンクで使えます。",
          },
          {
            q: "ログインせずに作ったQRも長く使えますか？",
            a: "いいえ。ログインせずに作った短縮リンクは24時間後に失効し、その後はQRを読み取っても遷移先に進みません。作ってから24時間以内に同じブラウザでログインすると、リンクはアカウントに移り、失効しなくなります。",
          },
          {
            q: "スキャン数は見られますか？",
            a: "ログインすると、リンク統計でQRから開かれた訪問数を分けて見られます。QRを読み取ってリンクを開いた場合だけ数えます。",
          },
        ],
        cta: "短縮リンクとQRを作る",
      },
    },
  },
  {
    slug: "flyer-qr-tracking",
    content: {
      ko: {
        title: "전단지 QR 추적 · 배포처별 클릭 비교 · kurl",
        description:
          "전단지를 여러 곳에 나눠 뿌릴 때 묶음마다 다른 QR을 넣고, 100장당 클릭으로 어느 곳의 반응이 좋았는지 비교해요. kurl QR 캠페인은 지금 무료예요.",
        intro:
          "전단지를 여러 동네에 나눠 뿌리면 어디서 반응이 왔는지 알기 어려워요. kurl QR 캠페인은 배포 묶음마다 QR을 따로 만들어서, 묶음별로 QR이 몇 번 열렸는지 보여 줘요. 캠페인은 로그인한 뒤에 만들 수 있어요.",
        features: [
          {
            title: "묶음마다 다른 QR",
            body: "지역, 배포자, 장수를 적어 배포 묶음을 만들면 묶음마다 단축 링크와 QR이 따로 생겨요.",
          },
          {
            title: "100장당 클릭",
            body: "묶음마다 뿌린 장수 대비 클릭을 100장당 수치로 계산해서, 많이 뿌린 곳과 적게 뿌린 곳을 같은 기준으로 비교해요.",
          },
          {
            title: "디자인 PDF에 QR 넣기",
            body: "Canva나 인디자인에서 만든 전단지 PDF를 올리고 QR 자리를 정하면, 묶음마다 다른 QR이 들어간 PDF를 한 파일로 받아요.",
          },
          {
            title: "테스트 스캔과 봇은 빼고",
            body: "캠페인 시작 전에 찍어 본 테스트 스캔은 따로 표시하고 합계에서 빼요. 봇으로 분류된 클릭도 세지 않아요.",
          },
        ],
        faq: [
          {
            q: "배포처별로 나눠 볼 수 있나요?",
            a: "네. 묶음마다 배포자와 지역을 적어 두면 묶음별, 배포자별, 지역별로 클릭을 나눠 보여 줘요.",
          },
          {
            q: "QR을 찍은 사람의 개인정보를 모으나요?",
            a: "이름이나 연락처는 받지 않아요. 클릭마다 시각, 기기 종류, 대략적인 위치 같은 정보를 기록하고, IP는 일부를 가려서 저장해요. 자세한 항목은 개인정보처리방침에 있어요.",
          },
          {
            q: "로그인해야 하나요?",
            a: "네. QR 캠페인은 로그인한 뒤에 만들 수 있어요. 지금은 무료예요.",
          },
        ],
        cta: "kurl 시작하기",
      },
      en: {
        title: "Flyer QR tracking by distribution point · kurl",
        description:
          "When you hand out flyers in several places, put a different QR on each batch and compare clicks per 100 flyers to see where people responded. Free for now.",
        intro:
          "When flyers go out across several neighborhoods, it's hard to tell where the response came from. kurl QR campaigns make a separate QR for each distribution batch and show how many times each batch's QR was opened. You can create a campaign after signing in.",
        features: [
          {
            title: "A different QR per batch",
            body: "Create a distribution batch with its area, distributor, and quantity, and each batch gets its own short link and QR.",
          },
          {
            title: "Clicks per 100 flyers",
            body: "Clicks are divided by the number of flyers each batch handed out and shown per 100, so large and small drops are compared on the same basis.",
          },
          {
            title: "QR codes in your design PDF",
            body: "Upload a flyer PDF made in Canva or InDesign and mark where the QR goes, and you get one PDF with a different QR for each batch.",
          },
          {
            title: "Test scans and bots left out",
            body: "Test scans from before the campaign starts are shown separately and left out of the totals. Clicks classified as bots aren't counted.",
          },
        ],
        faq: [
          {
            q: "Can I see results by distribution point?",
            a: "Yes. Note the distributor and area for each batch, and clicks are shown by batch, by distributor, and by area.",
          },
          {
            q: "Do you collect personal data from people who scan?",
            a: "We don't ask for names or contact details. Each click records things like the time, device type, and approximate location, and IP addresses are stored partly masked. The privacy policy lists every item.",
          },
          {
            q: "Do I need to sign in?",
            a: "Yes. You can create QR campaigns after signing in. They're free for now.",
          },
        ],
        cta: "Get started with kurl",
      },
      ja: {
        title: "チラシQRの効果測定 · 配布先ごとのクリック比較 · kurl",
        description:
          "チラシを何か所かに分けて配るとき、配布バッチごとに別のQRを入れ、100枚あたりのクリックでどこの反応がよかったかを比べます。kurlのQRキャンペーンはいまは無料です。",
        intro:
          "チラシをいくつかの地域に分けて配ると、どこで反応があったのか分かりにくくなります。kurlのQRキャンペーンは配布バッチごとにQRを分けて作り、バッチごとにQRが何回開かれたかを表示します。キャンペーンはログインしてから作れます。",
        features: [
          {
            title: "バッチごとに別のQR",
            body: "エリア、配布担当、枚数を入れて配布バッチを作ると、バッチごとに短縮リンクとQRができます。",
          },
          {
            title: "100枚あたりのクリック",
            body: "バッチごとに配った枚数に対するクリックを100枚あたりの数値にするので、多く配った場所と少なく配った場所を同じ基準で比べられます。",
          },
          {
            title: "デザインのPDFにQRを入れる",
            body: "CanvaやInDesignで作ったチラシのPDFをアップロードしてQRの位置を決めると、バッチごとに違うQRが入ったPDFを1つのファイルで受け取れます。",
          },
          {
            title: "テストスキャンとボットは除外",
            body: "キャンペーン開始前に試しに読み取ったテストスキャンは別に表示し、合計から除きます。ボットに分類されたクリックも数えません。",
          },
        ],
        faq: [
          {
            q: "配布先ごとに分けて見られますか？",
            a: "はい。バッチごとに配布担当とエリアを入れておくと、バッチ別、配布担当別、エリア別にクリックを分けて表示します。",
          },
          {
            q: "QRを読み取った人の個人情報を集めますか？",
            a: "名前や連絡先は受け取りません。クリックごとに時刻、端末の種類、おおよその位置などを記録し、IPアドレスは一部を隠して保存します。詳しい項目はプライバシーポリシーに載っています。",
          },
          {
            q: "ログインは必要ですか？",
            a: "はい。QRキャンペーンはログインしてから作れます。いまは無料です。",
          },
        ],
        cta: "kurlをはじめる",
      },
    },
  },
  {
    slug: "qr-campaign-analytics",
    content: {
      ko: {
        title: "QR 캠페인 분석 · kurl",
        description:
          "QR 여러 개를 캠페인으로 묶어 배포 묶음과 지역별 클릭을 비교해요. 100장당 클릭과 시간대별 분포를 보고, 지난 캠페인과도 나란히 놓고 볼 수 있어요.",
        intro:
          "QR 캠페인은 한 번의 배포를 여러 묶음으로 나눠 관리하는 단위예요. 묶음마다 QR이 따로 있어서, 캠페인 통계에서 어느 묶음의 클릭이 많았는지와 클릭이 언제 몰렸는지를 볼 수 있어요.",
        features: [
          {
            title: "묶음, 배포자, 지역별 클릭",
            body: "묶음별 클릭을 많은 순서로 보여 주고, 같은 배포자나 같은 지역의 묶음은 합친 숫자도 보여 줘요.",
          },
          {
            title: "100장당 클릭과 다음 배포 추천",
            body: "뿌린 장수 대비 클릭을 100장당 수치로 보여 주고, 그 결과로 다음 배포에서 묶음마다 장수를 늘릴지, 그대로 둘지, 줄일지, 뺄지 추천해요.",
          },
          {
            title: "시간에 따른 흐름",
            body: "캠페인이 시작된 뒤 날짜별로 클릭이 어떻게 쌓였는지, 어느 요일 몇 시에 몰렸는지 보여 줘요.",
          },
          {
            title: "캠페인끼리 비교",
            body: "1차와 2차처럼 다른 캠페인을 골라 총 클릭, 100장당 클릭, 반응이 가장 많은 지역을 나란히 봐요.",
          },
        ],
        faq: [
          {
            q: "단축 링크 통계와 무엇이 다른가요?",
            a: "단축 링크 통계는 링크 하나를 자세히 보여 줘요. QR 캠페인은 여러 묶음의 링크를 모아 뿌린 장수 대비 클릭으로 비교하고, 캠페인이 끝나면 인쇄된 QR을 그대로 둘지, 종료 안내를 보여 줄지, 다른 페이지로 보낼지 미리 정해 둘 수 있어요.",
          },
          {
            q: "결과를 파일로 받을 수 있나요?",
            a: "묶음 목록은 CSV로 받을 수 있고, 여기에는 묶음 이름, 배포자, 지역, 장수, 단축 주소, 목적지가 들어가요. 묶음별 QR은 PNG나 ZIP으로 받고, 클릭 수는 캠페인 통계 화면에서 봐요.",
          },
          {
            q: "봇 클릭도 세나요?",
            a: "아니요. 봇으로 분류된 클릭은 캠페인 숫자에 들어가지 않아요. 캠페인 시작 전의 테스트 스캔도 따로 표시하고 합계에서 빼요.",
          },
        ],
        cta: "kurl 시작하기",
      },
      en: {
        title: "QR campaign analytics · kurl",
        description:
          "Group QR codes into a campaign and compare clicks by batch and area. See clicks per 100 flyers and by hour, and put a past campaign side by side.",
        intro:
          "A QR campaign is how you manage one distribution split into several batches. Each batch has its own QR, so the campaign stats show which batch got the most clicks and when those clicks came in.",
        features: [
          {
            title: "Clicks by batch, distributor, and area",
            body: "Batches are listed by clicks, highest first, and batches that share a distributor or an area are also added up together.",
          },
          {
            title: "Clicks per 100 and next-run suggestions",
            body: "Clicks are shown per 100 flyers handed out, and based on that, kurl suggests whether to increase, keep, reduce, or drop each batch in the next run.",
          },
          {
            title: "How clicks came in over time",
            body: "See how clicks added up day by day after the campaign started, and which days and hours they bunched up in.",
          },
          {
            title: "Campaign against campaign",
            body: "Pick another campaign, such as a first and second run, and see total clicks, clicks per 100, and the top area side by side.",
          },
        ],
        faq: [
          {
            q: "How is this different from short link stats?",
            a: "Short link stats go deep on one link. A QR campaign gathers the links for many batches and compares them by clicks per flyer handed out, and you can decide ahead of time what printed QR codes do when the campaign ends: keep working, show an end notice, or send people to another page.",
          },
          {
            q: "Can I download the results?",
            a: "You can download the batch list as a CSV, with each batch's name, distributor, area, quantity, short URL, and destination. Batch QR codes come as PNGs or a ZIP, and click numbers are on the campaign stats screen.",
          },
          {
            q: "Are bot clicks counted?",
            a: "No. Clicks classified as bots aren't included in campaign numbers. Test scans from before the campaign starts are shown separately and left out of the totals.",
          },
        ],
        cta: "Get started with kurl",
      },
      ja: {
        title: "QRキャンペーン分析 · kurl",
        description:
          "複数のQRをキャンペーンにまとめ、配布バッチやエリアごとのクリックを比べます。100枚あたりのクリックや時間帯ごとの分布を見て、過去のキャンペーンとも並べて比べられます。",
        intro:
          "QRキャンペーンは、1回の配布をいくつかのバッチに分けて管理する単位です。バッチごとにQRが分かれているので、キャンペーンの統計で、どのバッチのクリックが多かったか、クリックがいつ集中したかを確認できます。",
        features: [
          {
            title: "バッチ・配布担当・エリア別のクリック",
            body: "バッチ別のクリックを多い順に表示し、同じ配布担当や同じエリアのバッチは合計した数字も表示します。",
          },
          {
            title: "100枚あたりのクリックと次回の提案",
            body: "配った枚数に対するクリックを100枚あたりの数値で表示し、その結果から、次の配布でバッチごとに枚数を増やすか、そのままにするか、減らすか、やめるかを提案します。",
          },
          {
            title: "時間の流れ",
            body: "キャンペーン開始後、日ごとにクリックがどう積み上がったか、何曜日の何時に集中したかを表示します。",
          },
          {
            title: "キャンペーン同士の比較",
            body: "1回目と2回目のように別のキャンペーンを選び、総クリック、100枚あたりのクリック、反応が最も多いエリアを並べて見られます。",
          },
        ],
        faq: [
          {
            q: "短縮リンクの統計と何が違いますか？",
            a: "短縮リンクの統計はリンク1つを詳しく見せます。QRキャンペーンは複数のバッチのリンクを集めて配布枚数に対するクリックで比べ、キャンペーン終了後に印刷済みのQRをそのまま使うか、終了のお知らせを出すか、別のページに送るかを前もって決めておけます。",
          },
          {
            q: "結果をファイルで受け取れますか？",
            a: "バッチの一覧はCSVで受け取れ、バッチ名、配布担当、エリア、枚数、短縮URL、遷移先が入ります。バッチごとのQRはPNGかZIPで受け取り、クリック数はキャンペーンの統計画面で確認します。",
          },
          {
            q: "ボットのクリックも数えますか？",
            a: "いいえ。ボットに分類されたクリックはキャンペーンの数字に入りません。キャンペーン開始前のテストスキャンも別に表示し、合計から除きます。",
          },
        ],
        cta: "kurlをはじめる",
      },
    },
  },
);

export function getSeoPage(slug: string): SeoPage | undefined {
  return SEO_PAGES.find((p) => p.slug === slug);
}

/** Which locale's copy a page actually renders for `locale` (missing locales fall back en → ko). */
export function seoContentLocale(page: SeoPage, locale: string): SeoLocale {
  const l = locale as SeoLocale;
  if (page.content[l]) return l;
  return page.content.en ? "en" : "ko";
}

export function getSeoContent(page: SeoPage, locale: string): SeoContent {
  return page.content[seoContentLocale(page, locale)] as SeoContent;
}

export const SEO_FAQ_TITLE: Record<SeoLocale, string> = {
  ko: "자주 묻는 질문",
  en: "Questions",
  ja: "よくある質問",
};
