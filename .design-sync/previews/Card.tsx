import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from "url-shortener";

export const WithHeaderFooter = () => (
  <div style={{ maxWidth: 360 }}>
    <Card>
      <CardHeader>
        <CardTitle>이번 주 방문 통계</CardTitle>
        <CardDescription>최근 7일 동안의 링크 클릭 추이입니다.</CardDescription>
      </CardHeader>
      <CardContent>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#475569", margin: 0 }}>
          단축 링크 <strong style={{ color: "#0f172a" }}>kurl.me/spring</strong> 이 가장 많이
          열렸어요. 전체 클릭의 절반 이상이 모바일에서 발생했습니다.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="accent" size="sm">
          전체 분석 보기
        </Button>
      </CardFooter>
    </Card>
  </div>
);

export const Simple = () => (
  <div style={{ maxWidth: 360 }}>
    <Card>
      <CardContent>
        <p style={{ fontSize: 14, color: "#0f172a", margin: 0 }}>
          제목 없이 본문만 담는 가장 단순한 카드입니다.
        </p>
      </CardContent>
    </Card>
  </div>
);
